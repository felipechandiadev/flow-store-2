"use client";

import { useEffect, useMemo, useState } from "react";
import Dialog from "@/shared/components/Dialog/Dialog";
import { Button } from "@/shared/components/Button";
import { Select } from "@/shared/components/Select";
import { TextField } from "@/shared/components/TextField/TextField";
import Alert from "@/shared/components/Alert/Alert";
import {
  createPromotionAction,
  getPromotionAction,
  updatePromotionAction,
} from "@/features/promotions/actions/promotions.action";
import {
  PROMOTION_ACTIVATION_LABEL,
  PROMOTION_AUTHORIZATION_LABEL,
  PROMOTION_TYPE_LABEL,
  type CreatePromotionInput,
  type PromotionActivation,
  type PromotionAuthorization,
  type PromotionType,
} from "@/features/promotions/types/promotion.types";

type Props = {
  open: boolean;
  promotionId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type TabKey =
  | "general"
  | "validity"
  | "applicability"
  | "locations"
  | "limits"
  | "accounting";

const TABS: { id: TabKey; label: string }[] = [
  { id: "general", label: "General" },
  { id: "validity", label: "Vigencia" },
  { id: "applicability", label: "Aplicabilidad" },
  { id: "locations", label: "Sucursales y PV" },
  { id: "limits", label: "Límites y autorización" },
  { id: "accounting", label: "Contabilidad" },
];

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
];

const DEFAULT_INPUT: CreatePromotionInput = {
  name: "",
  description: "",
  type: "PERCENT_ON_LINE",
  value: 0,
  maxValue: null,
  isActive: true,
  validFrom: null,
  validUntil: null,
  activation: "AUTO",
  redemptionCode: null,
  stackable: true,
  priority: 0,
  minSubtotal: null,
  minQuantity: null,
  daysOfWeek: null,
  hourFrom: null,
  hourTo: null,
  maxUsesTotal: null,
  maxUsesPerCustomer: null,
  authorization: "NONE",
  authorizationLimitPct: null,
  buyQuantity: null,
  getQuantity: null,
  getDiscountPercent: 100,
  preloadOnPaymentScreen: false,
  displayOrder: 0,
  accountingTag: null,
  scopes: {
    branches: [],
    pointsOfSale: [],
    products: [],
    variants: [],
    categories: [],
    customers: [],
    paymentMethods: [],
  },
};

