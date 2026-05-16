//! SQLite: settings, printer mapping lines, print_jobs (pending/error; done rows deleted).

use anyhow::{Context, Result};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use std::sync::Arc;

pub struct PendingJob {
    pub id: String,
    pub payload_ref: String,
    pub purpose: Option<String>,
    pub copies: i32,
    /** Si viene informado: imprimir sólo en esta impresora (p. ej. prueba desde una línea de mapeo). */
    pub target_system_printer: Option<String>,
}

const SCHEMA: &str = r#"
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS printer_mappings (
  purpose TEXT PRIMARY KEY,
  printer_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS printer_mapping_lines (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT
);

CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);

CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  purpose TEXT,
  filename TEXT,
  payload_ref TEXT,
  copies INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  started_at TEXT,
  printed_at TEXT,
  error TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  client_id TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  document_type TEXT,
  internal_folio TEXT,
  source_app TEXT,
  requested_by TEXT,
  target_system_printer TEXT
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);
CREATE INDEX IF NOT EXISTS idx_print_jobs_priority ON print_jobs(priority DESC, created_at ASC);
"#;

#[derive(Clone)]
pub struct Db {
    inner: Arc<Mutex<Connection>>,
}

fn migrate_v1(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
CREATE TABLE IF NOT EXISTS printer_mapping_lines (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  system_printer_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  display_label TEXT
);
CREATE INDEX IF NOT EXISTS idx_mapping_lines_purpose_sort ON printer_mapping_lines(purpose, sort_order);
"#,
    )?;

    let n: i64 = conn.query_row(
        "SELECT COUNT(*) FROM printer_mapping_lines",
        [],
        |r| r.get(0),
    )?;
    if n == 0 {
        let mut stmt = conn.prepare("SELECT purpose, printer_name FROM printer_mappings")?;
        let rows = stmt.query_map([], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })?;
        for row in rows {
            let (purpose, printer_name) = row?;
            let id = uuid::Uuid::new_v4().to_string();
            conn.execute(
                "INSERT INTO printer_mapping_lines(id, purpose, system_printer_name, sort_order, display_label)
                 VALUES(?1, ?2, ?3, 0, NULL)",
                params![id, purpose, printer_name],
            )?;
        }
    }

    let cols: Vec<String> = conn
        .prepare("PRAGMA table_info(print_jobs)")?
        .query_map([], |r| r.get::<_, String>(1))?
        .collect::<Result<Vec<_>, _>>()?;
    for col in [
        "document_type",
        "internal_folio",
        "source_app",
        "requested_by",
        "target_system_printer",
    ] {
        if !cols.iter().any(|c| c == col) {
            conn.execute(
                &format!("ALTER TABLE print_jobs ADD COLUMN {col} TEXT"),
                [],
            )?;
        }
    }

    let _ = conn.execute("DELETE FROM print_jobs WHERE status = 'done'", []);

    Ok(())
}

/// Alias (`display_label`) no repetible entre líneas (trim, no vacío). Índice parcial si la BD ya está limpia.
fn migrate_v2(conn: &Connection) -> Result<()> {
    let sql = r#"
CREATE UNIQUE INDEX IF NOT EXISTS idx_mapping_lines_display_label_unique
ON printer_mapping_lines(display_label)
WHERE display_label IS NOT NULL AND trim(display_label) != ''
"#;
    if let Err(e) = conn.execute(sql, []) {
        tracing::warn!(
            error = %e,
            "idx_mapping_lines_display_label_unique: omitido (puede haber alias duplicados en datos existentes). Se valida al guardar líneas."
        );
    }
    Ok(())
}

fn validate_unique_trimmed_display_labels(lines: &[serde_json::Value]) -> Result<()> {
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
    for row in lines {
        let Some(raw) = row.get("displayLabel").and_then(|v| v.as_str()) else {
            continue;
        };
        let t = raw.trim();
        if t.is_empty() {
            continue;
        }
        if !seen.insert(t.to_lowercase()) {
            anyhow::bail!("display_label_alias_duplicate:{t}");
        }
    }
    Ok(())
}

