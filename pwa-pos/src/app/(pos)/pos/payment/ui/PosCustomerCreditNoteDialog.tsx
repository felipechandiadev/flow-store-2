"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog } from "@/shared/admin-shared";
import { DocumentPrintModeToggle } from "@/features/pos-print/ui/DocumentPrintModeToggle";
import { getPosDocumentPrintMode } from "@flowstore/print-service-client";
import type { CustomerCreditNotePrintData } from "@/features/customer-credit-notes/types/customer-credit-note-print.types";
import {
  buildCustomerCreditNoteReceiptHtml,
  printCustomerCreditNoteReceipt,
} from "@/features/customer-credit-notes/lib/customer-credit-note-receipt-print";
import {
  buildCustomerCreditNoteDocumentHtml,
  printCustomerCreditNoteDocument,
} from "@/features/customer-credit-notes/lib/customer-credit-note-document-print";

type PrintMode = "ticket" | "document";

type Props = {
  open: boolean;
  data: CustomerCreditNotePrintData | null;
  onClose: () => void;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function PosCustomerCreditNoteDialog({ open, data, onClose }: Props) {
  const [printMode, setPrintMode] = useState<PrintMode>("ticket");
  const printedFolioRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      printedFolioRef.current = null;
      return;
    }
    setPrintMode(getPosDocumentPrintMode("customerCreditNote"));
  }, [open]);

  useEffect(() => {
    if (!open || !data?.creditNoteFolio?.trim()) return;
    const folio = data.creditNoteFolio.trim();
    if (printedFolioRef.current === folio) return;
    printedFolioRef.current = folio;
    const t = window.setTimeout(() => {
      if (printMode === "document") {
        printCustomerCreditNoteDocument(data);
      } else {
        printCustomerCreditNoteReceipt(data);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [open, data, printMode]);

  const previewSrcDoc = useMemo(() => {
    if (!data || typeof window === "undefined") return null;
    const origin = window.location.origin;
    return printMode === "document"
      ? buildCustomerCreditNoteDocumentHtml(data)
      : buildCustomerCreditNoteReceiptHtml(data, origin);
  }, [data, printMode]);

  const handleReprint = () => {
    if (!data) return;
    if (printMode === "document") {
      printCustomerCreditNoteDocument(data);
    } else {
      printCustomerCreditNoteReceipt(data);
    }
  };

  if (!data) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nota de crédito emitida"
      size="lg"
      data-test-id="pos-customer-credit-note-dialog"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Folio <span className="font-semibold text-foreground">{data.creditNoteFolio}</span>
          {" · "}
          Monto NC {formatMoney(data.totals.total)}
          {data.refundMode === "immediate" ? " · Reembolso en caja" : ""}
        </p>
        {data.refundMode === "immediate" && data.refundPayments.length > 0 ? (
          <ul className="text-sm text-muted-foreground">
            {data.refundPayments.map((p, i) => (
              <li key={`${p.label}-${i}`}>
                {p.label}: {formatMoney(p.amount)}
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Formato de impresión</p>
          <DocumentPrintModeToggle
            value={printMode}
            onChange={setPrintMode}
            data-test-id="pos-nc-print-mode"
          />
        </div>
        {previewSrcDoc ? (
          <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
            <iframe
              title="Vista previa nota de crédito"
              srcDoc={previewSrcDoc}
              className="h-[min(60vh,480px)] w-full bg-white"
              sandbox=""
            />
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outlined" onClick={onClose} data-test-id="pos-nc-dialog-close">
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handleReprint} data-test-id="pos-nc-dialog-reprint">
            Reimprimir
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
