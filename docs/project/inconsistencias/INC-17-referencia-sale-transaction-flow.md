# INC-17 · Referencia condicional a `SALE_TRANSACTION_FLOW.md`

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

[MODULOS §16](../MODULOS_Y_SERVICIOS_BACKEND.md) referencia `backend/docs/SALE_TRANSACTION_FLOW.md` con condicional “si existe en repo”. El archivo **existe**.

---

## Evidencia

Ruta confirmada: `backend/docs/SALE_TRANSACTION_FLOW.md`

Contenido: flujo de venta POS / transacciones (complemento al módulo `cash-sessions` y `transactions`).

---

## Resolución

MODULOS §16: enlace directo markdown:

```markdown
| [backend/docs/SALE_TRANSACTION_FLOW.md](../../../backend/docs/SALE_TRANSACTION_FLOW.md) | Flujo de venta POS |
```

Eliminar “si existe”.

[← Índice](./README.md)
