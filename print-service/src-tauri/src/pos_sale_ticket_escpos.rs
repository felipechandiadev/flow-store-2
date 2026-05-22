//! Ticket de venta POS en ESC/POS (bytes RAW). Mismo JSON que `pos_sale_ticket_pdf`.
//! Código de barras: raster CODE128 (mismo módulos que PDF), luego comandos nativos de respaldo.

use crate::pos_sale_ticket_pdf::{parse_pos_sale_ticket_from_value, PosSaleTicket};
use crate::ticket_barcode::{
    code128_escpos_data, code128_escpos_data_charset_a, code128_raster_bitmap,
    code39_escpos_compatible, code39_escpos_data, ean13_payload_from_folio,
    folio_prefers_code128_charset_a,
};
use anyhow::Result;
use std::path::{Path, PathBuf};

/// Font A en bobina 80 mm (48 columnas estándar).
const WIDTH: usize = 48;
/// Columna derecha reservada a montos en CLP (`$12.345.678`).
const MONEY_COL: usize = 15;
const NAME_COL: usize = WIDTH - MONEY_COL;
const LINE_SPACING_HEADER: u8 = 26;
const LINE_SPACING_DENSE: u8 = 20;
const BARCODE_HEIGHT_DOTS: u8 = 80;
const BARCODE_MODULE_WIDTH: u8 = 2;

fn escpos_init() -> Vec<u8> {
    vec![0x1B, b'@']
}

/// PC850 (Latin-1): `$` = 0x24, no aparece ¥ como en code pages asiáticas por defecto.
fn escpos_select_pc850(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1B, 0x52, 0x00]); // ESC R 0 — USA
    buf.extend_from_slice(&[0x1B, 0x74, 0x02]); // ESC t 2 — PC850
}

fn escpos_font_a(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1B, 0x4D, 0x00]);
}

fn escpos_line_spacing(buf: &mut Vec<u8>, dots: u8) {
    buf.extend_from_slice(&[0x1B, 0x33, dots]);
}

fn escpos_char_size_normal(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x00]);
}

/// Altura doble (solo nombre fantasía / encabezado).
fn escpos_double_height_on(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x10]);
}

fn escpos_double_height_off(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x21, 0x00]);
}

fn escpos_align(buf: &mut Vec<u8>, n: u8) {
    buf.extend_from_slice(&[0x1B, 0x61, n]);
}

fn escpos_bold(buf: &mut Vec<u8>, on: bool) {
    buf.extend_from_slice(&[0x1B, 0x45, if on { 1 } else { 0 }]);
}

fn escpos_apply_ticket_typography(buf: &mut Vec<u8>) {
    escpos_apply_ticket_typography_with_spacing(buf, LINE_SPACING_HEADER);
}

fn escpos_apply_ticket_typography_with_spacing(buf: &mut Vec<u8>, spacing: u8) {
    escpos_select_pc850(buf);
    escpos_font_a(buf);
    escpos_line_spacing(buf, spacing);
    escpos_char_size_normal(buf);
}

fn escpos_dense_body(buf: &mut Vec<u8>) {
    escpos_line_spacing(buf, LINE_SPACING_DENSE);
}

fn escpos_reset_for_barcode(buf: &mut Vec<u8>) {
    escpos_font_a(buf);
    escpos_char_size_normal(buf);
    escpos_bold(buf, false);
}

/// Líneas en blanco antes del corte (`ESC d n`), para que el texto no quede bajo la cuchilla.
const FEED_LINES_BEFORE_CUT: u8 = 8;

fn escpos_feed_and_cut() -> Vec<u8> {
    let mut v = vec![0x1B, b'd', FEED_LINES_BEFORE_CUT];
    v.extend_from_slice(&[0x1D, 0x56, 0x00]);
    v
}

pub fn escpos_feed_and_cut_commands() -> Vec<u8> {
    escpos_feed_and_cut()
}

/// Normaliza texto para ticket: sin UTF-8 multibyte que desincronice la impresora.
fn normalize_ticket_text(s: &str) -> String {
    s.chars()
        .filter(|c| !c.is_control())
        .map(|c| match c {
            '·' | '•' => '-',
            '—' | '–' => '-',
            '−' => '-',
            '\u{00a0}' => ' ',
            c => c,
        })
        .collect()
}

