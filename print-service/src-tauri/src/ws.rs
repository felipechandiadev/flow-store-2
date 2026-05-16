//! WebSocket server on 127.0.0.1 (plain ws). See README for WSS / mixed content.

use crate::events;
use crate::jobs;
use crate::protocol::{self, Envelope, OutResponse};
use crate::security;
use crate::state::{AppState, Session};
use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use http::Response;
use serde_json::json;
use std::net::SocketAddr;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::watch;
use tokio_tungstenite::tungstenite::handshake::server::Request;
use tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode;
use tokio_tungstenite::tungstenite::protocol::CloseFrame;
use tokio_tungstenite::tungstenite::Message;

/// Debe coincidir con `PRINT_WS_CLOSE_REASON_SERVICE_STOPPED` en `packages/print-service-client/src/core.ts`.
pub const WS_CLOSE_REASON_SERVICE_STOPPED: &str = "flowstore:service_stopped";

fn service_stopped_close() -> Message {
    Message::Close(Some(CloseFrame {
        code: CloseCode::Normal,
        reason: WS_CLOSE_REASON_SERVICE_STOPPED.into(),
    }))
}

fn json_line(v: &impl serde::Serialize) -> Message {
    Message::Text(
        serde_json::to_string(v).unwrap_or_else(|_| r#"{"ok":false}"#.into()),
    )
}

pub async fn run_ws_loop(state: Arc<AppState>, mut shutdown_rx: watch::Receiver<bool>) -> Result<()> {
    let port = state.db.listen_port();

    // Muchos navegadores resuelven `localhost` → `::1`; sin este listener el WS solo en 127.0.0.1 falla en silencio.
    let mut v6_task = None;
    if let Ok(addr6) = format!("[::1]:{port}").parse::<SocketAddr>() {
        match TcpListener::bind(addr6).await {
            Ok(listener6) => {
                tracing::info!(%addr6, "WebSocket listening (IPv6 loopback)");
                let st = state.clone();
                let mut rx_v6 = shutdown_rx.clone();
                v6_task = Some(tokio::spawn(async move {
                    loop {
                        tokio::select! {
                            _ = rx_v6.changed() => {
                                if *rx_v6.borrow() {
                                    break;
                                }
                            }
                            r = listener6.accept() => {
                                match r {
                                    Ok((stream, _)) => {
                                        let st2 = st.clone();
                                        tokio::spawn(async move {
                                            if let Err(e) = handle_tcp(stream, st2).await {
                                                tracing::warn!("ws connection ended: {e:#}");
                                            }
                                        });
                                    }
                                    Err(e) => tracing::warn!("ws ipv6 accept: {e:#}"),
                                }
                            }
                        }
                    }
                }));
            }
            Err(e) => tracing::debug!(%addr6, err = %e, "ws: skip IPv6 loopback bind"),
        }
    }

    let addr: SocketAddr = format!("127.0.0.1:{port}").parse()?;
    let listener = TcpListener::bind(addr).await.map_err(|e| {
        eprintln!(
            "[KaiPrinters] ERROR: no se pudo abrir WebSocket en {addr} — {e}. \
             ¿Otro proceso usa el puerto {port}? En `lsof` la columna COMMAND suele verse cortada (p. ej. «print-ser» = nombre del binario, p. ej. `print-service`). \
             Para ver el nombre completo: `lsof +c0 -nP -iTCP:{port} -sTCP:LISTEN`. Podés cerrar esa instancia o cambiar el puerto WS en la app."
        );
        e
    })?;
    tracing::info!(%addr, "WebSocket listening");
    eprintln!(
        "[KaiPrinters] WebSocket (WS) activo: ws://127.0.0.1:{port}/  (y [::1]:{port} si está habilitado)"
    );
    loop {
        tokio::select! {
            _ = shutdown_rx.changed() => {
                if *shutdown_rx.borrow() {
                    break;
                }
            }
            r = listener.accept() => {
                match r {
                    Ok((stream, _)) => {
                        let st = state.clone();
                        tokio::spawn(async move {
                            if let Err(e) = handle_tcp(stream, st).await {
                                tracing::warn!("ws connection ended: {e:#}");
                            }
                        });
                    }
                    Err(e) => tracing::warn!("ws accept: {e:#}"),
                }
            }
        }
    }
    if let Some(t) = v6_task {
        t.abort();
        let _ = t.await;
    }
    Ok(())
}

async fn handle_tcp(stream: TcpStream, state: Arc<AppState>) -> Result<()> {
    handle_connection(stream, state).await
}

pub async fn handle_connection<S>(stream: S, state: Arc<AppState>) -> Result<()>
where
    S: AsyncRead + AsyncWrite + Unpin + Send,
{
    let origins = state.db.allowed_origins_json().unwrap_or_else(|_| "[]".into());
    let callback = move |req: &Request, resp: Response<()>| {
        let origin = req
            .headers()
            .get("Origin")
            .and_then(|v| v.to_str().ok());
        if security::origin_allowed(&origins, origin) {
            Ok(resp)
        } else {
            tracing::warn!(
                client_origin = ?origin,
                allowed_origins_json = %origins,
                "websocket handshake rejected (403): add this page origin to allowed_origins_json in KaiPrinters"
            );
            Err(http::Response::builder()
                .status(403)
                .body(Some("Origin not allowed".to_string()))
                .unwrap())
        }
    };
    let mut ws = tokio_tungstenite::accept_hdr_async(stream, callback).await?;
    let conn_id = state.next_conn_id();
    let mut rx = state.broadcast.subscribe();
    let mut disco = state.ws_disconnect_all.subscribe();
    let mut hello_ok = false;
    loop {
        tokio::select! {
            sig = disco.recv() => {
                match sig {
                    Ok(()) => {
                        tracing::info!(%conn_id, "ws: cierre solicitado (servicio detenido)");
                        let _ = ws.send(service_stopped_close()).await;
                        break;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                        tracing::info!(%conn_id, "ws: disco lagged → cierre");
                        let _ = ws.send(service_stopped_close()).await;
                        break;
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
            inc = ws.next() => {
                let Some(frame) = inc else { break; };
                let frame = frame?;
                match frame {
                    Message::Text(t) => {
                        let env: Envelope = match serde_json::from_str(&t) {
                            Ok(e) => e,
                            Err(_) => {
                                ws.send(json_line(&OutResponse::err(None, "invalid_json"))).await.ok();
                                continue;
                            }
                        };
                        if let Err(e) = protocol::check_version(env.version.as_ref()) {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), e))).await.ok();
                            continue;
                        }
                        let Some(action) = env.action.clone() else {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), "missing_action"))).await.ok();
                            continue;
                        };
                        if action == "hello" {
                            if let Some(tok) = state.db.shared_token() {
                                let got = env.extra.get("token").and_then(|v| v.as_str()).unwrap_or("");
                                if got != tok {
                                    ws.send(json_line(&OutResponse::err(env.request_id.clone(), "invalid_token"))).await.ok();
                                    continue;
                                }
                            }
                            let client_id = env.client_id.clone().unwrap_or_else(|| "unknown".into());
                            let required: Vec<String> = env
                                .extra
                                .get("requiredPurposes")
                                .and_then(|v| v.as_array())
                                .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect())
                                .unwrap_or_default();
                            let app_label = env
                                .extra
                                .get("appLabel")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                                .or_else(|| {
                                    env.extra
                                        .get("applicationName")
                                        .and_then(|v| v.as_str())
                                        .map(String::from)
                                })
                                .unwrap_or_else(|| "Cliente".to_string());
                            let user_display_name = env
                                .extra
                                .get("userDisplayName")
                                .and_then(|v| v.as_str())
                                .map(String::from)
                                .or_else(|| {
                                    env.extra
                                        .get("userName")
                                        .and_then(|v| v.as_str())
                                        .map(String::from)
                                })
                                .unwrap_or_else(|| "—".to_string());
                            state.register(
                                conn_id.clone(),
                                Session {
                                    client_id: client_id.clone(),
                                    required_purposes: required.clone(),
                                    app_label,
                                    user_display_name,
                                },
                            );
                            hello_ok = true;
                            let ph = events::emit_printer_health_json(&state.db, &required)?;
                            ws.send(json_line(&OutResponse::ok(env.request_id.clone(), json!({
                                "serviceStatus": events::service_status_payload(state.connected(), state.connected_sessions_json()),
                                "printerHealth": ph["payload"].clone(),
                            })))).await.ok();
                            let _ = state.broadcast.send(ph.to_string());
                            let snap = json!({
                                "version": protocol::PROTOCOL_VERSION,
                                "event": "service_status",
                                "payload": events::service_status_payload(state.connected(), state.connected_sessions_json()),
                            });
                            let _ = state.broadcast.send(snap.to_string());
                            continue;
                        }
                        if !hello_ok {
                            ws.send(json_line(&OutResponse::err(env.request_id.clone(), "send_hello_first"))).await.ok();
                            continue;
                        }
                        let out = dispatch(&state, &env, &action).await;
                        ws.send(json_line(&out)).await.ok();
                        if matches!(
                            action.as_str(),
                            "set_printer_mapping" | "set_mapping_lines" | "set_config"
                        ) {
                            if let Ok(ph) = events::emit_printer_health_json(&state.db, &[]) {
                                let _ = state.broadcast.send(ph.to_string());
                            }
                            let cfg = json!({
                                "version": protocol::PROTOCOL_VERSION,
                                "event": "config_changed",
                                "payload": { "source": "api" }
                            });
                            let _ = state.broadcast.send(cfg.to_string());
                        }
                    }
                    Message::Close(_) => break,
                    _ => {}
                }
            }
            ev = rx.recv() => {
                match ev {
                    Ok(msg) => {
                        if ws.send(Message::Text(msg)).await.is_err() { break; }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                }
            }
        }
    }
    state.unregister(&conn_id);
    let snap = serde_json::json!({
        "version": protocol::PROTOCOL_VERSION,
        "event": "service_status",
        "payload": events::service_status_payload(state.connected(), state.connected_sessions_json()),
    });
    let _ = state.broadcast.send(snap.to_string());
    Ok(())
}