impl Db {
    pub fn open(dir: &PathBuf) -> Result<Self> {
        std::fs::create_dir_all(dir).ok();
        let path = dir.join("print_service.sqlite3");
        let conn = Connection::open(&path)
            .with_context(|| format!("open sqlite {}", path.display()))?;
        conn.execute_batch(SCHEMA).context("schema")?;
        migrate_v1(&conn).context("migrate_v1")?;
        migrate_v2(&conn).context("migrate_v2")?;
        Ok(Self {
            inner: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let c = self.inner.lock();
        let mut stmt = c
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .context("prepare")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(r) = rows.next()? {
            let v: String = r.get(0)?;
            return Ok(Some(v));
        }
        Ok(None)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "INSERT INTO settings(key, value) VALUES(?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    pub fn default_listen_port() -> u16 {
        14567
    }

    pub fn default_wss_port() -> u16 {
        14568
    }

    pub fn listen_port(&self) -> u16 {
        self.get_setting("listen_port")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok())
            .unwrap_or(Self::default_listen_port())
    }

    pub fn wss_listen_port(&self) -> u16 {
        self.get_setting("wss_listen_port")
            .ok()
            .flatten()
            .and_then(|s| s.parse().ok())
            .unwrap_or(Self::default_wss_port())
    }

    pub fn shared_token(&self) -> Option<String> {
        self.get_setting("shared_token")
            .ok()
            .flatten()
            .filter(|s| !s.trim().is_empty())
    }

    pub fn delete_setting(&self, key: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute("DELETE FROM settings WHERE key = ?1", params![key])?;
        Ok(())
    }

    pub fn allowed_origins_json(&self) -> Result<String> {
        Ok(self
            .get_setting("allowed_origins_json")?
            .unwrap_or_else(|| "[]".to_string()))
    }

    pub fn set_allowed_origins_json(&self, json: &str) -> Result<()> {
        self.set_setting("allowed_origins_json", json)
    }

    /// Legacy 1:1 mappings (compat / migración).
    pub fn get_mappings(&self) -> Result<Vec<(String, String)>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare("SELECT purpose, printer_name FROM printer_mappings ORDER BY purpose")?;
        let rows = stmt.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?;
        rows.collect::<Result<Vec<_>, _>>()
            .context("mappings")
    }

