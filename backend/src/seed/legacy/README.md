# Seed legacy — Parabrisas / vidrios

Datos de demostración del cliente **Parabrisas don Walter** (~960 productos desde Excel, marcas de vehículo, atributo AÑO).

**No usar** como seed por defecto en desarrollo diario.

## Ejecución

Desde `backend/`:

```bash
npm run seed:legacy
```

Mismas variables de entorno que el seed de desarrollo (`SEED_*`, `DB_*`, `SEED_SKIP_TRUNCATE`).

## Archivos

- `run-parabrisas-seed.ts` — script CLI
- `seed-parabrisas-config.ts` — empresa y settings Parabrisas
- `data/` — `catalogo-productos-seed.json`, `marcas-autos.json`, `anos-unicos.json`
