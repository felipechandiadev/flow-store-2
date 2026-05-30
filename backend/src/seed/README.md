# Backend seed

## Seed de desarrollo (por defecto)

```bash
cd backend
npm run seed
```

Crea **Mi Empresa** con catálogo genérico multi-rubro (~20 variantes), 5 categorías, 5 marcas, 2 listas de precio (minorista/mayorista), 2 POS, 2 cuentas bancarias, 2 centros de efectivo, 2 socios genéricos, 10 clientes y 10 proveedores.

Variables opcionales de empresa: `SEED_COMPANY_RAZON_SOCIAL`, `SEED_NOMBRE_FANTASIA`, `SEED_COMPANY_RUT`, etc.

Por defecto el script hace `TRUNCATE` de todas las tablas en `public` y **limpia `backend/public`** (storage multimedia local). Para omitir truncate: `SEED_SKIP_TRUNCATE=true`.

Requiere `DB_SYNCHRONIZE=true` (o esquema ya creado) y base accesible vía `DB_*` en `.env`.

Usuarios: `superadmin`, `admin`, `operador` (password `SEED_ADMIN_PASSWORD`, default `098098`).

## Seed legacy (Parabrisas)

Ver [legacy/README.md](./legacy/README.md) — `npm run seed:legacy`.

## Estructura

| Ruta | Uso |
|------|-----|
| `run-dev-seed.ts` | Seed desarrollo |
| `seed-dev-config.ts` | Empresa, POS, bancos, socios, settings |
| `seed-dev-catalog.ts` | Categorías, marcas, productos |
| `seed-dev-eshop-hero-slides.ts` | Carrusel hero KaiStore (3 slides) |
| `assets/` | Imágenes versionadas (p. ej. logo empresa desde `pwa-admin/public/logo.png`) |
| `seed-multimedia.util.ts` | Limpieza de `public/` y carga de multimedia en seed |
| `minimal-seed.module.ts` | TypeORM (compartido) |
| `legacy/` | Parabrisas + catálogo Excel |
