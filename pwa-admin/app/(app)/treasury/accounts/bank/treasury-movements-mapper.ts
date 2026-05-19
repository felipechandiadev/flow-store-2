import type { TreasuryBankMovementApiRow } from "@/features/treasury-bank-operations/infrastructure/treasury-bank-movements.request";
import {
  getTransactionStatusLabel,
  getTransactionTypeLabel,
} from "@/features/transactions/types/transaction-types";

export type TreasuryMovementGridRow = {
  id: string;
  fecha: string;
  tipo: string;
  documento: string;
  total: string;
  estado: string;
  contraparte: string;
};

function resolveCounterparty(tx: TreasuryBankMovementApiRow): string {
  const c = tx.customer as Record<string, unknown> | undefined;
  const cp = c?.person as Record<string, unknown> | undefined;
  if (cp) {
    const bn = String(cp.businessName ?? "").trim();
    if (bn) return bn;
    const n = [cp.firstName, cp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  const s = tx.supplier as Record<string, unknown> | undefined;
  const sp = (s?.person as Record<string, unknown> | undefined) ?? undefined;
  if (sp) {
    const bn = String(sp.businessName ?? "").trim();
    if (bn) return bn;
    const n = [sp.firstName, sp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  const sh = tx.shareholder as Record<string, unknown> | undefined;
  const shp = sh?.person as Record<string, unknown> | undefined;
  if (shp) {
    const n = [shp.firstName, shp.lastName].filter(Boolean).join(" ").trim();
    if (n) return n;
  }
  return "—";
}

export function mapApiTxToMovementGridRow(tx: TreasuryBankMovementApiRow): TreasuryMovementGridRow {
  const id = String(tx.id ?? "");
  const created = tx.createdAt != null ? new Date(String(tx.createdAt)) : null;
  const fecha =
    created && !Number.isNaN(created.getTime())
      ? new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(created)
      : "—";
  const tipo = getTransactionTypeLabel(
    tx.transactionType != null ? String(tx.transactionType) : null,
  );
  const documento = String(tx.documentNumber ?? tx.documentFolio ?? "—");
  const totalNum = Number(tx.total ?? 0);
  const total = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(totalNum) ? totalNum : 0);
  const estado = getTransactionStatusLabel(
    tx.status != null ? String(tx.status) : null,
  );
  return {
    id,
    fecha,
    tipo,
    documento,
    total,
    estado,
    contraparte: resolveCounterparty(tx),
  };
}
