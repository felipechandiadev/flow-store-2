//! Origin allowlist (§4.2). Stored as JSON array string in settings.

use anyhow::Result;
use serde_json::Value;

fn origin_matches_allowed(allowed: &str, origin: &str) -> bool {
    if allowed == "*" || allowed == origin {
        return true;
    }
    // Prefijo con comodín final: p. ej. "http://192.168." → "http://192.168.1.10:3022"
    if let Some(prefix) = allowed.strip_suffix('*') {
        if !prefix.is_empty() && origin.starts_with(prefix) {
            return true;
        }
    }
    false
}

pub fn origin_allowed(stored_json: &str, origin_header: Option<&str>) -> bool {
    let Ok(Value::Array(arr)) = serde_json::from_str::<Value>(stored_json) else {
        return false;
    };
    let Some(origin) = origin_header else {
        return arr.iter().filter_map(|v| v.as_str()).any(|a| a == "*");
    };
    arr.iter()
        .filter_map(|v| v.as_str())
        .any(|allowed| origin_matches_allowed(allowed, origin))
}

pub fn default_allowed_origins_json() -> &'static str {
    // Incluye `http://localhost:3022`: pwa-pos (`next dev -p 3022`) usa ese Origin; sin él el handshake WS devuelve 403.
    r#"["http://localhost:1420","http://localhost:3000","http://localhost:3021","http://localhost:3022","http://127.0.0.1:3000","http://127.0.0.1:3021","http://127.0.0.1:3022","http://[::1]:3021","http://[::1]:3022","https://localhost:3021","https://localhost:3022","https://127.0.0.1:3021","https://127.0.0.1:3022","https://[::1]:3021","https://[::1]:3022"]"#
}

/// Añade al array guardado cualquier origen que figure en `default_allowed_origins_json` y aún no esté (corrige DBs creadas con la lista antigua).
fn merge_missing_default_origins(db: &crate::db::Db) -> Result<()> {
    let Some(current_str) = db.get_setting("allowed_origins_json")? else {
        return Ok(());
    };
    let Ok(Value::Array(mut current)) = serde_json::from_str::<Value>(&current_str) else {
        return Ok(());
    };
    let Ok(Value::Array(defaults)) = serde_json::from_str::<Value>(default_allowed_origins_json()) else {
        return Ok(());
    };
    let mut changed = false;
    for item in defaults {
        let Some(s) = item.as_str() else {
            continue;
        };
        if !current.iter().any(|v| v.as_str() == Some(s)) {
            current.push(Value::String(s.to_string()));
            changed = true;
        }
    }
    if changed {
        db.set_allowed_origins_json(&serde_json::to_string(&current)?)?;
    }
    Ok(())
}

pub fn ensure_defaults(db: &crate::db::Db) -> Result<()> {
    if db.get_setting("allowed_origins_json")?.is_none() {
        db.set_setting("allowed_origins_json", default_allowed_origins_json())?;
    } else {
        merge_missing_default_origins(db)?;
    }
    if db.get_setting("wss_enabled")?.is_none() {
        db.set_setting("wss_enabled", "true")?;
    }
    Ok(())
}
