"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import { Select, type Option } from "@/shared/components/Select";
import { createRemunerationAction } from "@/features/hr-remunerations/actions/remuneration.action";
import type { EmployeeGridRow } from "@/features/hr-employees/types/employee.types";

export type CreateRemunerationDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  employees: EmployeeGridRow[];
};

function employeeLabel(row: EmployeeGridRow): string {
  const p = row.person;
  if (p) {
    const business = p.businessName?.trim();
    if (business) return business;
    const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  return row.id;
}

function todayIsoDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseCurrencyToNumber(value: string): number {
  return Math.max(0, Math.round(Number(String(value).replace(/\D/g, "")) || 0));
}

function baseSalaryAsInputValue(baseSalary: string | null | undefined): string {
  if (baseSalary == null || String(baseSalary).trim() === "") {
    return "";
  }
  const n = parseCurrencyToNumber(String(baseSalary));
  return n > 0 ? String(n) : "";
}

function parsePercent(value: string): number {
  const t = String(value).trim().replace(",", ".");
  if (!t) return 0;
  const n = parseFloat(t);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, n);
}

/** Monto de descuento = remuneración ordinaria × porcentaje / 100 */
function amountFromPercent(ordinaryRaw: string, percentRaw: string): string {
  const base = parseCurrencyToNumber(ordinaryRaw);
  const pct = parsePercent(percentRaw);
  if (base <= 0 || pct <= 0) return "";
  return String(Math.round((base * pct) / 100));
}

