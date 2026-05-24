//! Build `printer_health` / `service_status` payloads (guide §5.6 / §7).

use crate::db::Db;
use crate::platform::{self, PrinterInfo};
use anyhow::Result;
use serde_json::{json, Value};

const PURPOSES: &[&str] = &["documents", "tickets", "labels"];

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
        let network_hosts: Vec<String> = if purpose == "tickets" {
            db.list_mapping_lines()
                .unwrap_or_default()
                .into_iter()
                .filter(|row| {
                    row.get("purpose").and_then(|v| v.as_str()) == Some("tickets")
                        && row
                            .get("ticketPrinterType")
                            .and_then(|v| v.as_str())
                            .map(|t| t.eq_ignore_ascii_case("network"))
                            .unwrap_or(false)
                })
                .filter_map(|row| {
                    row.get("ticketNetworkHost")
                        .and_then(|v| v.as_str())
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .map(String::from)
                })
                .collect()
        } else {
            vec![]
        };
        let (status, printer_name, reason, names_json) = if printers.is_empty() && network_hosts.is_empty() {
            if required.iter().any(|r| r == purpose) {
                overall = "degraded";
            }
            (
                "unmapped",
                Value::Null,
                Value::Null,
                Value::Array(vec![]),
            )
        } else if printers.is_empty() && !network_hosts.is_empty() {
            let names_arr: Vec<Value> = network_hosts
                .iter()
                .map(|h| Value::String(format!("red:{h}")))
                .collect();
            (
                "ok",
                json!(network_hosts.first().cloned()),
                Value::Null,
                Value::Array(names_arr),
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

    let lines = mapping_lines_health(db, system);

    json!({
        "overall": overall,
        "purposes": Value::Object(purposes_obj),
        "lines": lines,
        "message": message,
    })
}

fn line_printer_status(system: &[PrinterInfo], system_printer_name: &str) -> &'static str {
    let name = system_printer_name.trim();
    if name.is_empty() {
        return "unknown";
    }
    match printer_online(system, name) {
        None => "offline",
        Some(true) => "online",
        Some(false) => "offline",
    }
}

/// Estado por línea de mapeo (alias + impresora del SO).
pub fn mapping_lines_health(db: &Db, system: &[PrinterInfo]) -> Vec<Value> {
    let Ok(rows) = db.list_mapping_lines() else {
        return vec![];
    };
    rows.into_iter()
        .map(|row| {
            let purpose = row
                .get("purpose")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let ticket_type = row
                .get("ticketPrinterType")
                .and_then(|v| v.as_str())
                .unwrap_or("system");
            let network_host = row
                .get("ticketNetworkHost")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let system_printer_name = row
                .get("systemPrinterName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            let status = if purpose == "tickets" && ticket_type.eq_ignore_ascii_case("network") {
                if network_host.is_empty() {
                    "unknown"
                } else {
                    "online"
                }
            } else {
                line_printer_status(system, &system_printer_name)
            };
            json!({
                "id": row.get("id").cloned().unwrap_or(Value::Null),
                "displayLabel": row.get("displayLabel").cloned().unwrap_or(Value::Null),
                "purpose": row.get("purpose").cloned().unwrap_or(Value::Null),
                "systemPrinterName": if system_printer_name.is_empty() { Value::Null } else { json!(system_printer_name) },
                "ticketPrinterType": row.get("ticketPrinterType").cloned().unwrap_or(Value::Null),
                "ticketNetworkHost": if network_host.is_empty() { Value::Null } else { json!(network_host) },
                "status": status,
            })
        })
        .collect()
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
