mod db;
mod events;
mod jobs;
mod platform;
mod port_release;
mod protocol;
mod security;
mod state;
mod tls;
mod ws;
mod wss;

use std::sync::atomic::Ordering;
use std::sync::Arc;

use serde::Deserialize;
use serde_json::json;
use state::{AppState, ListenerControl};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use tauri::Emitter;
use tauri::Manager;
use tokio::sync::watch;
use tracing_subscriber::prelude::*;

fn install_rustls_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

fn init_tracing() -> anyhow::Result<()> {
    let filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));
    tracing_subscriber::registry()
        .with(filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stderr)
                .with_target(false),
        )
        .init();
    Ok(())
}

fn spawn_printer_health_tick(state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let mut last = String::new();
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(15)).await;
            let Ok(ev) = events::emit_printer_health_json(&state.db, &[]) else {
                continue;
            };
            let s = ev.to_string();
            if s != last {
                last = s.clone();
                let _ = state.broadcast.send(s);
            }
        }
    });
}

/// Notifica a la ventana Tauri cuando cambia algo relevante del dashboard (WS, trabajos, salud, etc.).
fn spawn_dashboard_ui_events(app: tauri::AppHandle, state: Arc<AppState>) {
    tauri::async_runtime::spawn(async move {
        let mut rx = state.broadcast.subscribe();
        loop {
            match rx.recv().await {
                Ok(_) => {
                    let _ = app.emit("dashboard-update", ());
                }
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {}
                Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
            }
        }
    });
}

#[tauri::command]
fn get_listen_port(state: tauri::State<'_, Arc<AppState>>) -> u16 {
    state.db.listen_port()
}

#[tauri::command]
fn get_wss_listen_port(state: tauri::State<'_, Arc<AppState>>) -> u16 {
    state.db.wss_listen_port()
}

#[tauri::command]
fn get_metrics(state: tauri::State<'_, Arc<AppState>>) -> serde_json::Value {
    json!({
        "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed),
    })
}

/// Detiene listeners WS/WSS (si existen) antes de volver a enlazar puertos.
async fn stop_print_network_tasks(state: &Arc<AppState>) {
    state.signal_disconnect_all_ws_clients();
    tokio::time::sleep(std::time::Duration::from_millis(80)).await;
    let ws = state.ws_listener.lock().take();
    let wss = state.wss_listener.lock().take();
    if let Some(c) = ws {
        let _ = c.shutdown.send(true);
        let _ = tokio::time::timeout(std::time::Duration::from_secs(3), c.join).await;
    }
    if let Some(c) = wss {
        let _ = c.shutdown.send(true);
        let _ = tokio::time::timeout(std::time::Duration::from_secs(3), c.join).await;
    }
}

fn spawn_ws_listener(state: &Arc<AppState>) -> Result<(), String> {
    if let Some(old) = state.ws_listener.lock().take() {
        let _ = old.shutdown.send(true);
        old.join.abort();
    }
    let (tx, rx) = watch::channel(false);
    let st = state.clone();
    let join = tauri::async_runtime::spawn(async move {
        let _ = ws::run_ws_loop(st, rx).await;
    });
    *state.ws_listener.lock() = Some(ListenerControl {
        shutdown: tx,
        join,
    });
    Ok(())
}

fn spawn_wss_listener_if_enabled(state: &Arc<AppState>) -> Result<(), String> {
    if let Some(old) = state.wss_listener.lock().take() {
        let _ = old.shutdown.send(true);
        old.join.abort();
    }
    let wss_on = state
        .db
        .get_setting("wss_enabled")
        .ok()
        .flatten()
        .as_deref()
        != Some("false");
    if !wss_on {
        return Ok(());
    }
    let cfg = match tls::load_or_create_server_config(&state.data_dir) {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("tls init: {e:#}");
            return Err(format!("tls init: {e:#}"));
        }
    };
    let (tx, rx) = watch::channel(false);
    let st = state.clone();
    let join = tauri::async_runtime::spawn(async move {
        let _ = wss::run_wss_loop(st, cfg, rx).await;
    });
    *state.wss_listener.lock() = Some(ListenerControl {
        shutdown: tx,
        join,
    });
    Ok(())
}

#[tauri::command]
async fn stop_print_network(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    stop_print_network_tasks(&state).await;
    notify_print_network_toggle(&state, "print_network_stopped");
    Ok(())
}

#[tauri::command]
async fn start_print_network(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    port_release::terminate_stale_agent_if_ports_busy(state.db.as_ref());
    stop_print_network_tasks(&state).await;
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    spawn_ws_listener(&state)?;
    spawn_wss_listener_if_enabled(&state)?;
    tokio::time::sleep(std::time::Duration::from_millis(120)).await;
    notify_print_network_toggle(&state, "print_network_started");
    Ok(())
}

