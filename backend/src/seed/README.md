# Backend seed

Tareas del seed mínimo:

1. **Empresa** — busca por `rut` (único). Si no existe, crea con razón social, nombre de fantasía, giro y RUT en formato chileno (`xx.xxx.xxx-d`). Si ya existe, actualiza razón social, nombre de fantasía y giro desde variables de entorno.
2. **Impuesto IVA (ejemplo)** — por empresa: busca un impuesto con nombre `IVA` y tipo `IVA`. Si no existe, crea uno con tasa **19%**, sin código, descripción estándar de IVA, `isDefault=false`, `isActive=true`. Si ya existe, alinea esos campos con el ejemplo del seed.
3. **Sucursal (ejemplo)** — por empresa: busca la sucursal **Local Principal** (incluyendo borrado lógico). Si no existe, la crea con dirección `Av. Anibal Pinto 1000, Parral`, teléfono `999999999`, ubicación `{lat:-36.15943159155879,lng:-71.78741455078126}`, `isActive=true`, `isHeadquarters=false`. Si existía eliminada, la recupera y alinea datos; si ya estaba activa, actualiza dirección, teléfono, ubicación y flags con el mismo ejemplo.
4. **Unidades de medida (ejemplos)** — asegura 2 registros en `units`:
   - **UNIDAD** (`UN`) base: `dimension=count`, `conversionFactor=1`, `allowDecimals=false`, `isBase=true`, `active=true`.
   - **DOCENA** (`DOC`) derivada: `dimension=count`, `conversionFactor=12`, `allowDecimals=false`, `isBase=false`, `baseUnitId` = `UN`, `active=false`. Si estaba borrada, la recupera.
5. **Categorías (ejemplos)** — asegura 2 registros en `categories`:
   - **CAT 01** (padre): activo, `sortOrder=0`.
   - **CAT 02** (hija): activo, `parentId = CAT 01`, `sortOrder=0`.
6. **Atributos (ejemplo)** — asegura el atributo **TALLA** con opciones `["XS","SM","M","L","XL","XXL"]`, activo.
7. **Listas de precios (ejemplos)** — asegura:
   - **MINORISTA** (`RETAIL`, `CLP`) como `isDefault=true`, activa.
   - **MAYORISTA** (`WHOLESALE`, `CLP`) como `isDefault=false`, activa.
8. **Punto de venta (ejemplo)** — asegura **CAJA LOCAL** en la sucursal de ejemplo, activo, con `defaultPriceListId=MINORISTA` y `priceLists` con MINORISTA y MAYORISTA.
9. **Usuario admin** — crea o actualiza el administrador (`SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_EMAIL` con valores por defecto si no se definen).
10. **Contabilidad (mínimo)** — por empresa:
   - **Plan de cuentas mínimo** (`accounting_accounts`): asegura un set base (Activos/Pasivos/Patrimonio/Ingresos/Gastos) con subcuentas (Caja, Banco, Clientes, Proveedores, Ventas, Costos, Gastos operativos).
   - **Reglas contables mínimas** (`accounting_rules`): recrea reglas por evento para tipos de transacción comunes (venta, compra, cobro, pago a proveedor, gasto operativo).

Variables de empresa (opcionales):

- `SEED_COMPANY_RAZON_SOCIAL` — default `Mi Empresa SpA`
- `SEED_NOMBRE_FANTASIA` — default `Mi Empresa`
- `SEED_BUSINESS_ACTIVITY` — default `Comercio al por menor`
- `SEED_COMPANY_RUT` — default `11.111.111-1` (debe ser válido y distintivo en BD)

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

## Estructura

- `run-minimal-seed.ts` — script CLI
- `minimal-seed.module.ts` — TypeORM igual que el API; `forFeature` solo con entidades usadas en el script
