# INC-12 · “Server Actions only” — alcance no delimitado para eShop

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

[ARQUITECTURA §5](../ARQUITECTURA_Y_ECOSISTEMA.md) establece Server Actions Only para PWAs admin/POS/stock. No aclara el patrón de **pwa-eshop**, que difiere.

---

## Código eShop

- `pwa-eshop/src/features/e-shop-storefront/infrastructure/eshop.request.ts` — `fetch` directo al backend
- No usa el patrón `"use server"` + actions + use cases del admin
- Es tienda pública; auth distinta (endpoints `e-shop/*`)

---

## Admin/POS/stock (referencia correcta)

```
UI → Server Actions (*.action.ts) → use cases → infrastructure (*.request.ts) → API
```

Prohibido `fetch` en componentes cliente (reglas en `.instructions/webadmin.instruction`).

---

## Resolución

AR §5: subsección **“Alcance por app”**:

| App | Patrón |
|-----|--------|
| `pwa-admin`, `pwa-pos`, `pwa-stock` | Server Actions only |
| `pwa-eshop` | Fetch en capa infra (`*.request.ts`); RSC/actions donde aplique, sin imponer paridad total con admin |

[← Índice](./README.md)