fn notify_printer_health_and_config(state: &Arc<AppState>) {
    if let Ok(ph) = events::emit_printer_health_json(&state.db, &[]) {
        let _ = state.broadcast.send(ph.to_string());
    }
    let cfg = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "config_changed",
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(cfg.to_string());
}

fn notify_jobs_changed(state: &Arc<AppState>) {
    let ping = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "jobs_changed",
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(ping.to_string());
}

fn notify_print_network_toggle(state: &Arc<AppState>, event: &'static str) {
    let ping = json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": event,
        "payload": { "source": "local_ui" }
    });
    let _ = state.broadcast.send(ping.to_string());
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServiceSettingsPatch {
    listen_port: Option<u16>,
    wss_listen_port: Option<u16>,
    wss_enabled: Option<bool>,
    allowed_origins_json: Option<String>,
    /// `Some("")` clears token; `None` leaves unchanged.
    shared_token: Option<String>,
    agent_display_name: Option<String>,
}

fn validate_origins_json(s: &str) -> Result<(), String> {
    let v: serde_json::Value =
        serde_json::from_str(s).map_err(|e| format!("allowedOriginsJson inválido: {e}"))?;
    if !v.is_array() {
        return Err("allowedOriginsJson debe ser un array JSON".into());
    }
    Ok(())
}