export function PromotionEditorDialog({
  open,
  promotionId,
  onClose,
  onSaved,
}: Props) {
  const [tab, setTab] = useState<TabKey>("general");
  const [input, setInput] = useState<CreatePromotionInput>(DEFAULT_INPUT);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab("general");
    setError(null);
    if (!promotionId) {
      setInput(DEFAULT_INPUT);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await getPromotionAction(promotionId);
      if (cancelled) return;
      if (res.success) {
        const p = res.promotion;
        setInput({
          name: p.name,
          description: p.description,
          type: p.type,
          value: p.value,
          maxValue: p.maxValue,
          isActive: p.isActive,
          validFrom: p.validFrom ? p.validFrom.slice(0, 10) : null,
          validUntil: p.validUntil ? p.validUntil.slice(0, 10) : null,
          activation: p.activation,
          redemptionCode: p.redemptionCode,
          stackable: p.stackable,
          priority: p.priority,
          minSubtotal: p.minSubtotal,
          minQuantity: p.minQuantity,
          daysOfWeek: p.daysOfWeek,
          hourFrom: p.hourFrom,
          hourTo: p.hourTo,
          maxUsesTotal: p.maxUsesTotal,
          maxUsesPerCustomer: p.maxUsesPerCustomer,
          authorization: p.authorization,
          authorizationLimitPct: p.authorizationLimitPct,
          buyQuantity: p.buyQuantity,
          getQuantity: p.getQuantity,
          getDiscountPercent: p.getDiscountPercent,
          preloadOnPaymentScreen: p.preloadOnPaymentScreen,
          displayOrder: p.displayOrder,
          accountingTag: p.accountingTag,
          scopes: p.scopes,
        });
      } else {
        setError(res.error);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, promotionId]);

  const typeOptions = useMemo(
    () =>
      Object.entries(PROMOTION_TYPE_LABEL).map(([id, label]) => ({ id, label })),
    [],
  );
  const activationOptions = useMemo(
    () =>
      Object.entries(PROMOTION_ACTIVATION_LABEL).map(([id, label]) => ({
        id,
        label,
      })),
    [],
  );
  const authorizationOptions = useMemo(
    () =>
      Object.entries(PROMOTION_AUTHORIZATION_LABEL).map(([id, label]) => ({
        id,
        label,
      })),
    [],
  );

  function patch<K extends keyof CreatePromotionInput>(
    key: K,
    value: CreatePromotionInput[K],
  ) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function toggleDayOfWeek(d: number) {
    setInput((prev) => {
      const current = prev.daysOfWeek ?? [];
      const next = current.includes(d)
        ? current.filter((x) => x !== d)
        : [...current, d].sort();
      return { ...prev, daysOfWeek: next.length === 7 ? null : next };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: CreatePromotionInput = {
        ...input,
        name: input.name.trim(),
        validFrom: input.validFrom || null,
        validUntil: input.validUntil || null,
        redemptionCode:
          input.activation === "CODE_ENTRY" ? input.redemptionCode || null : null,
      };
      const res = promotionId
        ? await updatePromotionAction(promotionId, payload)
        : await createPromotionAction(payload);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error);
      }
    } finally {
      setSaving(false);
    }
  }

  const isPercent = input.type === "PERCENT_ON_LINE" || input.type === "PERCENT_ON_ORDER";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={promotionId ? "Editar promoción" : "Nueva promoción"}
      size="xl"
      scroll="paper"
      maxHeight="90vh"
      actions={
        <>
          <Button variant="outlinedSecondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
      alertArea={
        error ? (
          <Alert variant="error">{error}</Alert>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <nav className="flex flex-wrap gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm transition-colors ${
                tab === t.id
                  ? "border-b-2 border-primary font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-test-id={`promotion-editor-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <>
            {tab === "general" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Nombre"
                  required
                  value={input.name}
                  onChange={(e) =>
                    patch(
                      "name",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value,
                    )
                  }
                />
                <Select
                  label="Tipo"
                  options={typeOptions}
                  value={input.type}
                  onChange={(v) => patch("type", v as PromotionType)}
                />
                <TextField
                  label={isPercent ? "Valor (%)" : "Valor"}
                  type="number"
                  value={String(input.value)}
                  onChange={(e) =>
                    patch(
                      "value",
                      Number(
                        (e as React.ChangeEvent<HTMLInputElement>).target.value,
                      ) || 0,
                    )
                  }
                />
                <div>
                  <TextField
                    label="Tope máximo (opcional)"
                    type="number"
                    value={input.maxValue == null ? "" : String(input.maxValue)}
                    onChange={(e) => {
                      const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                      patch("maxValue", raw === "" ? null : Number(raw));
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Máximo monto a descontar por aplicación
                  </p>
                </div>
                <div>
                  <TextField
                    label="Prioridad"
                    type="number"
                    value={String(input.priority ?? 0)}
                    onChange={(e) =>
                      patch(
                        "priority",
                        Number(
                          (e as React.ChangeEvent<HTMLInputElement>).target.value,
                        ) || 0,
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Mayor número = evaluada primero
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promotion-stackable"
                    checked={input.stackable ?? true}
                    onChange={(e) => patch("stackable", e.target.checked)}
                  />
                  <label htmlFor="promotion-stackable" className="text-sm">
                    Combinable con otras promociones
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promotion-active"
                    checked={input.isActive ?? true}
                    onChange={(e) => patch("isActive", e.target.checked)}
                  />
                  <label htmlFor="promotion-active" className="text-sm">
                    Activa
                  </label>
                </div>
                <TextField
                  className="sm:col-span-2"
                  label="Descripción (opcional)"
                  value={input.description ?? ""}
                  onChange={(e) =>
                    patch(
                      "description",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value,
                    )
                  }
                />

                {input.type === "BUY_X_GET_Y" && (
                  <>
                    <TextField
                      label="Cantidad a comprar"
                      type="number"
                      value={
                        input.buyQuantity == null ? "" : String(input.buyQuantity)
                      }
                      onChange={(e) =>
                        patch(
                          "buyQuantity",
                          Number(
                            (e as React.ChangeEvent<HTMLInputElement>).target
                              .value,
                          ) || null,
                        )
                      }
                    />
                    <TextField
                      label="Cantidad de regalo"
                      type="number"
                      value={
                        input.getQuantity == null ? "" : String(input.getQuantity)
                      }
                      onChange={(e) =>
                        patch(
                          "getQuantity",
                          Number(
                            (e as React.ChangeEvent<HTMLInputElement>).target
                              .value,
                          ) || null,
                        )
                      }
                    />
                    <TextField
                      label="% descuento sobre regalo (100 = gratis)"
                      type="number"
                      value={String(input.getDiscountPercent ?? 100)}
                      onChange={(e) =>
                        patch(
                          "getDiscountPercent",
                          Number(
                            (e as React.ChangeEvent<HTMLInputElement>).target
                              .value,
                          ) || 100,
                        )
                      }
                    />
                  </>
                )}
              </div>
            )}

            {tab === "validity" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  label="Activación"
                  options={activationOptions}
                  value={input.activation}
                  onChange={(v) => patch("activation", v as PromotionActivation)}
                />
                {input.activation === "CODE_ENTRY" && (
                  <TextField
                    label="Cupón"
                    required
                    value={input.redemptionCode ?? ""}
                    onChange={(e) =>
                      patch(
                        "redemptionCode",
                        (e as React.ChangeEvent<HTMLInputElement>).target.value,
                      )
                    }
                  />
                )}
                <TextField
                  label="Válida desde"
                  type="date"
                  value={input.validFrom ?? ""}
                  onChange={(e) =>
                    patch(
                      "validFrom",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value ||
                        null,
                    )
                  }
                />
                <TextField
                  label="Válida hasta"
                  type="date"
                  value={input.validUntil ?? ""}
                  onChange={(e) =>
                    patch(
                      "validUntil",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value ||
                        null,
                    )
                  }
                />
                <TextField
                  label="Hora desde (HH:MM)"
                  value={input.hourFrom ?? ""}
                  onChange={(e) =>
                    patch(
                      "hourFrom",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value ||
                        null,
                    )
                  }
                />
                <TextField
                  label="Hora hasta (HH:MM)"
                  value={input.hourTo ?? ""}
                  onChange={(e) =>
                    patch(
                      "hourTo",
                      (e as React.ChangeEvent<HTMLInputElement>).target.value ||
                        null,
                    )
                  }
                />
                <div className="sm:col-span-2">
                  <p className="mb-2 text-sm font-medium text-foreground">
                    Días de la semana
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((d) => {
                      const active =
                        input.daysOfWeek == null || input.daysOfWeek.includes(d.value);
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => toggleDayOfWeek(d.value)}
                          className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si todos están seleccionados aplica todos los días.
                  </p>
                </div>
              </div>
            )}

            {tab === "applicability" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Subtotal mínimo del carrito"
                  type="number"
                  value={input.minSubtotal == null ? "" : String(input.minSubtotal)}
                  onChange={(e) => {
                    const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                    patch("minSubtotal", raw === "" ? null : Number(raw));
                  }}
                />
                <TextField
                  label="Cantidad mínima de unidades"
                  type="number"
                  value={input.minQuantity == null ? "" : String(input.minQuantity)}
                  onChange={(e) => {
                    const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                    patch("minQuantity", raw === "" ? null : Number(raw));
                  }}
                />
                <div className="sm:col-span-2 rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  Los scopes detallados (productos, categorías, clientes, métodos de pago) se editan directamente en BD vía API en esta versión. La UI completa de pickers llegará en una próxima iteración.
                </div>
              </div>
            )}

            {tab === "locations" && (
              <div className="rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                Los scopes de sucursales y puntos de venta también se administran vía API en esta versión. Sin restricciones explícitas la promoción aplica en TODAS las sucursales y puntos de venta de la empresa.
              </div>
            )}

            {tab === "limits" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Usos totales máximos"
                  type="number"
                  value={
                    input.maxUsesTotal == null ? "" : String(input.maxUsesTotal)
                  }
                  onChange={(e) => {
                    const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                    patch("maxUsesTotal", raw === "" ? null : Number(raw));
                  }}
                />
                <TextField
                  label="Usos por cliente"
                  type="number"
                  value={
                    input.maxUsesPerCustomer == null
                      ? ""
                      : String(input.maxUsesPerCustomer)
                  }
                  onChange={(e) => {
                    const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                    patch("maxUsesPerCustomer", raw === "" ? null : Number(raw));
                  }}
                />
                <Select
                  label="Autorización requerida"
                  options={authorizationOptions}
                  value={input.authorization ?? "NONE"}
                  onChange={(v) => patch("authorization", v as PromotionAuthorization)}
                />
                {input.authorization === "CASHIER" && (
                  <TextField
                    label="Límite máximo permitido al cajero (%)"
                    type="number"
                    value={
                      input.authorizationLimitPct == null
                        ? ""
                        : String(input.authorizationLimitPct)
                    }
                    onChange={(e) => {
                      const raw = (e as React.ChangeEvent<HTMLInputElement>).target.value;
                      patch(
                        "authorizationLimitPct",
                        raw === "" ? null : Number(raw),
                      );
                    }}
                  />
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="promotion-preload"
                    checked={input.preloadOnPaymentScreen ?? false}
                    onChange={(e) =>
                      patch("preloadOnPaymentScreen", e.target.checked)
                    }
                  />
                  <label htmlFor="promotion-preload" className="text-sm">
                    Sugerir automáticamente en pantalla de pago
                  </label>
                </div>
              </div>
            )}

            {tab === "accounting" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <TextField
                    label="Etiqueta contable"
                    value={input.accountingTag ?? ""}
                    onChange={(e) =>
                      patch(
                        "accountingTag",
                        (e as React.ChangeEvent<HTMLInputElement>).target.value ||
                          null,
                      )
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Referencia a regla contable con AmountMode=DISCOUNT
                  </p>
                </div>
                <TextField
                  label="Orden de visualización"
                  type="number"
                  value={String(input.displayOrder ?? 0)}
                  onChange={(e) =>
                    patch(
                      "displayOrder",
                      Number(
                        (e as React.ChangeEvent<HTMLInputElement>).target.value,
                      ) || 0,
                    )
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