function fmtClp(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CreateRemunerationDialog({
  open,
  onClose,
  onSuccess,
  employees,
}: CreateRemunerationDialogProps) {
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIsoDate);
  const [ordinaryAmount, setOrdinaryAmount] = useState("");
  const [afpPercent, setAfpPercent] = useState("");
  const [afpAmount, setAfpAmount] = useState("");
  const [healthPercent, setHealthPercent] = useState("");
  const [healthAmount, setHealthAmount] = useState("");
  const [othersAmount, setOthersAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const employeeOptions: Option[] = useMemo(
    () =>
      employees
        .filter((e) => e.status !== "TERMINATED")
        .map((e) => ({ id: e.id, label: employeeLabel(e) })),
    [employees],
  );

  const applyPercentToAmounts = (ordinaryRaw: string, afpPct: string, healthPct: string) => {
    if (afpPct.trim()) {
      setAfpAmount(amountFromPercent(ordinaryRaw, afpPct));
    }
    if (healthPct.trim()) {
      setHealthAmount(amountFromPercent(ordinaryRaw, healthPct));
    }
  };

  useEffect(() => {
    if (open) {
      setEmployeeId(null);
      setDate(todayIsoDate());
      setOrdinaryAmount("");
      setAfpPercent("");
      setAfpAmount("");
      setHealthPercent("");
      setHealthAmount("");
      setOthersAmount("");
      setError(null);
    }
  }, [open]);

  const reset = () => {
    setEmployeeId(null);
    setDate(todayIsoDate());
    setOrdinaryAmount("");
    setAfpPercent("");
    setAfpAmount("");
    setHealthPercent("");
    setHealthAmount("");
    setOthersAmount("");
    setError(null);
  };

  const handleEmployeeChange = (v: string | null) => {
    const id = v != null ? String(v) : null;
    setEmployeeId(id);
    if (!id) {
      setOrdinaryAmount("");
      setAfpAmount("");
      setHealthAmount("");
      return;
    }
    const employee = employees.find((e) => e.id === id);
    const ordinary = baseSalaryAsInputValue(employee?.baseSalary);
    setOrdinaryAmount(ordinary);
    applyPercentToAmounts(ordinary, afpPercent, healthPercent);
  };

  const handleOrdinaryChange = (value: string) => {
    setOrdinaryAmount(value);
    applyPercentToAmounts(value, afpPercent, healthPercent);
  };

  const handleAfpPercentChange = (value: string) => {
    const sanitized = value.replace(/[^\d.,]/g, "");
    setAfpPercent(sanitized);
    setAfpAmount(amountFromPercent(ordinaryAmount, sanitized));
  };

  const handleHealthPercentChange = (value: string) => {
    const sanitized = value.replace(/[^\d.,]/g, "");
    setHealthPercent(sanitized);
    setHealthAmount(amountFromPercent(ordinaryAmount, sanitized));
  };

  const handleClose = () => {
    setError(null);
    reset();
    onClose();
  };

  const earnings = parseCurrencyToNumber(ordinaryAmount);
  const deductions =
    parseCurrencyToNumber(afpAmount) +
    parseCurrencyToNumber(healthAmount) +
    parseCurrencyToNumber(othersAmount);
  const netPreview = earnings - deductions;

  const handleSubmit = () => {
    setError(null);
    if (!employeeId) {
      setError("Seleccione un empleado.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await createRemunerationAction({
          employeeId,
          date: date.trim(),
          ordinaryAmount: earnings,
          afpAmount: parseCurrencyToNumber(afpAmount),
          healthAmount: parseCurrencyToNumber(healthAmount),
          othersAmount: parseCurrencyToNumber(othersAmount),
        });
        if (r.success) {
          await onSuccess?.();
          handleClose();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const canSubmit =
    !isPending && employeeId != null && date.trim().length > 0 && earnings > 0 && netPreview >= 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Nueva remuneración"
      size="lg"
      scroll="paper"
      maxHeight="min(90vh, 720px)"
      data-test-id="remuneration-create-dialog"
      alertArea={
        error ? (
          <Alert variant="error" data-test-id="remuneration-create-error">
            {error}
          </Alert>
        ) : null
      }
      actions={
        <>
          <Button variant="outlined" size="md" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={!canSubmit}>
            Crear remuneración
          </Button>
        </>
      }
    >
      <div className="flex w-full min-w-0 flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Registra una liquidación de sueldo para el empleado. Los descuentos son opcionales.
        </p>

        <Select
          label="Empleado"
          name="remuneration-employee"
          placeholder="Seleccione empleado"
          options={employeeOptions}
          value={employeeId}
          onChange={(v) => handleEmployeeChange(v != null ? String(v) : null)}
          required
          data-test-id="remuneration-create-employee"
        />

        <TextField
          label="Fecha de liquidación"
          name="remuneration-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          data-test-id="remuneration-create-date"
        />

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Haberes</p>
          <TextField
            label="Remuneración ordinaria"
            name="remuneration-ordinary"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={ordinaryAmount}
            onChange={(e) => handleOrdinaryChange(e.target.value)}
            required
            data-test-id="remuneration-create-ordinary"
          />
          <p className="text-xs text-muted-foreground">
            Se precarga con el sueldo base del empleado; puede editarlo antes de guardar.
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <p className="text-sm font-semibold text-foreground">Descuentos (opcional)</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(7.5rem,9rem)_1fr] sm:items-end">
            <TextField
              label="AFP"
              name="remuneration-afp-percent"
              value={afpPercent}
              onChange={(e) => handleAfpPercentChange(e.target.value)}
              endSymbol="%"
              placeholder="0"
              data-test-id="remuneration-create-afp-percent"
            />
            <TextField
              label="Monto AFP"
              name="remuneration-afp"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={afpAmount}
              onChange={(e) => setAfpAmount(e.target.value)}
              data-test-id="remuneration-create-afp"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(7.5rem,9rem)_1fr] sm:items-end">
            <TextField
              label="Salud"
              name="remuneration-health-percent"
              value={healthPercent}
              onChange={(e) => handleHealthPercentChange(e.target.value)}
              endSymbol="%"
              placeholder="0"
              data-test-id="remuneration-create-health-percent"
            />
            <TextField
              label="Monto salud"
              name="remuneration-health"
              type="currency"
              currencySymbol="$"
              startSymbol="$"
              value={healthAmount}
              onChange={(e) => setHealthAmount(e.target.value)}
              data-test-id="remuneration-create-health"
            />
          </div>

          <TextField
            label="Otros"
            name="remuneration-others"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={othersAmount}
            onChange={(e) => setOthersAmount(e.target.value)}
            data-test-id="remuneration-create-others"
          />
        </div>

        {earnings > 0 ? (
          <p className="text-sm text-muted-foreground" data-test-id="remuneration-create-net-preview">
            Líquido estimado:{" "}
            <span className="font-semibold text-foreground">{fmtClp(netPreview)}</span>
            {netPreview < 0 ? " (revise los montos)" : null}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
