//! OS printers + send PDF path to spooler (macOS `lp`, Windows `printto`).

use anyhow::{Context, Result};
use serde::Serialize;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct PrinterInfo {
    pub name: String,
    #[serde(rename = "default")]
    pub is_default: bool,
    pub online: bool,
}

pub fn list_system_printers() -> Result<Vec<PrinterInfo>> {
    #[cfg(target_os = "macos")]
    {
        return list_mac();
    }
    #[cfg(target_os = "windows")]
    {
        return list_windows();
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Ok(vec![PrinterInfo {
            name: "stub-printer".into(),
            is_default: true,
            online: true,
        }])
    }
}

/// Parse `lpstat -a` lines (locale-dependent). Queue name is always first; suffix indicates accepting.
#[cfg(target_os = "macos")]
fn parse_lpstat_a_line(line: &str) -> Option<(String, bool)> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }
    const ACCEPT_SUFFIXES: &[&str] = &[
        " accepting requests since",
        " accepting requests from",
        " acepta peticiones desde",
    ];
    const REJECT_SUFFIXES: &[&str] = &[
        " not accepting requests since",
        " not accepting requests from",
        " no acepta peticiones desde",
    ];
    for suf in ACCEPT_SUFFIXES {
        if let Some(i) = line.find(suf) {
            let name = line[..i].trim();
            if !name.is_empty() {
                return Some((name.to_string(), true));
            }
        }
    }
    for suf in REJECT_SUFFIXES {
        if let Some(i) = line.find(suf) {
            let name = line[..i].trim();
            if !name.is_empty() {
                return Some((name.to_string(), false));
            }
        }
    }
    None
}

/// Parse `lpstat -p` when `-a` is empty (English / Spanish CUPS messages).
#[cfg(target_os = "macos")]
fn parse_lpstat_p_line(line: &str) -> Option<(String, bool)> {
    let line = line.trim();
    if line.is_empty() {
        return None;
    }
    let lower = line.to_lowercase();
    let offline = lower.contains("disabled") || lower.contains("deshabilitada");

    // English: "printer NAME is idle" / "printer NAME disabled"
    if let Some(rest) = line.strip_prefix("printer ") {
        let name = rest.split_whitespace().next()?.to_string();
        return Some((name, !offline));
    }
    // Spanish: "la impresora NAME está inactiva..." / "... deshabilitada..."
    if let Some(rest) = line.strip_prefix("la impresora ") {
        let name = rest
            .split_once(" está")
            .or_else(|| rest.split_once(" deshabilitada"))
            .map(|(a, _)| a.trim())
            .filter(|s| !s.is_empty())?;
        return Some((name.to_string(), !offline));
    }
    None
}

#[cfg(target_os = "macos")]
fn mac_default_queue() -> Option<String> {
    let out = Command::new("lpstat").arg("-d").output().ok()?;
    if !out.status.success() {
        return None;
    }
    let s = String::from_utf8_lossy(&out.stdout);
    for raw in s.lines() {
        let line = raw.trim();
        if line.is_empty() {
            continue;
        }
        let lower = line.to_lowercase();
        if lower.contains("no hay") || lower.contains("no default") {
            continue;
        }
        let colon = line.find(':')?;
        let key = line[..colon].to_lowercase();
        let val = line[colon + 1..].trim();
        if val.is_empty() {
            continue;
        }
        if key.contains("default destination") || key.contains("destino predeterminado") {
            return Some(val.to_string());
        }
    }
    None
}

#[cfg(target_os = "macos")]
fn list_mac() -> Result<Vec<PrinterInfo>> {
    let default_q = mac_default_queue();

    let mut printers: Vec<PrinterInfo> = Vec::new();
    let out_a = Command::new("lpstat").args(["-a"]).output().context("lpstat -a")?;
    if out_a.status.success() {
        let s = String::from_utf8_lossy(&out_a.stdout);
        for line in s.lines() {
            if let Some((name, online)) = parse_lpstat_a_line(line) {
                let is_default = default_q.as_ref() == Some(&name);
                printers.push(PrinterInfo {
                    name,
                    is_default,
                    online,
                });
            }
        }
    } else {
        tracing::warn!(
            status = ?out_a.status,
            stderr = %String::from_utf8_lossy(&out_a.stderr),
            "lpstat -a failed"
        );
    }

    if printers.is_empty() {
        let out_p = Command::new("lpstat").args(["-p"]).output().context("lpstat -p")?;
        if out_p.status.success() {
            let s = String::from_utf8_lossy(&out_p.stdout);
            for line in s.lines() {
                if let Some((name, online)) = parse_lpstat_p_line(line) {
                    let is_default = default_q.as_ref() == Some(&name);
                    printers.push(PrinterInfo {
                        name,
                        is_default,
                        online,
                    });
                }
            }
        } else {
            tracing::warn!(
                status = ?out_p.status,
                stderr = %String::from_utf8_lossy(&out_p.stderr),
                "lpstat -p failed"
            );
        }
    }

    printers.sort_by(|a, b| a.name.cmp(&b.name));
    printers.dedup_by(|a, b| a.name == b.name);
    Ok(printers)
}

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// PowerShell sin ventana de consola (evita flashes en Windows al listar impresoras).
#[cfg(target_os = "windows")]
fn windows_powershell_output(script: &str) -> Result<std::process::Output> {
    use std::os::windows::process::CommandExt;
    Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-WindowStyle",
            "Hidden",
            "-Command",
            script,
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .context("powershell")
}

