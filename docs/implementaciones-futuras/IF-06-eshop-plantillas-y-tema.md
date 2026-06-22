# IF-06 · eShop — plantillas y tema dinámico

| Campo | Valor |
|-------|-------|
| **ID** | IF-06 |
| **Estado** | F1 entregado (junio 2026) |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |
| **Tareas** | [ROADMAP.md § IF-06](./ROADMAP.md#if-06--eshop-plantillas-y-tema) |

---

## 1. Resumen ejecutivo

Cada empresa KaiStore puede personalizar la **apariencia** de su tienda en línea (`pwa-eshop`) eligiendo una **plantilla** (preset de colores) y opcionalmente **sobrescribiendo tokens** (primary, secondary, etc.). El layout de páginas se mantiene igual en F1; solo cambian variables CSS.

| Capa | F1 (entregado) | Futuro |
|------|----------------|--------|
| Colores / tokens | Presets + overrides en BD | — |
| Layout home alternativo | Mismo layout | F2 |
| Tipografía por tienda | Inter + League Spartan fijas | F3 |
| Page builder | — | F4 (pospuesto) |

**Principio:** `templateId` en código + `tokenOverrides` en `companies.settings`; **nunca** CSS libre en base de datos.

---

## 2. Modelo de datos

### 2.1 Persistencia (`companies.settings`)

| Clave | Tipo | Descripción |
|-------|------|-------------|
| `eShopTemplateId` | `classic` \| `minimal` \| `bold` \| `warm` | Plantilla activa |
| `eShopThemeTokenOverrides` | `Record<string, string>` | Solo hex `#RRGGBB` en claves permitidas |

### 2.2 Tokens resueltos

`resolveEShopTheme(settings)` fusiona preset + overrides → objeto `theme` en `GET /e-shop/storefront`:

```json
{
  "templateId": "minimal",
  "tokens": {
    "primary": "#1f2937",
    "secondary": "#4b5563",
    "background": "#ffffff",
    "foreground": "#111827",
    "accent": "#374151",
    "border": "#e5e7eb",
    "surface": "#ffffff",
    "active": "#374151",
    "muted": "#9ca3af",
    "mutedForeground": "#6b7280"
  }
}
```

Código: [`backend/.../company-eshop-theme.types.ts`](../../backend/src/modules/companies/domain/company-eshop-theme.types.ts), presets en [`eshop-theme-presets.ts`](../../backend/src/modules/companies/domain/eshop-theme-presets.ts).

---

## 3. API

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/e-shop/storefront` | Público — incluye `theme` resuelto |
| `GET` | `/companies/:id/eshop-theme` | Admin — theme + resolved + catálogo presets |
| `PATCH` | `/companies/:id/eshop-theme` | Admin — guardar `templateId` y overrides |

---

## 4. Aplicación en `pwa-eshop`

1. [`(store)/layout.tsx`](../../pwa-eshop/src/app/(store)/layout.tsx) obtiene storefront (incluye `theme`).
2. [`EShopThemeShell`](../../pwa-eshop/src/features/e-shop-storefront/ui/EShopThemeShell.tsx) inyecta `--fs-*` y `--color-*` como `style` inline.
3. [`globals.css`](../../pwa-eshop/src/app/globals.css) mantiene fallback `classic` si la API no envía tema.
4. `revalidate = 60` en layout store para refresco periódico sin redeploy.

---

## 5. Admin

- Ruta: **`/e-shop/appearance`** (`pwa-admin`)
- Menú eShop → **Apariencia**
- Feature: `pwa-admin/src/features/e-shop-appearance/`
- UX: grid de plantillas + color pickers + mini preview

---

## 6. Plantillas preset (F1)

| ID | Descripción |
|----|-------------|
| `classic` | Azul marino + cyan (identidad KaiStore actual) |
| `minimal` | Neutros, retail limpio |
| `bold` | Alto contraste, acento ámbar |
| `warm` | Tonos tierra |

---

## 7. Fases futuras

| Fase | Contenido |
|------|-----------|
| **F2** | Layouts home alternativos (`templateId` selecciona componente layout) |
| **F3** | `fontPreset` whitelist, `borderRadius`, dark mode por tienda |
| **F4** | Page builder — fuera de roadmap cercano |

---

## 8. Criterios de aceptación F1

1. Admin cambia a `minimal` y guarda → eShop refleja colores sin redeploy.
2. Override de `primary` persiste en topbar, botones y footer.
3. Empresa sin tema configurado usa `classic` (paridad visual anterior).
4. Sin CSS arbitrario en BD; solo JSON validado.

---

## 9. Referencias

- [ARQUITECTURA §5.3](../project/ARQUITECTURA_Y_ECOSISTEMA.md)
- [KAISTORE_E-SHOP_DEVELOPMENT_GUIDE](../legacy/KAISTORE_E-SHOP_DEVELOPMENT_GUIDE.md)

[← Índice](./README.md) · [Roadmap IF-06](./ROADMAP.md#if-06--eshop-plantillas-y-tema)
