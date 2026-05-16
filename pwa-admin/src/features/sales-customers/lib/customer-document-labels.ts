/** Etiquetas UI para `Person.documentType` en listados y detalle. */
export function documentTypeLabel(code: string | null | undefined): string {
  if (code == null || String(code).trim() === "") {
    return "—";
  }
  const c = String(code).trim().toUpperCase();
  switch (c) {
    case "RUN":
      return "RUN";
    case "RUT":
      return "RUT";
    case "PASSPORT":
      return "Pasaporte";
    case "DNI":
      return "DNI";
    case "OTHER":
      return "DNI";
    default:
      return c;
  }
}
