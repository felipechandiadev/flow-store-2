# INC-01 · `RECEPTION` no es un `TransactionType`

| Campo | Valor |
|-------|-------|
| **Severidad** | Crítica (error documental) |
| **Estado** | Abierta (solo doc) |
| **Detectado** | junio 2026 |
| **Ámbito código** | Ninguno — diseño correcto |

---

## Resumen

La documentación listaba `RECEPTION` como tipo transaccional en compras/DTE. En código **no existe** `TransactionType.RECEPTION`. La recepción es un **documento de negocio** que orquesta transacciones tipadas. **No** se debe agregar ese enum.

---

## Qué dice la documentación (incorrecto)

[ARQUITECTURA_Y_ECOSISTEMA.md §3.1](../ARQUITECTURA_Y_ECOSISTEMA.md) incluye `RECEPTION` en la fila “Compras / DTE” junto a `SUPPLIER_INVOICE`, etc.

---

## Qué hace el código (fuente de verdad)

### Entidad de negocio

- Tabla `receptions`, entidad `Reception` + `ReceptionLine`
- Módulo: `backend/src/modules/receptions/`
- API: `GET/POST /api/receptions`

Comentario en entidad:

```19:31:backend/src/modules/receptions/domain/reception.entity.ts
 * Cada recepción genera una transacción PURCHASE que activa:
 * - Actualización de inventario
 * - Creación de cuentas por pagar (installments)
 * - Asientos contables
```

### Transacciones que materializa

| Rol | `TransactionType` |
|-----|-------------------|
| Stock / compra | `PURCHASE` |
| DTE factura | `SUPPLIER_INVOICE` |
| DTE boleta | `SUPPLIER_RECEIPT` |
| Cuotas CxP | `SUPPLIER_PAYMENT` |
| Ajuste puntual | `ADJUSTMENT_IN` |

Trazabilidad: `metadata.origin: 'RECEPTION'` en transacciones hijas.

### Modelo acordado

```
Reception (registro en `receptions`)
    ├── PURCHASE
    ├── SUPPLIER_INVOICE | SUPPLIER_RECEIPT
    └── SUPPLIER_PAYMENT
```

Patrón análogo a `operational_expenses` → `OPERATING_EXPENSE` / DTE, y liquidaciones → `PAYROLL`.

---

## Impacto

- Desarrolladores podrían buscar `TransactionType.RECEPTION` o proponer agregarlo innecesariamente.
- Confusión entre “recepción física” y “documento contable”.

---

## Resolución

| Ámbito | Acción |
|--------|--------|
| **Documentación** | Quitar `RECEPTION` de tablas de tipos; describir módulo `receptions` y tipos que dispara |
| **Código** | Ninguna |

---

## Archivos clave

- `backend/src/modules/receptions/domain/reception.entity.ts`
- `backend/src/modules/receptions/application/receptions.service.ts`
- `backend/src/modules/transactions/domain/transaction.entity.ts` (enum sin `RECEPTION`)

[← Índice](./README.md)