/// Byte PC850 para un carácter (tildes + `$` correctos en térmicas).
fn char_to_pc850(c: char) -> u8 {
    if c.is_ascii() && !c.is_control() {
        return c as u8;
    }
    match c {
        'á' => 0xA0,
        'é' => 0x82,
        'í' => 0xA1,
        'ó' => 0xE2,
        'ú' => 0xA3,
        'Á' => 0xB5,
        'É' => 0x90,
        'Í' => 0xD6,
        'Ó' => 0xE9,
        'Ú' => 0xEA,
        'ñ' => 0xA4,
        'Ñ' => 0xA5,
        'ü' => 0x81,
        'Ü' => 0x9A,
        '°' => 0xF8,
        '¿' => 0xA8,
        '¡' => 0xAD,
        _ => b'?',
    }
}

fn to_escpos_bytes(s: &str) -> Vec<u8> {
    normalize_ticket_text(s)
        .chars()
        .map(char_to_pc850)
        .collect()
}

fn append_line(buf: &mut Vec<u8>, text: &str) {
    buf.extend(to_escpos_bytes(text));
    buf.push(b'\n');
}

fn wrap_lines(text: &str, max: usize) -> Vec<String> {
    let t = normalize_ticket_text(text);
    let t = t.trim();
    if t.is_empty() {
        return vec![];
    }
    let words: Vec<&str> = t.split_whitespace().collect();
    let mut lines = Vec::new();
    let mut cur = String::new();
    for w in words {
        if cur.is_empty() {
            cur = w.to_string();
        } else if cur.chars().count() + 1 + w.chars().count() <= max {
            cur.push(' ');
            cur.push_str(w);
        } else {
            lines.push(cur);
            cur = w.to_string();
        }
    }
    if !cur.is_empty() {
        lines.push(cur);
    }
    lines
}

fn format_clp(n: f64) -> String {
    let v = n.round() as i64;
    let s = v.to_string();
    let mut out = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            out.push('.');
        }
        out.push(c);
    }
    out.chars().rev().collect::<String>()
}

fn money(n: f64) -> String {
    format!("${}", format_clp(n))
}

fn format_datetime(iso: &str) -> String {
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(iso) {
        return dt.with_timezone(&chrono::Local).format("%d/%m/%Y %H:%M").to_string();
    }
    if let Ok(dt) = chrono::NaiveDateTime::parse_from_str(iso, "%Y-%m-%dT%H:%M:%S%.fZ") {
        return dt.format("%d/%m/%Y %H:%M").to_string();
    }
    normalize_ticket_text(iso)
}

fn char_count(s: &str) -> usize {
    normalize_ticket_text(s).chars().count()
}

fn pad_right_cols(s: &str, cols: usize) -> String {
    let s = normalize_ticket_text(s);
    let n = s.chars().count();
    if n >= cols {
        return s.chars().take(cols).collect();
    }
    format!("{:>cols$}", s, cols = cols)
}

fn pad_left_cols(s: &str, cols: usize) -> String {
    let s = normalize_ticket_text(s);
    let n = s.chars().count();
    if n >= cols {
        return s.chars().take(cols).collect();
    }
    format!("{:<cols$}", s, cols = cols)
}

fn full_divider() -> String {
    "-".repeat(WIDTH)
}

/// Etiqueta a la izquierda + monto alineado en los últimos 15 caracteres de la línea.
fn pad_left(label: &str, amount: &str) -> String {
    let label = normalize_ticket_text(label);
    let amount = pad_right_cols(amount, MONEY_COL);
    let label_max = WIDTH.saturating_sub(MONEY_COL);
    if char_count(&label) <= label_max {
        format!("{}{}", pad_left_cols(&label, label_max), amount)
    } else {
        format!(
            "{}{}",
            pad_left_cols(&chars_take(&label, label_max), label_max),
            amount
        )
    }
}

fn chars_take(s: &str, max: usize) -> String {
    s.chars().take(max).collect()
}

/// Nombre de producto + total de línea en una fila si cabe; si no, nombre envuelto y monto al final.
fn product_name_amount_lines(name: &str, amount: &str) -> Vec<String> {
    let name = normalize_ticket_text(name);
    let amount = pad_right_cols(amount, MONEY_COL);
    if char_count(&name) <= NAME_COL {
        return vec![format!("{}{}", pad_left_cols(&name, NAME_COL), amount)];
    }
    let wrapped = wrap_lines(&name, NAME_COL);
    let mut out = Vec::new();
    for (i, line) in wrapped.iter().enumerate() {
        let is_last = i + 1 == wrapped.len();
        if is_last && char_count(line) <= NAME_COL {
            out.push(format!("{}{}", pad_left_cols(line, NAME_COL), amount));
            return out;
        }
        out.push(line.clone());
    }
    out.push(amount);
    out
}

