# INC-04 · Pipeline contable — nombres y caminos mezclados

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |
| **Relacionado** | [DEUDA_CODIGO.md](./DEUDA_CODIGO.md) |

---

## Resumen

La documentación resume el motor contable como “`AccountingEngine` + `ledger-entries`”. En código hay **dos pipelines** con nombres que se confunden: el listener se llama `AccountingEngineListener` pero delega en `LedgerEntriesService`, que **no** invoca `AccountingEngine`.

---

## Pipeline 1 — Automático al crear transacción

```
TransactionsService.createTransaction()
    → emite evento 'transaction.created'
    → AccountingEngineListener (@OnEvent)
    → LedgerEntriesService.generateEntriesForTransaction()
    → persiste LedgerEntry
```

Archivos:

- `backend/src/shared/listeners/accounting-engine.listener.ts`
- `backend/src/modules/ledger-entries/application/ledger-entries.service.ts`

Casos especiales **dentro** de `LedgerEntriesService`:

- `PAYROLL` → `generatePayrollEntries()` (por línea haber/descuento)
- `PAYMENT_EXECUTION` → `generatePaymentExecutionEntries()`
- Reglas desde `accounting-rules` para el resto

---

## Pipeline 2 — Construcción manual / módulo accounting

```
accounting.service / build-ledger.command
    → buildLedger() en AccountingEngine.ts
    → asientos según reglas seed
```

Archivo: `backend/src/shared/application/AccountingEngine.ts`

---

## Qué dice la documentación (impreciso)

- AR §7: “Motor (`AccountingEngine` + `ledger-entries`)”
- MODULOS §9: generación vía `AccountingEngine` aplicando reglas

Sugiere un solo motor; en realidad hay duplicidad conceptual.

---

## Impacto

- Debugging contable: buscar en `AccountingEngine` no explica asientos automáticos post-venta
- Riesgo de “arreglar” el archivo equivocado al extender reglas
- Onboarding confuso

---

## Resolución propuesta

| Ámbito | Acción |
|--------|--------|
| **Documentación** | Diagrama con dos pipelines; renombrar en prosa: listener ≠ `AccountingEngine` |
| **Código (futuro)** | Evaluar converger lógica duplicada (deuda, no urgente doc) |

---

## Archivos clave

- `backend/src/shared/application/AccountingEngine.ts`
- `backend/src/shared/listeners/accounting-engine.listener.ts`
- `backend/src/modules/ledger-entries/application/ledger-entries.service.ts`
- `backend/src/modules/accounting/application/accounting.service.ts`

[← Índice](./README.md)
