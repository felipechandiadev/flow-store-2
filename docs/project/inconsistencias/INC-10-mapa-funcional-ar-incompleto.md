# INC-10 · Mapa funcional AR §3.2 incompleto

| Campo | Valor |
|-------|-------|
| **Severidad** | Media |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |
| **Relacionado** | [INC-11](./INC-11-criterio-modulo-activo-vs-huerfano.md) |

---

## Resumen

[ARQUITECTURA §3.2](../ARQUITECTURA_Y_ECOSISTEMA.md) resume módulos por área ERP de forma **incompleta** frente al catálogo en [MODULOS](../MODULOS_Y_SERVICIOS_BACKEND.md) (~68 módulos).

---

## Omisiones relevantes en AR §3.2

Módulos activos no mencionados o subrepresentados:

| Área | Omitidos (ejemplos) |
|------|---------------------|
| Ventas | `checks`, `installments`, `orders`, `quotations`, `promotions` |
| Compras | `supplier-guides` |
| Inventario | `recipes`, `metal-prices`, `attributes`, `brands` |
| Tesorería | `bank-accounts`, `bank-movements`, `bank-transfers`, `bank-withdrawals`, `cash-deposits`, `capital-contributions`, `petty-cash-withdrawals` |
| Plataforma | `analytics`, `automation`, `notifications`, `multimedia` |

---

## Impacto

- AR no sirve como mapa completo del backend
- Lectores pueden asumir que módulos no listados “no existen”

---

## Resolución propuesta

| Opción | Acción |
|--------|--------|
| **A** | AR §3.2: disclaimer + enlace a MODULOS como catálogo autoritativo |
| **B** | Ampliar tabla AR con todas las áreas (mantener resumida) |

Recomendación: **A** para evitar duplicar mantenimiento.

---

## Archivos clave

- `docs/project/ARQUITECTURA_Y_ECOSISTEMA.md` §3.2
- `docs/project/MODULOS_Y_SERVICIOS_BACKEND.md`

[← Índice](./README.md)
