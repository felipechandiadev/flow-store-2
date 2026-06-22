# INC-07 · Catálogo `TransactionType` incompleto en MODULOS

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica (completitud) |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

[MODULOS §3.1](../MODULOS_Y_SERVICIOS_BACKEND.md) documenta una tabla de `TransactionType` que **no es exhaustiva** respecto al enum en código. Quien use solo la doc omitirá tipos válidos.

---

## Fuente autoritativa

`backend/src/modules/transactions/domain/transaction.entity.ts` — enum `TransactionType`.

---

## Tipos documentados en MODULOS pero incompletos

La tabla MODULOS cubre la mayoría de familias; omite explícitamente o agrupa de forma que pierde detalle.

### Omitidos en MODULOS (presentes en código)

| Tipo | Uso breve |
|------|-----------|
| `VOID_ADJUSTMENT` | Anulación trazable con metadata |
| `SUPPLIER_HONORARIUM_RECEIPT` | Boleta honorarios proveedor |
| `SUPPLIER_GUIDE` | Guía despacho proveedor |
| `SUPPLIER_CREDIT_NOTE` | NC proveedor |
| `CUSTOMER_CREDIT_NOTE_PAYOUT` | Pago NC cliente en caja |

(Otros pueden estar agrupados bajo descripciones genéricas.)

---

## Impacto

- Integraciones y reglas contables que referencien tipos “no documentados”
- Mantenimiento: doc y enum divergen con cada nuevo tipo

---

## Resolución propuesta

| Opción | Acción |
|--------|--------|
| **A (recomendada)** | MODULOS §3.1: enlace al enum en repo como referencia autoritativa + tabla resumida por familia |
| **B** | Tabla completa generada/sync manual con cada valor del enum |

---

## Archivos clave

- `backend/src/modules/transactions/domain/transaction.entity.ts`
- `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md` §3.1

[← Índice](./README.md)