fn append_divider(buf: &mut Vec<u8>) {
    append_line(buf, &full_divider());
}

fn append_barcode_hri_settings(buf: &mut Vec<u8>) {
    buf.extend_from_slice(&[0x1D, 0x77, BARCODE_MODULE_WIDTH]);
    buf.extend_from_slice(&[0x1D, 0x68, BARCODE_HEIGHT_DOTS]);
    buf.extend_from_slice(&[0x1D, 0x66, 0x00]);
    buf.extend_from_slice(&[0x1D, 0x48, 0x00]);
}

/// `GS v 0` — imagen raster; funciona aunque `GS k` nativo falle.
fn append_gs_v0_raster(buf: &mut Vec<u8>, bitmap: &[u8], width_bytes: u16, height_dots: u16) {
    buf.extend_from_slice(&[0x1D, 0x76, 0x30, 0x00]);
    buf.push((width_bytes & 0xFF) as u8);
    buf.push(((width_bytes >> 8) & 0xFF) as u8);
    buf.push((height_dots & 0xFF) as u8);
    buf.push(((height_dots >> 8) & 0xFF) as u8);
    buf.extend_from_slice(bitmap);
}

fn append_native_barcode_command(buf: &mut Vec<u8>, fn_code: u8, data: &[u8]) {
    if data.is_empty() || data.len() > 255 {
        return;
    }
    buf.extend_from_slice(&[0x1D, 0x6B, fn_code, data.len() as u8]);
    buf.extend_from_slice(data);
    buf.push(0x00);
}

fn append_code128_epson(buf: &mut Vec<u8>, folio: &str) -> bool {
    let attempts: Vec<Result<Vec<u8>>> = if folio_prefers_code128_charset_a(folio) {
        vec![
            code128_escpos_data_charset_a(folio),
            code128_escpos_data(folio),
        ]
    } else {
        vec![code128_escpos_data(folio)]
    };
    for attempt in attempts {
        let Ok(data) = attempt else { continue };
        if data.is_empty() {
            continue;
        }
        append_native_barcode_command(buf, 73, &data);
        return true;
    }
    false
}

fn append_code39_native(buf: &mut Vec<u8>, folio: &str) -> bool {
    if !code39_escpos_compatible(folio) {
        return false;
    }
    let starred = format!("*{folio}*");
    let data = starred.as_bytes();
    if data.len() <= 255 {
        append_native_barcode_command(buf, 4, data);
        return true;
    }
    if let Ok(data) = code39_escpos_data(folio) {
        append_native_barcode_command(buf, 69, &data);
        return true;
    }
    false
}

fn append_ean13_native(buf: &mut Vec<u8>, folio: &str) -> bool {
    let Some(d12) = ean13_payload_from_folio(folio) else {
        return false;
    };
    let human = crate::ticket_barcode::ean13_human_readable(&d12);
    let data = human.as_bytes();
    if data.len() != 13 {
        return false;
    }
    append_native_barcode_command(buf, 67, data);
    true
}

/// Raster CODE128 → CODE39 → CODE128 `{B` → EAN-13 (sin texto bajo las barras).
fn append_barcode_centered(buf: &mut Vec<u8>, payload: &str) {
    let folio = payload.trim();
    if folio.is_empty() {
        return;
    }

    escpos_reset_for_barcode(buf);
    buf.extend_from_slice(&[0x1B, 0x74, 0x00]);

    let mut printed = false;

    if let Ok((bitmap, w_bytes, h_dots)) = code128_raster_bitmap(folio) {
        tracing::debug!(%folio, w_bytes, h_dots, "barcode escpos: raster CODE128");
        escpos_align(buf, 1);
        append_gs_v0_raster(buf, &bitmap, w_bytes, h_dots);
        buf.push(b'\n');
        printed = true;
    }

    if !printed {
        escpos_align(buf, 1);
        append_barcode_hri_settings(buf);
        if append_code39_native(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native CODE39");
            printed = true;
        } else if append_code128_epson(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native CODE128 {{B}}");
            printed = true;
        } else if append_ean13_native(buf, folio) {
            tracing::debug!(%folio, "barcode escpos: native EAN-13");
            printed = true;
        }
    }

    if !printed {
        tracing::warn!(%folio, "barcode escpos: sin codigo imprimible");
    }

    escpos_apply_ticket_typography(buf);
}

