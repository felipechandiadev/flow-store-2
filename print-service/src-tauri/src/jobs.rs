//! Background worker: drain pending print_jobs (priority M4), retries.

use crate::db::{Db, PendingJob};
use crate::pos_sale_ticket_pdf;
use crate::cut_test_pdf;
use crate::ticket_test_pdf;
use crate::platform;
use crate::state::AppState;
use anyhow::Result;
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use std::path::PathBuf;
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

pub fn spawn_worker(state: Arc<AppState>) {
    let db = state.db.clone();
    let notify = state.broadcast.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_millis(400)).await;
            let job = match db.next_pending_job() {
                Ok(Some(j)) => j,
                Ok(None) => continue,
                Err(e) => {
                    tracing::error!("next_pending_job: {e}");
                    continue;
                }
            };
            if let Err(e) = process_one(&db, &job, &notify) {
                tracing::error!(job_id = %job.id, "print job: {e:#}");
                let retries = db.retry_count(&job.id).unwrap_or(0);
                if retries < 3 {
                    let _ = db.bump_retry(&job.id);
                    let _ = db.update_job_status(&job.id, "pending", None);
                } else {
                    let err_msg = format!("{e:#}");
                    state.agent_log.push_error(format!(
                        "Impresión fallida (trabajo {}, propósito {:?}): {}",
                        job.id,
                        job.purpose,
                        err_msg
                    ));
                    let _ = db.update_job_status(&job.id, "error", Some(&err_msg));
                    let fail = serde_json::json!({
                        "version": crate::protocol::PROTOCOL_VERSION,
                        "event": "print_job_failed",
                        "payload": {
                            "jobId": job.id,
                            "purpose": job.purpose,
                            "error": format!("{e:#}")
                        }
                    });
                    let _ = notify.send(fail.to_string());
                }
            } else {
                state
                    .jobs_completed_total
                    .fetch_add(1, Ordering::Relaxed);
            }
        }
    });
}

/// Resuelve impresoras del SO para un propósito. Si `tickets` no tiene mapeo, usa `documents`
/// (misma impresora en cajas con un solo equipo) y deja constancia en el log.
fn printers_for_purpose_with_fallback(db: &Db, purpose: &str) -> Result<Vec<String>> {
    let mut printers = db.printers_for_purpose_ordered(purpose)?;
    if printers.is_empty() && purpose == "tickets" {
        let docs = db.printers_for_purpose_ordered("documents")?;
        if !docs.is_empty() {
            tracing::warn!(
                "no printer mapped for tickets; using documents mapping as fallback ({})",
                docs.join(", ")
            );
            printers = docs;
        }
    }
    Ok(printers)
}

fn process_one(db: &Db, job: &PendingJob, notify: &tokio::sync::broadcast::Sender<String>) -> Result<()> {
    db.update_job_status(&job.id, "printing", None)?;
    let path = PathBuf::from(&job.payload_ref);
    if !path.exists() {
        anyhow::bail!("payload file missing");
    }
    let purpose = job
        .purpose
        .as_deref()
        .ok_or_else(|| anyhow::anyhow!("missing purpose"))?;
    let printers: Vec<String> = match job.target_system_printer.as_ref().map(|s| s.trim()).filter(|s| !s.is_empty()) {
        Some(t) => vec![t.to_string()],
        None => printers_for_purpose_with_fallback(db, purpose)?,
    };
    if printers.is_empty() {
        anyhow::bail!(
            "no printer mapped for {purpose} (configure «Tickets» in KaiPrinters or map «Documentos»)"
        );
    }
    let mut last_err: Option<anyhow::Error> = None;
    for printer in &printers {
        let thermal_80 = purpose == "tickets";
        let force_cut_test = job.document_type.as_deref() == Some("test_cut");
        let auto_cut =
            thermal_80 && (force_cut_test || db.auto_cut_enabled_for_printer(printer, purpose));
        let thermal = platform::ThermalPrintOptions {
            thermal_80mm: thermal_80,
            auto_cut,
        };
        let copies = job.copies.max(1) as u32;
        let is_escpos = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("escpos"))
            .unwrap_or(false);
        let print_result = if is_escpos {
            platform::print_escpos_to_printer(&path, printer, copies, thermal)
        } else {
            platform::print_pdf_to_printer(&path, printer, copies, thermal)
        };
        match print_result {
            Ok(()) => {
                let _ = std::fs::remove_file(&path);
                db.delete_job(&job.id)?;
                let ev = serde_json::json!({
                    "version": crate::protocol::PROTOCOL_VERSION,
                    "event": "print_job_done",
                    "payload": { "jobId": job.id, "purpose": job.purpose }
                });
                let _ = notify.send(ev.to_string());
                return Ok(());
            }
            Err(e) => {
                tracing::warn!(job_id = %job.id, printer = %printer, "intento en impresora: {e:#}");
                last_err = Some(e);
            }
        }
    }
    Err(last_err.unwrap_or_else(|| anyhow::anyhow!("print failed")))
}

pub fn decode_pdf_base64_to_temp(dir: &PathBuf, b64: &str) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let bytes = B64.decode(b64.trim())?;
    if bytes.len() < 8 || &bytes[0..4] != b"%PDF" {
        anyhow::bail!("invalid pdf payload");
    }
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("job_{id}.pdf"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

/// PDF mínimo con una línea para probar corte automático (tickets / 80 mm).
pub fn write_cut_test_pdf_path(dir: &PathBuf) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("cut_test_{id}.pdf"));
    cut_test_pdf::write_cut_test_pdf(&p)?;
    Ok(p)
}

/// PDF de prueba: ticket 80 mm para `tickets`, documento A4 mínimo para `documents`.
pub fn write_test_print_pdf(dir: &PathBuf, purpose: &str, agent_label: &str) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("test_{id}.pdf"));
    if purpose == "tickets" {
        ticket_test_pdf::write_pos_ticket_test_pdf(&p, agent_label)?;
    } else {
        static PDF: &[u8] = include_bytes!("../assets/minimal_test.pdf");
        std::fs::write(&p, PDF)?;
    }
    Ok(p)
}

/// Genera PDF vectorial de ticket de venta POS desde JSON (`pos-sale-ticket`).
pub fn write_pos_sale_ticket_pdf_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    pos_sale_ticket_pdf::write_pos_sale_ticket_pdf_from_value(dir, value)
}

/// Genera bytes ESC/POS de ticket de venta POS desde JSON (`pos-sale-ticket-escpos`).
pub fn write_pos_sale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    crate::pos_sale_ticket_escpos::write_pos_sale_ticket_escpos_from_value(dir, value)
}