    pub fn set_mapping(&self, purpose: &str, printer_name: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "INSERT INTO printer_mappings(purpose, printer_name) VALUES(?1, ?2)
             ON CONFLICT(purpose) DO UPDATE SET printer_name = excluded.printer_name",
            params![purpose, printer_name],
        )?;
        Ok(())
    }

    pub fn clear_mapping(&self, purpose: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "DELETE FROM printer_mappings WHERE purpose = ?1",
            params![purpose],
        )?;
        Ok(())
    }

    /// Orden failover: líneas por `sort_order`, y si no hay líneas la tabla legacy `printer_mappings`.
    pub fn printers_for_purpose_ordered(&self, purpose: &str) -> Result<Vec<String>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT system_printer_name FROM printer_mapping_lines WHERE purpose = ?1 ORDER BY sort_order ASC, id ASC",
        )?;
        let rows = stmt.query_map(params![purpose], |r| r.get::<_, String>(0))?;
        let mut names: Vec<String> = rows.collect::<Result<Vec<_>, _>>()?;
        if names.is_empty() {
            let mut leg = c.prepare("SELECT printer_name FROM printer_mappings WHERE purpose = ?1")?;
            let mut lr = leg.query(params![purpose])?;
            if let Some(r) = lr.next()? {
                names.push(r.get(0)?);
            }
        }
        Ok(names)
    }

    pub fn list_mapping_lines(&self) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, purpose, system_printer_name, sort_order, display_label FROM printer_mapping_lines ORDER BY purpose, sort_order ASC, id ASC",
        )?;
        let rows = stmt.query_map([], |r| {
            Ok(serde_json::json!({
                "id": r.get::<_, String>(0)?,
                "purpose": r.get::<_, String>(1)?,
                "systemPrinterName": r.get::<_, String>(2)?,
                "sortOrder": r.get::<_, i32>(3)?,
                "displayLabel": r.get::<_, Option<String>>(4)?,
            }))
        })?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Resuelve `display_label` (alias) + propósito a la impresora del sistema de esa línea.
    pub fn system_printer_for_purpose_display_label(
        &self,
        purpose: &str,
        display_label: &str,
    ) -> Result<Option<String>> {
        let t = display_label.trim();
        if t.is_empty() {
            return Ok(None);
        }
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT system_printer_name FROM printer_mapping_lines
             WHERE purpose = ?1 AND trim(display_label) = ?2
             ORDER BY sort_order ASC, id ASC LIMIT 1",
        )?;
        let mut rows = stmt.query(params![purpose, t])?;
        if let Some(r) = rows.next()? {
            return Ok(Some(r.get::<_, String>(0)?));
        }
        Ok(None)
    }

    /// Lista de alias por propósito (solo `display_label` no vacío, sin repetir, orden de failover).
    pub fn aliases_by_purpose_json(&self) -> Result<serde_json::Value> {
        const PURPOSES: &[&str] = &["documents", "tickets", "labels", "reports"];
        let lines = self.list_mapping_lines()?;
        let mut root = serde_json::Map::new();
        for purpose in PURPOSES {
            let mut seen = std::collections::HashSet::new();
            let mut arr = Vec::new();
            for line in &lines {
                let p = line
                    .get("purpose")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                if p != *purpose {
                    continue;
                }
                if let Some(s) = line.get("displayLabel").and_then(|v| v.as_str()) {
                    let t = s.trim();
                    if !t.is_empty() && seen.insert(t.to_lowercase()) {
                        arr.push(serde_json::Value::String(t.to_string()));
                    }
                }
            }
            root.insert(
                (*purpose).to_string(),
                serde_json::Value::Array(arr),
            );
        }
        Ok(serde_json::Value::Object(root))
    }

    pub fn replace_all_mapping_lines(&self, lines: &[serde_json::Value]) -> Result<()> {
        validate_unique_trimmed_display_labels(lines)?;
        let mut c = self.inner.lock();
        let tx = c.transaction()?;
        tx.execute("DELETE FROM printer_mapping_lines", [])?;
        for (idx, row) in lines.iter().enumerate() {
            let id = row
                .get("id")
                .and_then(|v| v.as_str())
                .map(String::from)
                .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
            let purpose = row
                .get("purpose")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("line missing purpose"))?;
            let system_printer_name = row
                .get("systemPrinterName")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("line missing systemPrinterName"))?;
            let sort_order = row
                .get("sortOrder")
                .and_then(|v| v.as_i64())
                .unwrap_or(idx as i64) as i32;
            let display_label = row
                .get("displayLabel")
                .and_then(|v| v.as_str());
            tx.execute(
                "INSERT INTO printer_mapping_lines(id, purpose, system_printer_name, sort_order, display_label)
                 VALUES(?1, ?2, ?3, ?4, ?5)",
                params![
                    id,
                    purpose,
                    system_printer_name,
                    sort_order,
                    display_label
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn insert_job(
        &self,
        id: &str,
        purpose: Option<&str>,
        filename: &str,
        payload_ref: &str,
        copies: i32,
        client_id: Option<&str>,
        priority: i32,
        document_type: Option<&str>,
        internal_folio: Option<&str>,
        source_app: Option<&str>,
        requested_by: Option<&str>,
        target_system_printer: Option<&str>,
    ) -> Result<()> {
        let c = self.inner.lock();
        let now = Utc::now().to_rfc3339();
        c.execute(
            "INSERT INTO print_jobs(id, status, purpose, filename, payload_ref, copies, created_at, client_id, priority,
             document_type, internal_folio, source_app, requested_by, target_system_printer)
             VALUES(?1, 'pending', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                purpose,
                filename,
                payload_ref,
                copies,
                now,
                client_id,
                priority,
                document_type,
                internal_folio,
                source_app,
                requested_by,
                target_system_printer
            ],
        )?;
        Ok(())
    }

    pub fn next_pending_job(&self) -> Result<Option<PendingJob>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, payload_ref, purpose, copies, target_system_printer FROM print_jobs WHERE status = 'pending'
             ORDER BY priority DESC, created_at ASC LIMIT 1",
        )?;
        let mut rows = stmt.query([])?;
        if let Some(r) = rows.next()? {
            return Ok(Some(PendingJob {
                id: r.get(0)?,
                payload_ref: r.get(1)?,
                purpose: r.get(2)?,
                copies: r.get(3)?,
                target_system_printer: r.get(4)?,
            }));
        }
        Ok(None)
    }

    pub fn update_job_status(&self, id: &str, status: &str, error: Option<&str>) -> Result<()> {
        let c = self.inner.lock();
        let now = Utc::now().to_rfc3339();
        match status {
            "printing" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, started_at = ?3, error = NULL WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            "done" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3, error = NULL WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            "error" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3, error = ?4 WHERE id = ?1",
                    params![id, status, now, error.unwrap_or("unknown")],
                )?;
            }
            "cancelled" => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2, printed_at = ?3 WHERE id = ?1",
                    params![id, status, now],
                )?;
            }
            _ => {
                c.execute(
                    "UPDATE print_jobs SET status = ?2 WHERE id = ?1",
                    params![id, status],
                )?;
            }
        }
        Ok(())
    }

    pub fn delete_job(&self, id: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute("DELETE FROM print_jobs WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn bump_retry(&self, id: &str) -> Result<()> {
        let c = self.inner.lock();
        c.execute(
            "UPDATE print_jobs SET retry_count = retry_count + 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }

    pub fn retry_count(&self, id: &str) -> Result<i32> {
        let c = self.inner.lock();
        let n: i32 = c.query_row(
            "SELECT retry_count FROM print_jobs WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )?;
        Ok(n)
    }

    /// Historial genérico (incluye done si quedara alguno tras migraciones).
    #[allow(dead_code)]
    pub fn list_jobs(&self, limit: i32) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, status, purpose, filename, copies, created_at, printed_at, error, priority, client_id, retry_count,
                    document_type, internal_folio, source_app, requested_by, target_system_printer
             FROM print_jobs ORDER BY created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], job_row_to_json)?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Cola UI: pendientes, en impresión y fallidos (sin done).
    pub fn list_jobs_queue(&self, limit: i32) -> Result<Vec<serde_json::Value>> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT id, status, purpose, filename, copies, created_at, printed_at, error, priority, client_id, retry_count,
                    document_type, internal_folio, source_app, requested_by, target_system_printer
             FROM print_jobs
             WHERE status IN ('pending', 'printing', 'error')
             ORDER BY
               CASE status WHEN 'printing' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
               priority DESC, created_at ASC
             LIMIT ?1",
        )?;
        let rows = stmt.query_map(params![limit], job_row_to_json)?;
        let mut out = Vec::new();
        for row in rows {
            out.push(row?);
        }
        Ok(out)
    }

    /// Quita un trabajo de la cola UI (pending / printing / error): borra la fila y el PDF temporal si aplica.
    pub fn dismiss_queue_job(&self, id: &str) -> Result<bool> {
        let c = self.inner.lock();
        match c.query_row(
            "SELECT payload_ref FROM print_jobs WHERE id = ?1 AND status IN ('pending', 'printing', 'error')",
            params![id],
            |r| r.get::<_, Option<String>>(0),
        ) {
            Ok(Some(p)) if !p.is_empty() => {
                let _ = std::fs::remove_file(std::path::Path::new(&p));
            }
            Ok(_) => {}
            Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(false),
            Err(e) => return Err(e.into()),
        }
        let n = c.execute(
            "DELETE FROM print_jobs WHERE id = ?1 AND status IN ('pending', 'printing', 'error')",
            params![id],
        )?;
        Ok(n > 0)
    }

    /// Borra todas las filas visibles en la cola UI (pending, printing, error).
    pub fn dismiss_all_queue_jobs(&self) -> Result<()> {
        let c = self.inner.lock();
        let mut stmt = c.prepare(
            "SELECT payload_ref FROM print_jobs WHERE status IN ('pending', 'printing', 'error')",
        )?;
        let paths: Vec<String> = stmt
            .query_map([], |row| {
                let p: Option<String> = row.get(0)?;
                Ok(p.unwrap_or_default())
            })?
            .collect::<Result<Vec<_>, _>>()?;
        drop(stmt);
        for path in paths.iter().filter(|p| !p.is_empty()) {
            let _ = std::fs::remove_file(std::path::Path::new(path));
        }
        let _ = c.execute(
            "DELETE FROM print_jobs WHERE status IN ('pending', 'printing', 'error')",
            [],
        )?;
        Ok(())
    }

    /// Elimina filas `done` (post-migración a delete-on-success).
    #[allow(dead_code)]
    pub fn purge_done_jobs(&self) -> Result<u64> {
        let c = self.inner.lock();
        let n = c.execute("DELETE FROM print_jobs WHERE status = 'done'", [])?;
        Ok(n as u64)
    }
}

fn job_row_to_json(r: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
        "id": r.get::<_, String>(0)?,
        "status": r.get::<_, String>(1)?,
        "purpose": r.get::<_, Option<String>>(2)?,
        "filename": r.get::<_, Option<String>>(3)?,
        "copies": r.get::<_, i32>(4)?,
        "createdAt": r.get::<_, String>(5)?,
        "printedAt": r.get::<_, Option<String>>(6)?,
        "error": r.get::<_, Option<String>>(7)?,
        "priority": r.get::<_, i32>(8)?,
        "clientId": r.get::<_, Option<String>>(9)?,
        "retryCount": r.get::<_, i32>(10)?,
        "documentType": r.get::<_, Option<String>>(11)?,
        "internalFolio": r.get::<_, Option<String>>(12)?,
        "sourceApp": r.get::<_, Option<String>>(13)?,
        "requestedBy": r.get::<_, Option<String>>(14)?,
        "targetSystemPrinter": r.get::<_, Option<String>>(15)?,
    }))
}