fn append_totals_compact(buf: &mut Vec<u8>, ticket: &PosSaleTicket) {
    append_line(buf, &pad_left("Subtotal neto:", &money(ticket.totals.subtotal_net)));
    append_line(buf, &pad_left("Impuestos:", &money(ticket.totals.taxes)));
    if ticket.totals.line_discounts > 0.01 {
        append_line(
            buf,
            &pad_left(
                "D.lineas:",
                &format!("-${}", format_clp(ticket.totals.line_discounts)),
            ),
        );
    }
    if ticket.totals.order_discount > 0.01 {
        append_line(
            buf,
            &pad_left(
                "D.pedido:",
                &format!("-${}", format_clp(ticket.totals.order_discount)),
            ),
        );
    }
    escpos_bold(buf, true);
    append_line(buf, &pad_left("TOTAL:", &money(ticket.totals.total)));
    escpos_bold(buf, false);
    append_divider(buf);
}

pub fn build_pos_sale_ticket_escpos(ticket: &PosSaleTicket) -> Result<Vec<u8>> {
    let mut buf = escpos_init();
    escpos_apply_ticket_typography(&mut buf);

    let store = ticket
        .company
        .nombre_fantasia
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(ticket.company.razon_social.as_str());

    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    escpos_double_height_on(&mut buf);
    for line in wrap_lines(store, WIDTH / 2) {
        append_line(&mut buf, &line);
    }
    escpos_double_height_off(&mut buf);
    escpos_bold(&mut buf, false);

    if let Some(fantasy) = ticket.company.nombre_fantasia.as_deref() {
        let rs = ticket.company.razon_social.trim();
        if !rs.is_empty() && fantasy.trim() != rs {
            escpos_align(&mut buf, 1);
            for line in wrap_lines(rs, WIDTH) {
                append_line(&mut buf, &line);
            }
        }
    }
    if let Some(rut) = ticket.company.rut.as_deref().filter(|s| !s.trim().is_empty()) {
        escpos_align(&mut buf, 1);
        append_line(&mut buf, &format!("RUT: {}", rut.trim()));
    }
    if let Some(act) = ticket
        .company
        .business_activity
        .as_deref()
        .filter(|s| !s.trim().is_empty())
    {
        escpos_align(&mut buf, 1);
        for line in wrap_lines(act.trim(), WIDTH) {
            append_line(&mut buf, &line);
        }
    }

    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    let is_backorder = ticket.document_kind == "backorder";
    if is_backorder {
        if let Some(bo) = &ticket.backorder {
            let mut s = format!("Abono: {}", money(bo.deposit_amount));
            if bo.percent > 0.01 {
                s.push_str(&format!(" · {:.0}%", bo.percent));
            }
            append_line(&mut buf, &normalize_ticket_text(&s));
        }
    }

    if let Some(c) = &ticket.customer {
        let has = c.name.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false)
            || c.document.as_deref().map(|s| !s.trim().is_empty()).unwrap_or(false);
        if has {
            append_divider(&mut buf);
            append_line(&mut buf, "Cliente");
            if let Some(name) = c.name.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Nombre:", name.trim()));
            }
            if let Some(doc) = c.document.as_deref().filter(|s| !s.trim().is_empty()) {
                append_line(&mut buf, &pad_left("Documento:", doc.trim()));
            }
        }
    }

    append_divider(&mut buf);
    escpos_dense_body(&mut buf);
    let heading = if is_backorder { "ENCARGO" } else { "DETALLE" };
    escpos_align(&mut buf, 1);
    escpos_bold(&mut buf, true);
    append_line(&mut buf, heading);
    escpos_bold(&mut buf, false);
    escpos_align(&mut buf, 0);

    for line in &ticket.lines {
        let mut name = line.product_name.trim().to_string();
        if !line.attributes.is_empty() {
            name.push_str(" · ");
            name.push_str(&line.attributes.join(" · "));
        }
        for row in product_name_amount_lines(&name, &money(line.line_gross)) {
            append_line(&mut buf, &row);
        }
        let unit_suffix = line
            .unit_symbol
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|u| format!("/{u}"))
            .unwrap_or_default();
        let qty = if (line.quantity.fract()).abs() < 0.001 {
            format!("{}", line.quantity.round() as i64)
        } else {
            format!("{:.2}", line.quantity)
        };
        append_line(
            &mut buf,
            &format!("{qty}x {}{}", money(line.unit_price_with_tax), unit_suffix),
        );
        if line.discount_amount.unwrap_or(0.0) > 0.01 {
            let lbl = line
                .discount_label
                .as_deref()
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("Promo");
            append_line(
                &mut buf,
                &pad_left(
                    &format!("-{lbl}"),
                    &format!("-${}", format_clp(line.discount_amount.unwrap_or(0.0))),
                ),
            );
        }
    }

    for promo in &ticket.promotions {
        append_line(
            &mut buf,
            &pad_left(
                &format!("{} {}", promo.code, promo.name),
                &format!("-${}", format_clp(promo.amount)),
            ),
        );
    }

    append_divider(&mut buf);
    append_totals_compact(&mut buf, ticket);

    let show_payments = !ticket.payments.is_empty() || ticket.totals.change > 0.01;
    if show_payments {
        escpos_bold(&mut buf, true);
        append_line(&mut buf, "PAGOS");
        escpos_bold(&mut buf, false);
    }

    for pay in &ticket.payments {
        let detail = pay
            .detail
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(|d| format!(" ({d})"))
            .unwrap_or_default();
        append_line(
            &mut buf,
            &pad_left(
                &format!("{}{}", pay.label, detail),
                &money(pay.amount),
            ),
        );
    }
    if ticket.totals.change > 0.01 {
        append_line(&mut buf, &pad_left("Vuelto:", &money(ticket.totals.change)));
    }

    let folio = ticket.folio.trim();
    if !folio.is_empty() {
        append_barcode_centered(&mut buf, folio);
    }
    let footer = {
        let dt = format_datetime(&ticket.issued_at_iso);
        if folio.is_empty() {
            dt
        } else if dt.is_empty() || dt == "—" {
            folio.to_string()
        } else {
            format!("{folio} - {dt}")
        }
    };
    if !footer.is_empty() {
        escpos_align(&mut buf, 1);
        append_line(&mut buf, &footer);
    }
    let thanks = if is_backorder {
        "Comprobante de abono de encargo"
    } else {
        "Gracias por su compra"
    };
    escpos_align(&mut buf, 1);
    append_line(&mut buf, thanks);
    escpos_align(&mut buf, 0);
    append_line(&mut buf, "");

    Ok(buf)
}

