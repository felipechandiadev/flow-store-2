//! Build `printer_health` / `service_status` payloads (guide §5.6 / §7).

use crate::db::Db;
use crate::platform::{self, PrinterInfo};
use anyhow::Result;
use serde_json::{json, Value};

const PURPOSES: &[&str] = &["documents", "tickets", "labels", "reports"];

pub fn service_status_payload(connected_clients: usize, sessions: Vec<Value>) -> Value {
    json!({
        "status": "ready",
        "connectedClients": connected_clients,
        "sessions": sessions,
    })
}

fn printer_online(system: &[PrinterInfo], name: &str) -> Option<bool> {
    system.iter().find(|x| x.name == name).map(|x| x.online)
}

/// Failover: al menos una línea con impresora del sistema online => ok; si hay líneas pero ninguna resolvible => offline/unmapped.
pub fn printer_health(db: &Db, system: &[PrinterInfo], required: &[String]) -> Value {
    let names: std::collections::HashSet<String> =
        system.iter().map(|p| p.name.clone()).collect();
    let mut purposes_obj = serde_json::Map::new();
    let mut overall = "ok";

    for p in PURPOSES {
        let purpose = *p;
        let printers = db
            .printers_for_purpose_ordered(purpose)
            .unwrap_or_default();
        let (status, printer_name, reason, names_json) = if printers.is_empty() {
            if required.iter().any(|r| r == purpose) {
                overall = "degraded";
            }
            (
                "unmapped",
                Value::Null,
                Value::Null,
                Value::Array(vec![]),
            )
        } else {
            let mut any_ok = false;
            let mut found_in_system = false;
            for nm in &printers {
                if names.contains(nm) {
                    found_in_system = true;
                    let online = printer_online(system, nm).unwrap_or(true);
                    if online {
                        any_ok = true;
                        break;
                    }
                }
            }
            let names_arr: Vec<Value> = printers
                .iter()
                .map(|s| Value::String(s.clone()))
                .collect();
            if any_ok {
                (
                    "ok",
                    json!(printers.first().cloned()),
                    Value::Null,
                    Value::Array(names_arr),
                )
            } else if !found_in_system {
                if required.iter().any(|r| r == purpose) {
                    overall = "degraded";
                }
                (
                    "offline",
                    json!(printers.first().cloned()),
                    json!("DEVICE_NOT_FOUND"),
                    Value::Array(printers.iter().map(|s| Value::String(s.clone())).collect()),
                )
            } else {
                if required.iter().any(|r| r == purpose) {
                    overall = "degraded";
                }
                (
                    "offline",
                    json!(printers.first().cloned()),
                    json!("OFFLINE"),
                    Value::Array(printers.iter().map(|s| Value::String(s.clone())).collect()),
                )
            }
        };
        let mut o = serde_json::Map::new();
        o.insert("status".into(), json!(status));
        if !printer_name.is_null() {
            o.insert("printerName".into(), printer_name);
        }
        if !reason.is_null() {
            o.insert("reason".into(), reason);
        }
        o.insert("printerNames".into(), names_json);
        purposes_obj.insert(purpose.to_string(), Value::Object(o));
    }

    let message = if overall != "ok" {
        "Al menos un propósito de impresión requiere atención."
    } else {
        "Impresoras operativas."
    };

    json!({
        "overall": overall,
        "purposes": Value::Object(purposes_obj),
        "message": message,
    })
}

/// Evento `printer_health` reutilizando la lista de impresoras ya obtenida (evita un segundo PowerShell en Windows).
pub fn printer_health_event_json(db: &Db, system: &[PrinterInfo], required: &[String]) -> Value {
    json!({
        "version": crate::protocol::PROTOCOL_VERSION,
        "event": "printer_health",
        "payload": printer_health(db, system, required),
    })
}

pub fn emit_printer_health_json(db: &Db, required: &[String]) -> Result<Value> {
    let sys = platform::list_system_printers().unwrap_or_default();
    Ok(printer_health_event_json(db, &sys, required))
}
