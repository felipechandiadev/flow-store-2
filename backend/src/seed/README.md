# Backend seed

Tareas del seed mínimo:

1. **Empresa** — busca por `rut` (único). Si no existe, crea con razón social, nombre de fantasía, giro y RUT en formato chileno (`xx.xxx.xxx-d`). Si ya existe, actualiza razón social, nombre de fantasía y giro desde variables de entorno.
2. **Usuario admin** — crea o actualiza el administrador (`SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` con valores por defecto si no se definen).

Variables de empresa (opcionales):

- `SEED_COMPANY_RAZON_SOCIAL` — default `Mi Empresa SpA`
- `SEED_NOMBRE_FANTASIA` — default `Mi Empresa`
- `SEED_BUSINESS_ACTIVITY` — default `Comercio al por menor`
- `SEED_COMPANY_RUT` — default `11.111.111-1` (debe ser válido y distintivo en BD)

## Esquema de base de datos

No se usan archivos de migración: el esquema se genera desde las **entidades TypeORM** cuando `DB_SYNCHRONIZE=true` en `.env` (solo desarrollo; en producción conviene `false` y un proceso de despliegue explícito). El módulo del seed usa el mismo `typeOrmConfig` que el API: **el seed no crea el esquema por separado**; al ejecutarlo, TypeORM aplica el mismo sync que al levantar Nest.

1. Base vacía o nueva: `dropdb` / `createdb` o borrar schema.
2. En `.env`: `DB_SYNCHRONIZE=true` (obligatorio si la base no tiene tablas; sin esto, el seed fallará con “relation does not exist”).
3. `npm run seed` y/o `npm run start:dev` — cualquiera de los dos, con `DB_SYNCHRONIZE=true`, hace que existan **todas** las tablas de las entidades registradas. El **seed solo escribe** empresa y usuario admin.

## Ejecución del seed

```bash
# Desde la raíz de `backend/`
npm run seed
```

Requiere base de datos accesible con la misma configuración que el API (`.env` / variables `DB_*`).

## Estructura

- `run-minimal-seed.ts` — script CLI
- `minimal-seed.module.ts` — TypeORM igual que el API; `forFeature` solo con entidades usadas en el script
