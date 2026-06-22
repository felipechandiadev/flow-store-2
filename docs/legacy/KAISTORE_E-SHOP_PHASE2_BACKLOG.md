# KaiStore eShop — Fase 2+ (backlog)

Documento de seguimiento para ítems fuera del MVP implementado en Fase 0–1.

## Plataforma

- [ ] Electron + `electron-updater` para `pwa-eshop`
- [ ] `GET /api/app-versions` (versión mínima por app)
- [ ] Deep links `kaistore-eshop://`

## Envíos propio

- [ ] Entidades `shipping_zones`, `shipping_rate_rules`, `shipping_fuel_config`
- [ ] Geocodificación + distancia (Haversine / OSRM)
- [ ] Admin `/e-shop/shipping` completo
- [ ] Checkout con `eShopShippingMode: flat | distance`

## Tienda

- [ ] `GET /api/e-shop/cart/suggestions` (cross-sell server-side)
- [ ] Mapa Leaflet embebido en home y `/donde-estamos`
- [ ] Cuenta comprador + historial
- [ ] Pasarela Webpay
- [ ] SEO / sitemap / Open Graph por producto
- [ ] Multimedia en marcas (UI `UpdateBrandDialog`)
- [ ] Fotos empleados / página equipo

## Catálogo

- [ ] Admin UI para `eShopFeaturedProductVariantIds` (multiselect variantes)
- [ ] Flag `visibleInEShop` en formulario de variante admin