#[cfg(target_os = "windows")]
fn list_windows() -> Result<Vec<PrinterInfo>> {
    let ps = r#"Get-CimInstance Win32_Printer | Select-Object Name,Default,WorkOffline | ConvertTo-Json"#;
    let out = windows_powershell_output(ps).context("powershell printers")?;
    if !out.status.success() {
        let stderr = String::from_utf8_lossy(&out.stderr);
        tracing::warn!(
            code = ?out.status.code(),
            %stderr,
            "powershell list printers failed"
        );
        return Ok(vec![]);
    }
    let s = String::from_utf8_lossy(&out.stdout);
    let v: serde_json::Value = serde_json::from_str(s.trim()).unwrap_or(serde_json::Value::Null);
    let mut outv = Vec::new();
    match v {
        serde_json::Value::Array(arr) => {
            for item in arr {
                if let (Some(name), def, off) = (
                    item.get("Name").and_then(|x| x.as_str()),
                    item.get("Default").and_then(|x| x.as_bool()).unwrap_or(false),
                    item.get("WorkOffline").and_then(|x| x.as_bool()).unwrap_or(false),
                ) {
                    outv.push(PrinterInfo {
                        name: name.to_string(),
                        is_default: def,
                        online: !off,
                    });
                }
            }
        }
        serde_json::Value::Object(obj) => {
            if let (Some(name), def, off) = (
                obj.get("Name").and_then(|x| x.as_str()),
                obj.get("Default").and_then(|x| x.as_bool()).unwrap_or(false),
                obj.get("WorkOffline").and_then(|x| x.as_bool()).unwrap_or(false),
            ) {
                outv.push(PrinterInfo {
                    name: name.to_string(),
                    is_default: def,
                    online: !off,
                });
            }
        }
        _ => {}
    }
    Ok(outv)
}

pub fn print_pdf_to_printer(
    pdf_path: &Path,
    printer: &str,
    copies: u32,
    thermal_80mm: bool,
) -> Result<()> {
    #[cfg(target_os = "macos")]
    {
        let mut cmd = Command::new("lp");
        cmd.arg("-d")
            .arg(printer)
            .arg("-n")
            .arg(copies.max(1).to_string());
        if thermal_80mm {
            cmd.arg("-o")
                .arg("media=Custom.80x297mm")
                .arg("-o")
                .arg("fit-to-page=false")
                .arg("-o")
                .arg("print-scaling=none");
        }
        let status = cmd.arg(pdf_path).status().context("lp")?;
        if !status.success() {
            anyhow::bail!("lp exited {:?}", status.code());
        }
        return Ok(());
    }
    #[cfg(target_os = "windows")]
    {
        return print_windows(pdf_path, printer, copies);
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        tracing::warn!(path = ?pdf_path, printer, "stub print (unsupported OS)");
        Ok(())
    }
}

#[cfg(target_os = "windows")]
fn print_windows(pdf_path: &Path, printer: &str, copies: u32) -> Result<()> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;
    use windows::core::PCWSTR;
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::Shell::ShellExecuteW;
    use windows::Win32::UI::WindowsAndMessaging::SW_HIDE;

    let path_w: Vec<u16> = pdf_path.as_os_str().encode_wide().chain(Some(0)).collect();
    let printer_w: Vec<u16> = OsStr::new(printer)
        .encode_wide()
        .chain(Some(0))
        .collect();
    let verb: Vec<u16> = OsStr::new("printto")
        .encode_wide()
        .chain(Some(0))
        .collect();

    for _ in 0..copies.max(1) {
        let r = unsafe {
            ShellExecuteW(
                HWND::default(),
                PCWSTR(verb.as_ptr()),
                PCWSTR(path_w.as_ptr()),
                PCWSTR(printer_w.as_ptr()),
                PCWSTR::null(),
                SW_HIDE,
            )
        };
        if r.0 as isize <= 32 {
            anyhow::bail!("ShellExecuteW printto failed code {}", r.0 as isize);
        }
    }
    Ok(())
}
