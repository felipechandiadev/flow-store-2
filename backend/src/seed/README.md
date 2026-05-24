# Backend seed

Tareas del seed mínimo:

1. **Empresa** — busca por `rut` (único). Por defecto siembra **Parabrisas don Walter** (Walter Parada Vargas, RUT `11.566.882-K`, Parral). Si ya existe, actualiza datos básicos y `settings` (medios de pago, cotizaciones, cheques, crédito interno).
2. **Impuesto IVA (ejemplo)** — por empresa: busca un impuesto con nombre `IVA` y tipo `IVA`. Si no existe, crea uno con tasa **19%**, sin código, descripción estándar de IVA, `isDefault=false`, `isActive=true`, **`nonDeletable=true`** (no eliminable por API). Si ya existe, alinea esos campos con el ejemplo del seed.
3. **Sucursal** — **Local Principal**: `Ignacio Carrera Pinto N°734 , Parral`, teléfono `+56984395102`, ubicación `{lat:-36.146,lng:-71.826}`, `isHeadquarters=false`.
4. **Unidades de medida (ejemplos)** — asegura 2 registros en `units`:
   - **UNIDAD** (`UN`) base: `dimension=count`, `conversionFactor=1`, `allowDecimals=false`, `isBase=true`, `active=true`.
   - **DOCENA** (`DOC`) derivada: `dimension=count`, `conversionFactor=12`, `allowDecimals=false`, `isBase=false`, `baseUnitId` = `UN`, `active=false`. Si estaba borrada, la recupera.
5. **Categorías (ejemplos)** — asegura 2 registros en `categories`:
   - **CAT 01** (padre): activo, `sortOrder=0`.
   - **CAT 02** (hija): activo, `parentId = CAT 01`, `sortOrder=0`.
6. **Atributos (ejemplo)** — asegura el atributo **TALLA** con opciones `["XS","SM","M","L","XL","XXL"]`, activo.
7. **Lista de precios** — **UNICA** (`RETAIL`, `CLP`, default). Desactiva listas legacy MINORISTA/MAYORISTA si existían.
8. **Punto de venta** — **CAJA LOCAL** en sucursal seed, almacén **Sala de venta**, lista **UNICA**, medios POS (efectivo/tarjetas/transfer/NC/abono encargo).
9. **Cuenta bancaria empresa** — Banco Falabella cuenta corriente `19994412711` (primaria).
10. **Centro de efectivo** — nombre **Principal**, código `CEV-00001` (generado por el sistema en altas nuevas).
11. **Usuarios** — `superadmin` (sin empresa), `admin` y `operador` (empresa seed; password `SEED_ADMIN_PASSWORD`, default `098098`).
12. **Contabilidad (mínimo)** — por empresa:
   - **Plan de cuentas mínimo** (`accounting_accounts`): asegura un set base (Activos/Pasivos/Patrimonio/Ingresos/Gastos) con subcuentas (Caja, Banco, Clientes, Proveedores, Ventas, Costos, Gastos operativos).
   - **Reglas contables mínimas** (`accounting_rules`): recrea reglas por evento para tipos de transacción comunes (venta, compra, cobro, pago a proveedor, gasto operativo).

Variables de empresa (opcionales):

- `SEED_COMPANY_RAZON_SOCIAL` — default `Walter Parada Vargas`
- `SEED_NOMBRE_FANTASIA` — default `Parabrisas don Walter`
- `SEED_BUSINESS_ACTIVITY` — default `Venta de parabrisas y vidrios automotrices`
- `SEED_COMPANY_RUT` — default `11.566.882-K`
- `SEED_COMPANY_ADDRESS` — default dirección sucursal Parral
- `SEED_COMPANY_MAIL` — default `walter.parada.v@gmail.com`

Detalle de settings y medios de pago en `seed-parabrisas-config.ts`.

## Esquema de base de datos

No se usan archivos de migración: el esquema se genera desde las **entidades TypeORM** cuando `DB_SYNCHRONIZE=true` en `.env` (solo desarrollo; en producción conviene `false` y un proceso de despliegue explícito). El módulo del seed usa el mismo `typeOrmConfig` que el API: **el seed no crea el esquema por separado**; al ejecutarlo, TypeORM aplica el mismo sync que al levantar Nest.

1. Base vacía o nueva: `dropdb` / `createdb` o borrar schema.
2. En `.env`: `DB_SYNCHRONIZE=true` (obligatorio si la base no tiene tablas; sin esto, el seed fallará con “relation does not exist”).
3. `npm run seed` y/o `npm run start:dev` — cualquiera de los dos, con `DB_SYNCHRONIZE=true`, hace que existan **todas** las tablas de las entidades registradas. El **seed solo escribe** empresa, impuesto IVA de ejemplo, sucursal de ejemplo, unidades de medida de ejemplo, categorías/atributos/listas de precios/punto de venta de ejemplo y usuario admin.

## Ejecución del seed

```bash
# Desde la raíz de `backend/`
npm run seed
```

Requiere base de datos accesible con la misma configuración que el API (`.env` / variables `DB_*`).

### Limpieza de la base

Por defecto, **antes** de insertar datos el seed ejecuta `TRUNCATE … CASCADE` sobre **todas** las tablas del esquema `public` (reinicia secuencias). Es destructivo: úsalo solo en desarrollo.

Para omitir el truncado (mezcla datos viejos con el seed), define:

`SEED_SKIP_TRUNCATE=true`

## Estructura

- `run-minimal-seed.ts` — script CLI
- `seed-parabrisas-config.ts` — datos Parabrisas Don Walter (empresa, sucursal, medios de pago, settings)
- `minimal-seed.module.ts` — TypeORM igual que el API; `forFeature` solo con entidades usadas en el script
