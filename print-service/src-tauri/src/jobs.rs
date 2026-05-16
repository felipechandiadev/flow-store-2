//! Background worker: drain pending print_jobs (priority M4), retries.

use crate::db::{Db, PendingJob};
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
                    let _ = db.update_job_status(&job.id, "error", Some(&format!("{e:#}")));
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
        None => db.printers_for_purpose_ordered(purpose)?,
    };
    if printers.is_empty() {
        anyhow::bail!("no printer mapped for {}", purpose);
    }
    let mut last_err: Option<anyhow::Error> = None;
    for printer in &printers {
        match platform::print_pdf_to_printer(&path, printer, job.copies.max(1) as u32) {
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
            Err(e) => last_err = Some(e),
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

/// One-page PDF (fixed payload) for `test_print` diagnostics.
pub fn write_minimal_test_pdf(dir: &PathBuf) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    static PDF: &[u8] = include_bytes!("../assets/minimal_test.pdf");
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("test_{id}.pdf"));
    std::fs::write(&p, PDF)?;
    Ok(p)
}
