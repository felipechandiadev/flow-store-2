/**
 * Estilos tickets térmicos 80 mm (POS → agente KaiPrinters).
 * El PDF usa 72 mm de ancho de página (= zona imprimible) para evitar que CUPS escale
 * una hoja de 80 mm y deje el texto estrecho otra vez.
 *
 * El PDF vectorial (`pos-sale-ticket`) en `print-service/src-tauri/src/pos_sale_ticket_pdf.rs`
 * replica estas medidas y la estructura de `buildPosSaleReceiptHtml`.
 */

/** Ancho del PDF enviado a la impresora (imprimible en bobina 80 mm, no el ancho del rollo). */
export const THERMAL_TICKET_PAGE_WIDTH_MM = 72;

/** Ancho del contenido dentro del PDF. */
export const THERMAL_TICKET_AGENT_CONTENT_WIDTH_MM = 70;

/** Margen izquierdo al colocar el raster en el PDF. */
export const THERMAL_TICKET_AGENT_LEFT_INSET_MM = 1;

/** Espacio en blanco extra al final del PDF rasterizado, además del padding HTML. */
export const THERMAL_TICKET_PDF_EXTRA_FEED_MM = 28;

/** Cola inferior dentro del HTML rasterizado. */
export const THERMAL_TICKET_BOTTOM_PADDING = "48mm";

/** @deprecated Usar THERMAL_TICKET_AGENT_LEFT_INSET_MM */
export const THERMAL_TICKET_AGENT_SIDE_INSET_MM = THERMAL_TICKET_AGENT_LEFT_INSET_MM;

/** Ancho del bloque HTML (debe coincidir con el ancho en PDF). */
export const THERMAL_TICKET_RECEIPT_WIDTH_MM = THERMAL_TICKET_AGENT_CONTENT_WIDTH_MM;

/** Peso “negrita” en ticket. */
export const THERMAL_TICKET_BOLD_WEIGHT = 600;

/** CSS base para tickets con contenedor `.receipt` (venta, cotización). */
export function thermalReceiptTicketCss(): string {
  const w = THERMAL_TICKET_BOLD_WEIGHT;
  const tail = THERMAL_TICKET_BOTTOM_PADDING;
  const contentW = THERMAL_TICKET_RECEIPT_WIDTH_MM;
  return `
  @page { size: 72mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 0; overflow: hidden; width: ${contentW}mm; max-width: ${contentW}mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif; font-size: 10px; line-height: 1.25; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt { width: ${contentW}mm; max-width: ${contentW}mm; margin: 0; padding: 0 0 ${tail}; overflow: hidden; }
  .logo { display: block; max-width: 48mm; max-height: 20mm; margin: 0 auto 4px; object-fit: contain; }
  .store { font-size: 12px; font-weight: ${w}; text-align: center; margin: 0 0 2px; line-height: 1.15; word-break: break-word; }
  .legal { font-size: 9px; text-align: center; margin: 0; color: #333; word-break: break-word; }
  .muted { color: #555; font-size: 8.5px; word-break: break-word; }
  .center { text-align: center; word-break: break-word; }
  .row { display: flex; justify-content: space-between; gap: 3px; font-size: 9px; margin: 2px 0; align-items: flex-start; max-width: 100%; }
  .row > span { min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
  .row > span:last-child { flex-shrink: 0; text-align: right; max-width: 42%; }
  .row.customer-name .customer-name-value { flex: 1; max-width: none; text-align: left; }
  .sep { border-top: 1px dashed #888; margin: 5px 0; }
  .section-title { font-size: 9px; font-weight: ${w}; text-transform: uppercase; letter-spacing: 0.02em; margin: 4px 0 2px; color: #333; }
  table.lines { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; }
  table.lines .line-block { vertical-align: top; padding: 3px 0; border-bottom: 1px dotted #ccc; overflow-wrap: anywhere; word-break: break-word; }
  table.lines tr:last-child .line-block { border-bottom: none; }
  table.lines .line-name { font-size: 9px; color: #111; }
  table.lines .line-detail { display: flex; justify-content: space-between; align-items: baseline; gap: 3px; margin-top: 1px; font-size: 9px; color: #111; max-width: 100%; }
  table.lines .line-detail .line-qty { min-width: 0; flex: 1; }
  table.lines .line-detail .line-total { flex-shrink: 0; text-align: right; white-space: nowrap; max-width: 42%; }
  .name { word-wrap: break-word; overflow-wrap: anywhere; }
  .tright { text-align: right; }
  .tot { font-size: 10px; font-weight: ${w}; }
  .barcode-section { margin-top: 8px; padding-top: 2px; }
  .barcode-wrap { display: flex; justify-content: center; width: 100%; max-width: 100%; overflow: hidden; }
  .barcode-wrap svg { max-width: 62mm; height: auto; }
  .wrap { font-size: 9px; white-space: pre-wrap; word-break: break-word; margin: 0; }
`.trim();
}

/** CSS para tickets sin wrapper `.receipt` (nota de crédito, etc.). */
export function thermalReceiptTicketBodyCss(): string {
  const w = THERMAL_TICKET_BOLD_WEIGHT;
  const tail = THERMAL_TICKET_BOTTOM_PADDING;
  const contentW = THERMAL_TICKET_RECEIPT_WIDTH_MM;
  return `
@page { size: 72mm auto; margin: 0; }
html, body { margin: 0; padding: 0; min-height: 0; overflow: hidden; width: ${contentW}mm; max-width: ${contentW}mm; }
body { font-family: system-ui, sans-serif; font-size: 10px; line-height: 1.25; color: #111; padding: 0 0 ${tail}; }
.logo { text-align: center; margin: 0 0 4px; }
.logo img { max-width: 48mm; max-height: 16mm; object-fit: contain; }
h1 { font-size: 12px; font-weight: ${w}; text-align: center; margin: 2px 0; word-break: break-word; }
.muted { color: #555; font-size: 9px; word-break: break-word; }
.section-title { font-weight: ${w}; margin: 4px 0 2px; font-size: 9px; text-transform: uppercase; }
.row { display: flex; justify-content: space-between; gap: 3px; margin: 2px 0; max-width: 100%; }
.row > span { min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
.row > span:last-child { flex-shrink: 0; text-align: right; max-width: 42%; }
.sep { border-top: 1px dashed #999; margin: 4px 0; }
table.items { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; }
table.items .line-block { vertical-align: top; padding: 2px 0; overflow-wrap: anywhere; word-break: break-word; }
table.items .line-name { font-size: 9px; color: #111; }
table.items .line-detail { display: flex; justify-content: space-between; align-items: baseline; gap: 3px; margin-top: 1px; font-size: 9px; color: #111; max-width: 100%; }
table.items .line-detail .line-qty { min-width: 0; flex: 1; }
table.items .line-detail .line-total { flex-shrink: 0; text-align: right; white-space: nowrap; max-width: 42%; }
.barcode-section { margin-top: 8px; padding-top: 2px; }
.barcode { text-align: center; margin: 0; max-width: 100%; overflow: hidden; }
.total-row { font-weight: ${w}; font-size: 10px; }
`.trim();
}
