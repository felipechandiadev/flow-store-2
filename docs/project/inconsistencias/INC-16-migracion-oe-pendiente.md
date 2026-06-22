# INC-16 · Migración OE — esquema documentado vs entornos sin migrar

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor (operativo) |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

La documentación describe el modelo rediseñado de gastos operativos (`documentKind`, `paymentStatus`, FKs). Requiere migración TypeORM que puede no estar aplicada en todos los entornos locales.

---

## Migración

| Campo | Valor |
|-------|-------|
| Archivo | `backend/src/migrations/1756500000000-OperationalExpenseDocumentKindAndPaymentStatus.ts` |
| Registro | `backend/src/config/data-source.ts` |
| Comando | `cd backend && npm run migration:run` |

Columnas agregadas a `operational_expenses`:

- `documentKind`
- `paymentStatus`
- `supplierFiscalDocumentTransactionId`
- `operatingExpenseTransactionId`

---

## Síntomas sin migración

- Errores SQL “column does not exist” al crear/listar OE
- Validación DTO OK pero fallo en persistencia

---

## Resolución

AR §9 (Datos y operaciones): nota explícita — ejecutar migraciones antes de probar flujo OE rediseñado (§6.3).

[← Índice](./README.md) · [INC-09](./INC-09-gastos-operativos-modelo-pagos.md)