pub fn write_pos_sale_ticket_escpos_from_value(
    dir: &PathBuf,
    value: &serde_json::Value,
) -> Result<PathBuf> {
    std::fs::create_dir_all(dir)?;
    let ticket = parse_pos_sale_ticket_from_value(value)?;
    let bytes = build_pos_sale_ticket_escpos(&ticket)?;
    let id = uuid::Uuid::new_v4().to_string();
    let p = dir.join(format!("sale_ticket_{id}.escpos"));
    std::fs::write(&p, &bytes)?;
    Ok(p)
}

pub fn write_pos_sale_ticket_escpos(path: &Path, value: &serde_json::Value) -> Result<()> {
    let ticket = parse_pos_sale_ticket_from_value(value)?;
    let bytes = build_pos_sale_ticket_escpos(&ticket)?;
    std::fs::write(path, &bytes)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escpos_starts_with_init_and_pc850() {
        let v = serde_json::json!({
            "folio": "VTA-1",
            "issuedAtIso": "2026-01-01T12:00:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 1000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert_eq!(&bytes[0..2], &[0x1B, b'@']);
        assert!(bytes.windows(3).any(|w| w == [0x1B, 0x74, 2]));
    }

    #[test]
    fn escpos_money_uses_dollar_byte() {
        assert_eq!(to_escpos_bytes("$10.000"), b"$10.000");
    }

    #[test]
    fn product_row_fits_name_and_amount_on_one_line() {
        let lines = product_name_amount_lines("Producto corto", "$12.000");
        assert_eq!(lines.len(), 1);
        assert_eq!(lines[0].chars().count(), WIDTH);
        assert!(lines[0].ends_with("$12.000"));
    }

    #[test]
    fn divider_is_full_width() {
        assert_eq!(full_divider().chars().count(), WIDTH);
    }

    #[test]
    fn escpos_barcode_uses_raster_for_standard_folio() {
        let v = serde_json::json!({
            "folio": "VTA-26-00015",
            "issuedAtIso": "2026-01-01T15:30:00Z",
            "documentKind": "sale",
            "company": { "razonSocial": "Tienda" },
            "lines": [],
            "totals": { "subtotalNet": 0, "taxes": 0, "total": 1000 }
        });
        let ticket = parse_pos_sale_ticket_from_value(&v).unwrap();
        let bytes = build_pos_sale_ticket_escpos(&ticket).unwrap();
        assert!(
            bytes.windows(3).any(|w| w == [0x1D, 0x76, 0x30]),
            "expected GS v 0 raster barcode"
        );
        assert!(
            bytes.windows(b"VTA-26-00015".len()).any(|w| w == b"VTA-26-00015"),
            "folio en pie de ticket, no bajo el codigo"
        );
    }
}
