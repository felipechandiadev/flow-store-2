type RowWithFolio = {
  documentFolio?: string | null;
  metadata?: { dteNumber?: string | null } | null;
};

export function dteFolioDisplay(row: RowWithFolio): string {
  const col = row.documentFolio?.trim();
  if (col) {
    return col;
  }
  const m = row.metadata?.dteNumber;
  const s = m != null ? String(m).trim() : "";
  return s || "—";
}
