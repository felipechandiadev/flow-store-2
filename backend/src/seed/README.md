# Backend seed

## Comandos

| Comando | Perfil |
|---------|--------|
| `npm run seed:demo` | **Mi Empresa** — catálogo multi-rubro genérico (~47 variantes) |
| `npm run seed` | Alias de `seed:demo` |
| `npm run seed:joyarte` | **Joyarte** — joyería demo (catálogo MVP desde Joyas Barón) |
| `npm run seed:import-joyarte` | Regenera `joyarte/data/catalog.json` + imágenes (scraping, requiere red) |
| `npm run seed:legacy` | Parabrisas don Walter (~963 productos) — ver [legacy/README.md](./legacy/README.md) |

```bash
cd backend
npm run seed:demo      # demo genérico
npm run seed:joyarte   # demo joyería Joyarte
```

Variables opcionales de empresa (demo): `SEED_COMPANY_RAZON_SOCIAL`, `SEED_NOMBRE_FANTASIA`, `SEED_COMPANY_RUT`, etc.

Por defecto cada script hace `TRUNCATE` de todas las tablas en `public` y **limpia `backend/public`** (storage multimedia local). Para omitir truncate: `SEED_SKIP_TRUNCATE=true`.

Requiere `DB_SYNCHRONIZE=true` (o esquema ya creado) y base accesible vía `DB_*` en `.env`.

Usuarios: `superadmin`, `admin`, `operador` (password `SEED_ADMIN_PASSWORD`, default `098098`).

## Estructura

| Ruta | Uso |
|------|-----|
| `run-dev-seed.ts` | Seed demo (`seed:demo`) |
| `seed-dev-config.ts` | Empresa, POS, bancos, socios, settings |
| `seed-dev-catalog.ts` | Categorías, marcas, productos demo |
| `shared/` | Utilidades compartidas (bootstrap, catálogo) |
| `joyarte/` | Seed Joyarte + scraper + data |
| `assets/` | Imágenes versionadas demo |
| `seed-multimedia.util.ts` | Limpieza de `public/` y carga multimedia |
| `minimal-seed.module.ts` | TypeORM (compartido) |
| `legacy/` | Parabrisas + catálogo Excel |
