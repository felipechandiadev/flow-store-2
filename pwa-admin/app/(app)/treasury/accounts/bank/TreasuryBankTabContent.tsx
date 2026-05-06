"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CompanyDetails } from "@/features/settings-branches/infrastructure/company.request";
import type { ShareholderRow } from "@/features/settings-shareholders/types/shareholder.types";
import { Card, StatisticsCard, type LucideIconName } from "@/shared/components/Cards";
import IconButton from "@/shared/components/IconButton/IconButton";
import Dialog from "@/shared/components/Dialog/Dialog";
import Alert from "@/shared/components/Alert/Alert";
import { Button } from "@/shared/components/Button";
import { TextField } from "@/shared/components/TextField/TextField";
import Select from "@/shared/components/Select/Select";
import type { Option } from "@/shared/components/Select";
import {
  postCapitalContributionAction,
  postCashDepositAction,
  postDividendWithdrawalAction,
  postPettyCashWithdrawalAction,
} from "@/features/treasury-bank-operations/actions/treasury-bank-operations.action";
import TreasuryBankMovementsGrid from "./TreasuryBankMovementsGrid";
import { treasuryBankAccountKey } from "./treasury-bank-accounts";
import type { TreasuryMovementGridRow } from "./treasury-movements-mapper";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function partnerLabel(row: ShareholderRow): string {
  const p = row.person;
  return (
    p?.displayName?.trim() ||
    [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() ||
    p?.businessName?.trim() ||
    "Socio"
  );
}

type TreasuryBankTabContentProps = {
  company: CompanyDetails | null;
  shareholders: ShareholderRow[];
  selectedBankAccountKey: string | null;
  movementRows: TreasuryMovementGridRow[];
  movementsTotal: number;
};

type DialogKind = "none" | "capital" | "dividend" | "deposit" | "petty";

const TREASURY_CARD_PAD = "[&_.fs-card__content]:p-2 [&_.fs-card__content]:pb-2";

function TreasuryTransactionCard({
  title,
  description,
  icon,
  ariaLabel,
  disabled,
  onOpen,
  "data-test-id": dataTestId,
}: {
  title: string;
  description: string;
  icon: LucideIconName;
  ariaLabel: string;
  disabled?: boolean;
  onOpen: () => void;
  "data-test-id"?: string;
}) {
  return (
    <Card
      className={TREASURY_CARD_PAD}
      content={
        <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-0.5">
          <h3 className="min-w-0 self-center text-sm font-semibold leading-tight text-foreground">{title}</h3>
          <p className="col-start-1 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">{description}</p>
          <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-start justify-end self-start pt-0.5">
            <IconButton
              icon={icon}
              variant="basicSecondary"
              size="sm"
              ariaLabel={ariaLabel}
              onClick={onOpen}
              disabled={disabled}
            />
          </div>
        </div>
      }
      data-test-id={dataTestId}
    />
  );
}

export default function TreasuryBankTabContent({
  company,
  shareholders,
  selectedBankAccountKey,
  movementRows,
  movementsTotal,
}: TreasuryBankTabContentProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dialog, setDialog] = useState<DialogKind>("none");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const accounts = company?.bankAccounts ?? [];
  const totalBank = useMemo(
    () => accounts.reduce((s, a) => s + (typeof a.currentBalance === "number" ? a.currentBalance : 0), 0),
    [accounts],
  );

  const bankOptions: Option[] = useMemo(
    () =>
      accounts.map((a) => ({
        id: treasuryBankAccountKey(a),
        label: `${a.bankName} · ${a.accountNumber}`,
      })),
    [accounts],
  );

  const partnerOptions: Option[] = useMemo(
    () =>
      shareholders.map((s) => ({
        id: s.id,
        label: `${partnerLabel(s)}${s.ownershipPercentage != null ? ` (${s.ownershipPercentage}%)` : ""}`,
      })),
    [shareholders],
  );

  const [bankOpt, setBankOpt] = useState<string | null>(null);
  const [partnerOpt, setPartnerOpt] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("0");
  const [taxStr, setTaxStr] = useState("");

  const preferredBankKey = useMemo(() => {
    if (
      selectedBankAccountKey &&
      bankOptions.some((o) => String(o.id) === String(selectedBankAccountKey))
    ) {
      return String(selectedBankAccountKey);
    }
    return bankOptions[0] != null ? String(bankOptions[0].id) : null;
  }, [bankOptions, selectedBankAccountKey]);

  const resetForm = () => {
    setBankOpt(preferredBankKey);
    setPartnerOpt(partnerOptions[0] != null ? String(partnerOptions[0].id) : null);
    setAmountStr("0");
    setTaxStr("");
    setError(null);
  };

  useEffect(() => {
    if (dialog !== "none") {
      return;
    }
    setBankOpt(preferredBankKey);
  }, [dialog, preferredBankKey]);

  const selectBankAccount = useCallback(
    (key: string) => {
      const p = new URLSearchParams(searchParams.toString());
      p.set("bankAccount", key);
      p.delete("page");
      router.push(`${pathname}?${p.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const openDialog = (k: DialogKind) => {
    resetForm();
    setDialog(k);
  };

  const closeDialog = () => {
    if (pending) {
      return;
    }
    setDialog("none");
  };

  const amountNum = Math.max(0, Math.round(Number(amountStr) || 0));

  const submitCapital = () => {
    setError(null);
    if (!partnerOpt || !bankOpt || amountNum <= 0) {
      setError("Complete socio, cuenta y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCapitalContributionAction({
          shareholderId: partnerOpt,
          bankAccountKey: bankOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitDividend = () => {
    setError(null);
    if (!partnerOpt || !bankOpt || amountNum <= 0) {
      setError("Complete socio, cuenta y monto.");
      return;
    }
    const tax = taxStr.trim() === "" ? undefined : Math.max(0, Number(taxStr) || 0);
    startTransition(() => {
      void (async () => {
        const r = await postDividendWithdrawalAction({
          shareholderId: partnerOpt,
          bankAccountKey: bankOpt,
          amount: amountNum,
          taxRetention: tax,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitDeposit = () => {
    setError(null);
    if (!bankOpt || amountNum <= 0) {
      setError("Seleccione cuenta destino y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postCashDepositAction({
          bankAccountKey: bankOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  const submitPetty = () => {
    setError(null);
    if (!bankOpt || amountNum <= 0) {
      setError("Seleccione cuenta origen y monto.");
      return;
    }
    startTransition(() => {
      void (async () => {
        const r = await postPettyCashWithdrawalAction({
          bankAccountKey: bankOpt,
          amount: amountNum,
        });
        if (r.success) {
          closeDialog();
          router.refresh();
        } else {
          setError(r.error);
        }
      })();
    });
  };

  if (!company?.id) {
    return (
      <p className="p-4 text-sm text-muted-foreground" data-test-id="treasury-bank-no-company">
        No hay empresa configurada.
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-4 p-2 md:p-4" data-test-id="treasury-bank-tab-root">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <StatisticsCard
          compact
          label="Total en banco"
          value={fmtMoney(totalBank)}
          hint="Suma de saldos en cuentas activas"
          tone="primary"
          data-test-id="treasury-bank-total-card"
        />

        <TreasuryTransactionCard
          title="Aporte de capital"
          description="Ingreso del socio a la cuenta bancaria; aumenta el capital social."
          icon="TrendingUp"
          ariaLabel="Registrar aporte de capital"
          onOpen={() => openDialog("capital")}
          disabled={partnerOptions.length === 0 || bankOptions.length === 0}
          data-test-id="treasury-bank-action-capital"
        />

        <TreasuryTransactionCard
          title="Retiro de utilidades"
          description="Pago desde el banco al socio; puede incluir retención u otro impuesto."
          icon="TrendingDown"
          ariaLabel="Registrar retiro de utilidades"
          onOpen={() => openDialog("dividend")}
          disabled={partnerOptions.length === 0 || bankOptions.length === 0}
          data-test-id="treasury-bank-action-dividend"
        />

        <TreasuryTransactionCard
          title="Depósito de efectivo"
          description="Traslado desde caja física al saldo de la cuenta bancaria elegida."
          icon="Landmark"
          ariaLabel="Depósito desde caja a banco"
          onOpen={() => openDialog("deposit")}
          disabled={bankOptions.length === 0}
          data-test-id="treasury-bank-action-deposit"
        />

        <TreasuryTransactionCard
          title="Giro para caja"
          description="Retiro bancario para reponer efectivo en caja (fondo fijo o sencillo)."
          icon="Wallet"
          ariaLabel="Giro de banco a caja"
          onOpen={() => openDialog("petty")}
          disabled={bankOptions.length === 0}
          data-test-id="treasury-bank-action-petty"
        />
      </div>

      {accounts.length > 0 ? (
        <section className="min-h-0 space-y-3" data-test-id="treasury-bank-accounts-section">
          <h2 className="text-sm font-semibold text-foreground">Cuentas</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => {
              const key = treasuryBankAccountKey(a);
              const isSelected = selectedBankAccountKey != null && key === selectedBankAccountKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => selectBankAccount(key)}
                    className={`w-full rounded-lg border p-2 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                    aria-pressed={isSelected}
                    data-test-id={`treasury-bank-account-card-${key}`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] grid-rows-[auto_auto] gap-x-2 gap-y-0.5">
                      <div className="min-w-0 font-medium leading-tight">{a.bankName}</div>
                      <div className="col-start-1 row-start-2 min-w-0 text-xs leading-snug text-muted-foreground">
                        {a.accountNumber}
                        {a.isPrimary ? (
                          <span className="ml-1.5 text-[0.65rem] font-medium uppercase text-primary">
                            {" "}
                            · Principal
                          </span>
                        ) : null}
                      </div>
                      <div className="col-start-2 row-span-2 row-start-1 flex shrink-0 items-start justify-end self-start pt-0.5 text-right text-sm font-semibold tabular-nums leading-tight">
                        {fmtMoney(typeof a.currentBalance === "number" ? a.currentBalance : 0)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedBankAccountKey ? (
            <div className="min-h-0 pt-1" data-test-id="treasury-bank-movements-wrap">
              <TreasuryBankMovementsGrid rows={movementRows} total={movementsTotal} />
              {movementRows.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  No hay movimientos registrados para esta cuenta en el sistema.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">No hay cuentas bancarias en la empresa.</p>
      )}

      <Dialog
        open={dialog !== "none"}
        onClose={closeDialog}
        title={
          dialog === "capital"
            ? "Aporte de capital"
            : dialog === "dividend"
              ? "Retiro de utilidades"
              : dialog === "deposit"
                ? "Depósito de efectivo"
                : dialog === "petty"
                  ? "Giro para caja"
                  : ""
        }
        size="md"
        scroll="paper"
        alertArea={error ? <Alert variant="error">{error}</Alert> : null}
        actions={
          <>
            <Button variant="outlined" onClick={closeDialog} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={pending}
              onClick={() => {
                if (dialog === "capital") {
                  submitCapital();
                } else if (dialog === "dividend") {
                  submitDividend();
                } else if (dialog === "deposit") {
                  submitDeposit();
                } else if (dialog === "petty") {
                  submitPetty();
                }
              }}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {(dialog === "capital" || dialog === "dividend") && (
            <Select
              label="Socio"
              options={partnerOptions}
              value={partnerOpt}
              onChange={(id) => setPartnerOpt(id == null ? null : String(id).trim())}
              required
              placeholder="Seleccione socio"
            />
          )}
          <Select
            label={
              dialog === "deposit"
                ? "Cuenta bancaria destino"
                : dialog === "petty"
                  ? "Cuenta bancaria origen"
                  : "Cuenta bancaria"
            }
            options={bankOptions}
            value={bankOpt}
            onChange={(id) => setBankOpt(id == null ? null : String(id).trim())}
            required
            placeholder="Seleccione cuenta"
          />
          <TextField
            label="Monto"
            type="currency"
            currencySymbol="$"
            startSymbol="$"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            required
          />
          {dialog === "dividend" ? (
            <TextField
              label="Retención / impuesto (opcional)"
              value={taxStr}
              onChange={(e) => setTaxStr(e.target.value)}
              placeholder="Monto CLP"
            />
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