#[tauri::command]
fn get_dashboard(state: tauri::State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let printers = platform::list_system_printers().map_err(|e| e.to_string())?;
    let mappings = state.db.get_mappings().map_err(|e| e.to_string())?;
    let mapping_lines = state.db.list_mapping_lines().map_err(|e| e.to_string())?;
    let ph = events::emit_printer_health_json(&state.db, &[]).map_err(|e| e.to_string())?;
    let jobs = state.db.list_jobs_queue(40).map_err(|e| e.to_string())?;
    let wss_on = state
        .db
        .get_setting("wss_enabled")
        .map_err(|e| e.to_string())?
        .as_deref()
        != Some("false");
    let token_raw = state
        .db
        .get_setting("shared_token")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let agent_display_name = state
        .db
        .get_setting("agent_display_name")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let sessions = state.connected_sessions_json();
    Ok(json!({
        "printers": printers,
        "mappings": mappings.iter().map(|(a,b)| json!({"purpose": a, "printerName": b})).collect::<Vec<_>>(),
        "mappingLines": mapping_lines,
        "aliasesByPurpose": state.db.aliases_by_purpose_json().map_err(|e| e.to_string())?,
        "printerHealth": ph["payload"].clone(),
        "jobs": jobs,
        "metrics": { "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed) },
        "serviceStatus": events::service_status_payload(state.connected(), sessions),
        "listenPort": state.db.listen_port(),
        "wssListenPort": state.db.wss_listen_port(),
        "wssEnabled": wss_on,
        "wsListening": state.ws_listener_running(),
        "wssListening": state.wss_listener_running(),
        "allowedOriginsJson": state.db.allowed_origins_json().map_err(|e| e.to_string())?,
        "sharedToken": token_raw,
        "agentDisplayName": agent_display_name,
    }))
}

#[tauri::command(rename_all = "snake_case")]
fn set_printer_mapping(
    state: tauri::State<'_, Arc<AppState>>,
    purpose: String,
    printer_name: String,
) -> Result<(), String> {
    if purpose.is_empty() {
        return Err("purpose_required".into());
    }
    if printer_name.trim().is_empty() {
        state
            .db
            .clear_mapping(&purpose)
            .map_err(|e| e.to_string())?;
    } else {
        state
            .db
            .set_mapping(&purpose, printer_name.trim())
            .map_err(|e| e.to_string())?;
    }
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command]
fn set_service_settings(
    state: tauri::State<'_, Arc<AppState>>,
    patch: ServiceSettingsPatch,
) -> Result<(), String> {
    if let Some(v) = patch.listen_port {
        state
            .db
            .set_setting("listen_port", &v.to_string())
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.wss_listen_port {
        state
            .db
            .set_setting("wss_listen_port", &v.to_string())
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.wss_enabled {
        state
            .db
            .set_setting("wss_enabled", if v { "true" } else { "false" })
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.allowed_origins_json {
        validate_origins_json(&v)?;
        state
            .db
            .set_allowed_origins_json(&v)
            .map_err(|e| e.to_string())?;
    }
    if let Some(v) = patch.shared_token {
        if v.trim().is_empty() {
            state
                .db
                .delete_setting("shared_token")
                .map_err(|e| e.to_string())?;
        } else {
            state
                .db
                .set_setting("shared_token", v.trim())
                .map_err(|e| e.to_string())?;
        }
    }
    if let Some(v) = patch.agent_display_name {
        if v.trim().is_empty() {
            state.db.delete_setting("agent_display_name").map_err(|e| e.to_string())?;
        } else {
            state
                .db
                .set_setting("agent_display_name", v.trim())
                .map_err(|e| e.to_string())?;
        }
    }
    notify_printer_health_and_config(&state);
    Ok(())
}

#[tauri::command(rename_all = "snake_case")]
fn queue_test_print(
    state: tauri::State<'_, Arc<AppState>>,
    purpose: Option<String>,
    system_printer_name: Option<String>,
) -> Result<String, String> {
    let purpose = purpose
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("documents");
    let target_sp = system_printer_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty());
    let path = jobs::write_minimal_test_pdf(&state.temp_dir).map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    state
        .db
        .insert_job(
            &id,
            Some(purpose),
            "test_print.pdf",
            path.to_string_lossy().as_ref(),
            1,
            Some("local_ui"),
            0,
            Some("test_print"),
            None,
            None,
            None,
            target_sp,
        )
        .map_err(|e| e.to_string())?;
    Ok(id)
}

#[tauri::command(rename_all = "snake_case")]
fn cancel_print_job(state: tauri::State<'_, Arc<AppState>>, job_id: String) -> Result<bool, String> {
    let ok = state
        .db
        .dismiss_queue_job(&job_id)
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(ok)
}

#[tauri::command(rename_all = "snake_case")]
fn cancel_all_print_jobs(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state
        .db
        .dismiss_all_queue_jobs()
        .map_err(|e| e.to_string())?;
    notify_jobs_changed(&state);
    Ok(())
}

#[tauri::command]
fn set_mapping_lines(
    state: tauri::State<'_, Arc<AppState>>,
    lines: Vec<serde_json::Value>,
) -> Result<(), String> {
    state
        .db
        .replace_all_mapping_lines(&lines)
        .map_err(|e| e.to_string())?;
    notify_printer_health_and_config(&state);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_rustls_crypto_provider();
    tauri::Builder::default()
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                tracing::info!("cierre de ventana principal: salida completa (se liberan puertos WS/WSS)");
                window.app_handle().exit(0);
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let data_dir = handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("app_data_dir: {e}"))?;
            init_tracing().map_err(|e| format!("tracing: {e}"))?;

            let db = Arc::new(db::Db::open(&data_dir).map_err(|e| format!("db: {e}"))?);
            security::ensure_defaults(&db).map_err(|e| format!("defaults: {e}"))?;

            let temp_dir = data_dir.join("temp_print");
            let state = AppState::new(db.clone(), temp_dir, data_dir.clone());
            let st_worker = state.clone();
            let st_health = state.clone();

            port_release::terminate_stale_agent_if_ports_busy(db.as_ref());

            spawn_ws_listener(&state).map_err(|e| format!("ws: {e}"))?;
            if let Err(e) = spawn_wss_listener_if_enabled(&state) {
                tracing::warn!("wss no iniciado: {e}");
            }

            jobs::spawn_worker(st_worker);
            spawn_printer_health_tick(st_health);
            spawn_dashboard_ui_events(handle.clone(), state.clone());

            app.manage(state);

            let open = MenuItem::with_id(&handle, "open", "Abrir ventana", true, None::<&str>)
                .map_err(|e| format!("menu open: {e}"))?;
            let quit = MenuItem::with_id(&handle, "quit", "Salir", true, None::<&str>)
                .map_err(|e| format!("menu quit: {e}"))?;
            let menu = Menu::with_items(&handle, &[&open, &quit]).map_err(|e| format!("menu: {e}"))?;

            let mut tray = TrayIconBuilder::with_id("print_tray")
                .menu(&menu)
                .tooltip("FlowStore Print Service")
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    if event.id == "open" {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    } else if event.id == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state,
                        ..
                    } = event
                    {
                        use tauri::tray::MouseButtonState;
                        if button_state == MouseButtonState::Up {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                    }
                });

            if let Some(icon) = handle.default_window_icon().cloned() {
                tray = tray.icon(icon);
            }

            tray.build(&handle).map_err(|e| format!("tray: {e}"))?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_listen_port,
            get_wss_listen_port,
            get_metrics,
            get_dashboard,
            set_printer_mapping,
            set_mapping_lines,
            set_service_settings,
            queue_test_print,
            cancel_print_job,
            cancel_all_print_jobs,
            stop_print_network,
            start_print_network,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
