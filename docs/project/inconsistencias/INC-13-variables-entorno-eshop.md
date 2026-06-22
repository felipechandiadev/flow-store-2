# INC-13 · Variables de entorno eShop

| Campo | Valor |
|-------|-------|
| **Severidad** | Menor |
| **Estado** | Abierta |
| **Detectado** | junio 2026 |

---

## Resumen

AR §5.3 menciona genéricamente `NEXT_PUBLIC_ESHOP_*`. El `.env.example` de eShop define nombres concretos.

---

## Documentación

[ARQUITECTURA §5.3](../ARQUITECTURA_Y_ECOSISTEMA.md):

> Un deploy = una tienda (`NEXT_PUBLIC_ESHOP_*` / config empresa)

---

## Código (`pwa-eshop/.env.example`)

| Variable | Propósito |
|----------|-----------|
| `BACKEND_API_URL` | API backend (server) |
| `NEXT_PUBLIC_BACKEND_API_URL` | API backend (cliente) |
| `NEXT_PUBLIC_ESHOP_STORE_SLUG` | Slug público de la empresa/tienda |
| `NEXT_PUBLIC_ESHOP_SITE_URL` | URL canónica (OG, compartir) |
| `NEXT_PUBLIC_APP_NAME` | Nombre mostrado |
| `NEXT_PUBLIC_APP_VERSION` | Versión app |

---

## Resolución

Reemplazar placeholder genérico en AR por tabla de variables reales + enlace a `.env.example`.

[← Índice](./README.md)
