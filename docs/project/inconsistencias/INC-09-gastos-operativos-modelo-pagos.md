# INC-09 · Gastos operativos — modelo de materialización de pagos

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Estado** | Legacy obsoleto |
| **Detectado** | junio 2026 |

---

## Resumen

Legacy describe materialización de pagos OE vía `linkedTributaryDocument.plannedPayments`. El flujo actual usa `documentKind` y servicios en `transactions`.

---

## Legacy (obsoleto)

[CUENTAS_POR_PAGAR_MODELO.md](../../legacy/CUENTAS_POR_PAGAR_MODELO.md):

> Gastos operativos: `linkedTributaryDocument.plannedPayments` materializa hijos al crear

---

## Código actual (project docs correctas)

[ARQUITECTURA §6.3](../ARQUITECTURA_Y_ECOSISTEMA.md) / [MODULOS §8](../MODULOS_Y_SERVICIOS_BACKEND.md):

| `documentKind` | Pipeline |
|----------------|----------|
| Fiscal (`SUPPLIER_INVOICE`, `RECEIPT`, `HONORARIUM`) | `SupplierFiscalDocumentCreateService` → DTE + `SUPPLIER_PAYMENT` |
| `OTHER` | `OperatingExpensePaymentPlanService` → `OPERATING_EXPENSE` + `EXPENSE_PAYMENT` |

`linkedTributaryDocument` permanece en `OperationalExpenseMetadata` para **lectura** de registros antiguos (`operational-expenses.service.ts` ramas legacy en display).

Migración: `1756500000000-OperationalExpenseDocumentKindAndPaymentStatus.ts` — campos `documentKind`, `paymentStatus`, FKs.

---

## Impacto

- Payloads/API documentados en legacy no coinciden con `CreateOperationalExpenseDto` actual
- Integraciones basadas en legacy fallarán validación

---

## Resolución

| Ámbito | Acción |
|--------|--------|
| **Legacy CUENTAS_POR_PAGAR** | Actualizar sección OE o referenciar project §6.3 |
| **Project** | Mantener como referencia |

---

## Archivos clave

- `backend/src/modules/operational-expenses/application/operational-expenses.service.ts`
- `backend/src/modules/transactions/application/services/operating-expense-payment-plan.service.ts`
- `backend/src/modules/transactions/application/services/supplier-fiscal-document-create.service.ts`

[← Índice](./README.md)