async fn dispatch(state: &Arc<AppState>, env: &Envelope, action: &str) -> OutResponse {
    let rid = env.request_id.clone();
    match action {
        "ping" => OutResponse::ok(rid, json!({ "status": "alive", "version": protocol::PROTOCOL_VERSION })),
        "health" => {
            let sys = crate::platform::list_system_printers().unwrap_or_default();
            OutResponse::ok(
                rid,
                json!({
                    "printers": sys,
                    "jobs": state.db.list_jobs_queue(50).unwrap_or_default(),
                    "metrics": {
                        "jobsCompletedTotal": state.jobs_completed_total.load(Ordering::Relaxed),
                    },
                }),
            )
        }
        "get_printers" => match crate::platform::list_system_printers() {
            Ok(p) => OutResponse::ok(rid, json!({ "printers": p })),
            Err(e) => OutResponse::err(rid, format!("{e:#}")),
        },
        "get_config" => {
            let lines = state.db.list_mapping_lines().unwrap_or_default();
            let legacy = state.db.get_mappings().unwrap_or_default();
            let aliases_by_purpose = state.db.aliases_by_purpose_json().unwrap_or_else(|_| json!({}));
            OutResponse::ok(
                rid,
                json!({
                    "mappingLines": lines,
                    "mappings": legacy.into_iter().map(|(a,b)| json!({"purpose": a, "printerName": b})).collect::<Vec<_>>(),
                    "aliasesByPurpose": aliases_by_purpose,
                }),
            )
        }
        "set_printer_mapping" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("");
            let printer = env.extra.get("printerName").and_then(|v| v.as_str()).unwrap_or("");
            if purpose.is_empty() || printer.is_empty() {
                return OutResponse::err(rid, "purpose_and_printerName_required");
            }
            match state.db.set_mapping(purpose, printer) {
                Ok(()) => OutResponse::ok(rid, json!({ "ok": true })),
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "set_mapping_lines" => {
            let lines = env
                .extra
                .get("lines")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            let arr: Vec<serde_json::Value> = lines.iter().cloned().collect();
            match state.db.replace_all_mapping_lines(&arr) {
                Ok(()) => OutResponse::ok(rid, json!({ "ok": true })),
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "set_config" => {
            if let Some(v) = env.extra.get("listenPort").and_then(|x| x.as_u64()) {
                let _ = state.db.set_setting("listen_port", &v.to_string());
            }
            if let Some(v) = env.extra.get("wssListenPort").and_then(|x| x.as_u64()) {
                let _ = state.db.set_setting("wss_listen_port", &v.to_string());
            }
            if let Some(v) = env.extra.get("wssEnabled").and_then(|x| x.as_bool()) {
                let _ = state
                    .db
                    .set_setting("wss_enabled", if v { "true" } else { "false" });
            }
            if let Some(v) = env.extra.get("allowedOriginsJson").and_then(|x| x.as_str()) {
                let _ = state.db.set_allowed_origins_json(v);
            }
            if let Some(v) = env.extra.get("sharedToken").and_then(|x| x.as_str()) {
                let _ = state.db.set_setting("shared_token", v);
            }
            OutResponse::ok(rid, json!({ "ok": true }))
        }
        "get_jobs" => match state.db.list_jobs_queue(50) {
            Ok(j) => OutResponse::ok(rid, json!({ "jobs": j })),
            Err(e) => OutResponse::err(rid, format!("{e:#}")),
        },
        "cancel_job" => {
            let id = env.extra.get("jobId").and_then(|v| v.as_str()).unwrap_or("");
            match state.db.dismiss_queue_job(id) {
                Ok(true) => {
                    let ping = json!({
                        "version": crate::protocol::PROTOCOL_VERSION,
                        "event": "jobs_changed",
                        "payload": { "source": "ws_protocol" }
                    });
                    let _ = state.broadcast.send(ping.to_string());
                    OutResponse::ok(rid, json!({ "cancelled": true }))
                }
                Ok(false) => OutResponse::err(rid, "job_not_in_queue_or_missing"),
                Err(e) => OutResponse::err(rid, format!("{e:#}")),
            }
        }
        "print" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("documents");
            let filename = env
                .extra
                .get("filename")
                .and_then(|v| v.as_str())
                .unwrap_or("document.pdf");
            let copies = env.extra.get("copies").and_then(|v| v.as_i64()).unwrap_or(1) as i32;
            let priority = env.extra.get("priority").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
            let b64 = match env.extra.get("payload").and_then(|v| v.as_str()) {
                Some(s) => s,
                None => return OutResponse::err(rid, "payload_required"),
            };
            let path = match jobs::decode_pdf_base64_to_temp(&state.temp_dir, b64) {
                Ok(p) => p,
                Err(e) => return OutResponse::err(rid, format!("{e:#}")),
            };
            let document_type = env.extra.get("documentType").and_then(|v| v.as_str());
            let internal_folio = env.extra.get("internalFolio").and_then(|v| v.as_str());
            let source_app = env.extra.get("sourceApp").and_then(|v| v.as_str());
            let requested_by = env.extra.get("requestedBy").and_then(|v| v.as_str());
            let printer_display_label = env
                .extra
                .get("printerDisplayLabel")
                .or_else(|| env.extra.get("printerAlias"))
                .and_then(|v| v.as_str())
                .map(str::trim)
                .filter(|s| !s.is_empty());
            let target_system_printer: Option<String> = if let Some(lbl) = printer_display_label {
                match state
                    .db
                    .system_printer_for_purpose_display_label(purpose, lbl)
                {
                    Ok(Some(s)) => Some(s),
                    Ok(None) => {
                        return OutResponse::err(
                            rid,
                            format!("unknown_printer_display_label:{lbl}"),
                        );
                    }
                    Err(e) => return OutResponse::err(rid, format!("{e:#}")),
                }
            } else {
                None
            };
            let id = uuid::Uuid::new_v4().to_string();
            if let Err(e) = state.db.insert_job(
                &id,
                Some(purpose),
                filename,
                path.to_string_lossy().as_ref(),
                copies,
                env.client_id.as_deref(),
                priority,
                document_type,
                internal_folio,
                source_app,
                requested_by,
                target_system_printer.as_deref(),
            ) {
                return OutResponse::err(rid, format!("{e:#}"));
            }
            OutResponse::ok(rid, json!({ "jobId": id, "queued": true }))
        }
        "test_print" => {
            let purpose = env.extra.get("purpose").and_then(|v| v.as_str()).unwrap_or("documents");
            let path = match jobs::write_minimal_test_pdf(&state.temp_dir) {
                Ok(p) => p,
                Err(e) => return OutResponse::err(rid, format!("{e:#}")),
            };
            let id = uuid::Uuid::new_v4().to_string();
            if let Err(e) = state.db.insert_job(
                &id,
                Some(purpose),
                "test_print.pdf",
                path.to_string_lossy().as_ref(),
                1,
                env.client_id.as_deref(),
                0,
                Some("test_print"),
                None,
                None,
                None,
                None,
            ) {
                return OutResponse::err(rid, format!("{e:#}"));
            }
            OutResponse::ok(rid, json!({ "jobId": id, "queued": true, "kind": "test_print" }))
        }
        _ => OutResponse::err(rid, format!("unknown_action:{action}")),
    }
}
