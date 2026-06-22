# IF-07 · eShop — Topbar y Footer administrables

| Campo | Valor |
|-------|-------|
| **ID** | IF-07 |
| **Estado** | F1 entregado (junio 2026) |
| **Prioridad** | P1 |
| **Última revisión** | junio 2026 |
| **Tareas** | [ROADMAP.md § IF-07](./ROADMAP.md#if-07--eshop-topbar-y-footer) |

---

## 1. Resumen

Permite configurar **contenido y estructura** de la barra superior y el pie de página del eShop desde admin, sin tocar código. Los **colores** siguen en [IF-06](./IF-06-eshop-plantillas-y-tema.md) (token `chrome` en Apariencia).

| Pantalla admin | Ruta | Responsabilidad |
|----------------|------|-----------------|
| Topbar | `/e-shop/topbar` | Enlaces nav, toggles logo/nombre/carrito |
| Footer | `/e-shop/footer` | Columnas de enlaces, toggles de bloques, copyright |
| Apariencia | `/e-shop/appearance` | Colores `chrome` (topbar + footer) |
| Empresa | `/settings/company` | Tagline, manifiesto, contacto, redes (referencia) |

---

## 2. Modelo de datos

### `companies.settings.eShopTopBar`

```typescript
{
  showLogo: boolean;
  showCompanyName: boolean;
  showCart: boolean;
  navLinks: EShopNavLink[];
}
```

### `companies.settings.eShopFooter`

```typescript
{
  showLogo: boolean;
  showTagline: boolean;
  showBrandManifest: boolean;
  showContactBlock: boolean;
  showSocialLinks: boolean;
  copyrightSuffix?: string;
  linkGroups: EShopFooterLinkGroup[];
}
```

### `EShopNavLink`

| Campo | Descripción |
|-------|-------------|
| `kind` | `route` \| `anchor` \| `external` |
| `href` | Ruta interna, `#ancla` o `https://` |
| `enabled` | Visible en tienda |
| `order` | Orden de visualización |

Código: [`company-eshop-nav.types.ts`](../../backend/src/modules/companies/domain/company-eshop-nav.types.ts), [`company-eshop-topbar.types.ts`](../../backend/src/modules/companies/domain/company-eshop-topbar.types.ts), [`company-eshop-footer.types.ts`](../../backend/src/modules/companies/domain/company-eshop-footer.types.ts).

---

## 3. API

| Método | Ruta | Uso |
|--------|------|-----|
| GET/PATCH | `/companies/:id/eshop-topbar` | Admin topbar |
| GET/PATCH | `/companies/:id/eshop-footer` | Admin footer |
| GET | `/e-shop/storefront` | Público — incluye `topBar` y `footer` |

---

## 4. eShop

- [`EShopTopBar`](../../pwa-eshop/src/shared/components/EShopTopBar.tsx) — nav dinámico desktop
- [`EShopMobileNav`](../../pwa-eshop/src/shared/components/EShopMobileNav.tsx) — menú hamburger `< md`
- [`EShopFooter`](../../pwa-eshop/src/shared/components/EShopFooter.tsx) — columnas dinámicas + bloques por toggle

Sin config guardada → defaults idénticos al comportamiento previo a IF-07.

---

## 5. Criterios de aceptación

1. Admin reordena enlaces topbar → desktop y móvil reflejan el orden.
2. Admin desactiva carrito → no aparece en topbar.
3. Admin añade grupos en footer → columnas visibles en tienda.
4. Toggles tagline/contacto ocultan bloques sin borrar datos de empresa.
5. Colores solo desde Apariencia (`chrome`).

---

## 6. Relación con IF-06

| IF-06 | IF-07 |
|-------|-------|
| Plantillas y tokens de color | Enlaces y estructura de shell |
| `chrome` topbar/footer | Contenido sobre ese fondo |

[← Índice](./README.md)
