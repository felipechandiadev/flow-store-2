/**
 * Estilos tickets térmicos 80 mm (POS → agente KaiPrinters).
 * Área útil ~64 mm, alineación segura y cola larga para corte/feed.
 */

/** Ancho físico de la bobina. */
export const THERMAL_TICKET_PAGE_WIDTH_MM = 80;

/** Ancho dibujado en PDF (impresoras 80 mm suelen imprimir ~72 mm útiles). */
export const THERMAL_TICKET_AGENT_CONTENT_WIDTH_MM = 64;

/** Margen izquierdo en PDF (alinear a la zona imprimible, evita corte a la derecha). */
export const THERMAL_TICKET_AGENT_LEFT_INSET_MM = 5;

/** Espacio en blanco extra al final del PDF, además del padding HTML. */
export const THERMAL_TICKET_PDF_EXTRA_FEED_MM = 16;

/** Cola inferior dentro del HTML rasterizado. */
export const THERMAL_TICKET_BOTTOM_PADDING = "36mm";

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
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; min-height: 0; overflow: hidden; width: ${contentW}mm; max-width: ${contentW}mm; }
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif; font-size: 10px; line-height: 1.25; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt { width: ${contentW}mm; max-width: ${contentW}mm; margin: 0; padding: 0 0 ${tail}; overflow: hidden; }
  .logo { display: block; max-width: 44mm; max-height: 20mm; margin: 0 auto 4px; object-fit: contain; }
  .store { font-size: 12px; font-weight: ${w}; text-align: center; margin: 0 0 2px; line-height: 1.15; word-break: break-word; }
  .legal { font-size: 9px; text-align: center; margin: 0; color: #333; word-break: break-word; }
  .muted { color: #555; font-size: 8.5px; word-break: break-word; }
  .center { text-align: center; word-break: break-word; }
  .row { display: flex; justify-content: space-between; gap: 3px; font-size: 9px; margin: 2px 0; align-items: flex-start; max-width: 100%; }
  .row > span { min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
  .row > span:last-child { flex-shrink: 0; text-align: right; max-width: 42%; }
  .sep { border-top: 1px dashed #888; margin: 5px 0; }
  .section-title { font-size: 9px; font-weight: ${w}; text-transform: uppercase; letter-spacing: 0.02em; margin: 4px 0 2px; color: #333; }
  table.lines { width: 100%; max-width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 9px; }
  table.lines td { vertical-align: top; padding: 3px 0; border-bottom: 1px dotted #ccc; overflow-wrap: anywhere; word-break: break-word; }
  table.lines tr:last-child td { border-bottom: none; }
  table.lines .name { width: 58%; max-width: 58%; }
  table.lines .qty { width: 42%; max-width: 42%; white-space: nowrap; text-align: right; font-size: 8.5px; }
  .name { word-wrap: break-word; overflow-wrap: anywhere; }
  .tright { text-align: right; }
  .tot { font-size: 10px; font-weight: ${w}; }
  .barcode-wrap { display: flex; justify-content: center; width: 100%; max-width: 100%; margin-top: 5px; overflow: hidden; }
  .barcode-wrap svg { max-width: 56mm; height: auto; }
  .wrap { font-size: 9px; white-space: pre-wrap; word-break: break-word; margin: 0; }
`.trim();
}

/** CSS para tickets sin wrapper `.receipt` (nota de crédito, etc.). */
export function thermalReceiptTicketBodyCss(): string {
  const w = THERMAL_TICKET_BOLD_WEIGHT;
  const tail = THERMAL_TICKET_BOTTOM_PADDING;
  const contentW = THERMAL_TICKET_RECEIPT_WIDTH_MM;
  return `
@page { size: 80mm auto; margin: 0; }
html, body { margin: 0; padding: 0; min-height: 0; overflow: hidden; width: ${contentW}mm; max-width: ${contentW}mm; }
body { font-family: system-ui, sans-serif; font-size: 10px; line-height: 1.25; color: #111; padding: 0 0 ${tail}; }
.logo { text-align: center; margin: 0 0 4px; }
.logo img { max-width: 44mm; max-height: 16mm; object-fit: contain; }
h1 { font-size: 12px; font-weight: ${w}; text-align: center; margin: 2px 0; word-break: break-word; }
.muted { color: #555; font-size: 9px; word-break: break-word; }
.section-title { font-weight: ${w}; margin: 4px 0 2px; font-size: 9px; text-transform: uppercase; }
.row { display: flex; justify-content: space-between; gap: 3px; margin: 2px 0; max-width: 100%; }
.row > span { min-width: 0; word-break: break-word; overflow-wrap: anywhere; }
.row > span:last-child { flex-shrink: 0; text-align: right; max-width: 42%; }
.sep { border-top: 1px dashed #999; margin: 4px 0; }
table.items { width: 100%; table-layout: fixed; border-collapse: collapse; }
table.items td { vertical-align: top; padding: 2px 0; overflow-wrap: anywhere; word-break: break-word; }
table.items .name { width: 58%; }
table.items .tright { width: 42%; text-align: right; white-space: nowrap; font-size: 8.5px; }
.barcode { text-align: center; margin: 5px 0; max-width: 100%; overflow: hidden; }
.total-row { font-weight: ${w}; font-size: 10px; }
`.trim();
}
