"use client";

import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import IconButton from "@/shared/components/IconButton/IconButton";
import type { CompanyBankAccountItem } from "@/features/settings-branches/infrastructure/company.request";
import type { SupplierPersonBankAccount } from "@/features/purchasing-suppliers/types/supplier.types";
import { bankAccountOptionKey } from "@/features/purchasing-dte/lib/planned-payment-helpers";

import type { Option } from "@/shared/components/Select";

export type InvoicePlannedPaymentMethodUI = "CASH" | "TRANSFER" | "CHECK";

export type InvoicePlannedPaymentLineState = {
  id: string;
  dueDate: string;
  amountStr: string;
  paymentMethod: InvoicePlannedPaymentMethodUI;
  companyBankAccountKey: string | null;
  supplierBankAccountKey: string | null;
  chequeNumber: string;
  /** Admin: centro de acopio (efectivo). */
  cashHubId?: string | null;
  /** POS: sesión de caja (efectivo desde cajón). */
  cashSessionId?: string | null;
  /** Legacy / API: banco del cheque; en UI se deriva de la cuenta empresa. */
  chequeBankName?: string;
  /** Nombre del girador (responsable que firma). */
  chequeDrawerName?: string;
  /** Cheque "a fecha" (postdated). */
  chequeDueDate?: string;
};

const METHOD_OPTIONS = [
  { id: "TRANSFER", label: "Transferencia" },
  { id: "CHECK", label: "Cheque" },
  { id: "CASH", label: "Efectivo" },
] as const;

function accountLabel(a: CompanyBankAccountItem | SupplierPersonBankAccount): string {
  return `${a.bankName} · ${a.accountType} · ${a.accountNumber}`;
}

export type InvoicePlannedPaymentLinesProps = {
  disabled: boolean;
  companyBankAccounts: CompanyBankAccountItem[];
  supplierBankAccounts: SupplierPersonBankAccount[];
  /** Centros de acopio para pagos en efectivo (compras / recepción). */
  cashHubOptions?: Option[];
  /** Si es false, no se muestra el botón «+» (p. ej. pago único completado). */
  allowAddLine?: boolean;
  lines: InvoicePlannedPaymentLineState[];
  onAddLine: () => void;
  onRemoveLine: (id: string) => void;
  onPatchLine: (id: string, patch: Partial<InvoicePlannedPaymentLineState>) => void;
};

export function InvoicePlannedPaymentLines({
  disabled,
  companyBankAccounts,
  supplierBankAccounts,
  cashHubOptions = [],
  allowAddLine = true,
  lines,
  onAddLine,
  onRemoveLine,
  onPatchLine,
}: InvoicePlannedPaymentLinesProps) {
  const companyOpts = companyBankAccounts.map((a, i) => ({
    id: bankAccountOptionKey(a, i),
    label: accountLabel(a),
  }));
  const supplierOpts = supplierBankAccounts.map((a, i) => ({
    id: bankAccountOptionKey(a, i),
    label: accountLabel(a),
  }));

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3" data-test-id="invoice-planned-payments">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Pagos</h3>
        {allowAddLine ? (
          <IconButton
            type="button"
            icon="Plus"
            variant="outlined"
            size="sm"
            ariaLabel="Agregar línea de pago"
            disabled={disabled}
            onClick={onAddLine}
            data-test-id="invoice-payment-add-line"
          />
        ) : null}
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seleccione un proveedor para planificar pagos.</p>
      ) : (
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <div
              key={line.id}
              className="rounded-md border border-border/80 bg-background p-3"
              data-test-id={`invoice-payment-line-${idx}`}
            >
              {lines.length > 1 ? (
                <div className="mb-2 flex justify-end">
                  <IconButton
                    type="button"
                    icon="Trash2"
                    variant="action"
                    size="sm"
                    ariaLabel="Quitar línea de pago"
                    disabled={disabled}
                    onClick={() => onRemoveLine(line.id)}
                    data-test-id={`invoice-payment-remove-${idx}`}
                  />
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                <div className="min-w-0">
                  <TextField
                    label="Fecha de pago"
                    type="date"
                    value={line.dueDate}
                    onChange={(e) => onPatchLine(line.id, { dueDate: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="min-w-0">
                  <TextField
                    label="Monto CLP"
                    type="currency"
                    currencySymbol="$"
                    startSymbol="$"
                    value={line.amountStr}
                    onChange={(e) => onPatchLine(line.id, { amountStr: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="min-w-0">
                  <Select
                    label="Medio de pago"
                    alwaysShowLabel
                    options={[...METHOD_OPTIONS]}
                    value={line.paymentMethod}
                    onChange={(id) =>
                      onPatchLine(line.id, {
                        paymentMethod: (id ?? "CASH") as InvoicePlannedPaymentMethodUI,
                        cashHubId:
                          id === "CASH" && cashHubOptions[0]
                            ? String(cashHubOptions[0].id)
                            : id !== "CASH"
                              ? null
                              : line.cashHubId,
                      })
                    }
                    disabled={disabled}
                    data-test-id={`invoice-payment-method-${idx}`}
                  />
                </div>
              </div>

              {line.paymentMethod === "TRANSFER" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Cuenta empresa (origen)"
                      alwaysShowLabel
                      placeholder={companyOpts.length ? "Seleccione…" : "Sin cuentas en empresa"}
                      options={companyOpts}
                      value={line.companyBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { companyBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || companyOpts.length === 0}
                    />
                  </div>
                  <div className="min-w-0">
                    <Select
                      label="Cuenta proveedor (destino)"
                      alwaysShowLabel
                      placeholder={supplierOpts.length ? "Seleccione…" : "Sin cuentas del proveedor"}
                      options={supplierOpts}
                      value={line.supplierBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { supplierBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || supplierOpts.length === 0}
                    />
                  </div>
                </div>
              ) : null}

              {line.paymentMethod === "CASH" && cashHubOptions.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Centro de acopio (efectivo)"
                      alwaysShowLabel
                      placeholder="Seleccione…"
                      options={cashHubOptions}
                      value={line.cashHubId ?? null}
                      onChange={(id) => onPatchLine(line.id, { cashHubId: id != null ? String(id) : null })}
                      disabled={disabled}
                      data-test-id={`invoice-payment-cash-hub-${idx}`}
                    />
                  </div>
                </div>
              ) : null}

              {line.paymentMethod === "CHECK" ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                  <div className="min-w-0">
                    <Select
                      label="Cuenta empresa (cheque)"
                      alwaysShowLabel
                      placeholder={companyOpts.length ? "Seleccione…" : "Sin cuentas en empresa"}
                      options={companyOpts}
                      value={line.companyBankAccountKey}
                      onChange={(id) =>
                        onPatchLine(line.id, { companyBankAccountKey: id != null ? String(id) : null })
                      }
                      disabled={disabled || companyOpts.length === 0}
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Número de cheque"
                      value={line.chequeNumber}
                      onChange={(e) => onPatchLine(line.id, { chequeNumber: e.target.value })}
                      disabled={disabled}
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="Girador"
                      value={line.chequeDrawerName ?? ""}
                      onChange={(e) =>
                        onPatchLine(line.id, { chequeDrawerName: e.target.value })
                      }
                      disabled={disabled}
                      placeholder="Responsable que firma"
                    />
                  </div>
                  <div className="min-w-0">
                    <TextField
                      label="A fecha (opcional)"
                      type="date"
                      value={line.chequeDueDate ?? ""}
                      onChange={(e) =>
                        onPatchLine(line.id, { chequeDueDate: e.target.value })
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
