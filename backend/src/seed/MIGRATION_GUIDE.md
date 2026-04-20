# Migración de Seeds al Backend - Guía de Implementación

## ✅ Completado

Se ha creado la estructura base para integrar los seeds dentro del contexto de NestJS:

### Estructura Creada

```
backend/src/seed/
├── seed.module.ts       # Módulo NestJS con todas las entidades registradas
├── seed.service.ts      # Servicio con métodos auxiliares y estructura base
├── run-seed.ts          # Script CLI ejecutable con ts-node
├── data/                # Archivos JSON con datos del seed
│   ├── companies.json   # Ejemplo: empresa Joyarte
│   ├── branches.json    # Ejemplo: sucursales
│   ├── users.json       # Ejemplo: usuario admin
│   ├── taxes.json       # Ejemplo: IVA y exento
│   └── categories.json  # Ejemplo: categorías de joyería
└── README.md            # Documentación de uso
```

### Incluido en el Proyecto

1. **SeedModule** registrado en [app.module.ts](backend/src/app.module.ts#L17)
2. **Script npm** agregado: `npm run seed`
3. **Base del servicio** con métodos de utilidad:
   - `cleanCorruptData()` - Limpia datos inválidos
   - `verifyConnection()` - Verifica conexión a DB
   - `resetDatabase()` - Trunca todas las tablas
   - `createSeedData()` - Método principal (pendiente implementar lógica completa)
   - `readSeedJson()` - Lee archivos JSON de data/
   - `parseEnum()` - Parsea valores de enums
   - `hashPassword()` - Hashea contraseñas con bcryptjs
   - `buildPersonDisplayName()` - Construye nombres de personas

4. **Imports correctos** usando path alias `@modules/*`
5. **Integración TypeORM** usando `@InjectDataSource`

## 🚧 Pendiente de Implementar

La lógica completa del seed-flowstore (2900+ líneas) debe ser adaptada gradualmente:

### Paso 1: Copiar Archivos JSON

Copiar los archivos JSON de `desktop/data/seed/dataToSeed/` a `backend/src/seed/data/`:

```bash
# Desde el directorio desktop
cp data/seed/dataToSeed/*.json ../backend/src/seed/data/
```

Archivos requeridos:
- `accountingAccounts.json` - Plan de cuentas
- `accountingPeriods.json` - Períodos contables
- `accountingRules.json` - Reglas automáticas
- `attributes.json` - Atributos de variantes
- `cashSessions.json` - Sesiones de caja
- `customers.json` - Clientes
- `employees.json` - Empleados
- `expenseCategories.json` - Categorías de gasto
- `organizationalUnits.json` - Unidades organizativas
- `pointsOfSale.json` - Puntos de venta
- `priceLists.json` - Listas de precios
- `products.json` - Productos y variantes
- `resultCenters.json` - Centros de resultado
- `shareholders.json` - Socios
- `storages.json` - Bodegas
- `suppliers.json` - Proveedores
- `transactions.json` - Transacciones iniciales
- `units.json` - Unidades de medida

### Paso 2: Completar `createSeedData()`

Implementar la lógica completa en `seed.service.ts` siguiendo este orden:

1. **Empresa y sucursales**
   ```typescript
   const companies = await this.readSeedJson<CompanySeed[]>('companies.json');
   const companyRepo = this.dataSource.getRepository(Company);
   // ... crear empresa con bankAccounts
   
   const branches = await this.readSeedJson<BranchSeed[]>('branches.json');
   const branchRepo = this.dataSource.getRepository(Branch);
   // ... crear sucursales con location
   ```

2. **Centros de resultado y unidades organizativas**
   ```typescript
   const resultCenters = await this.readSeedJson<ResultCenterSeed[]>('resultCenters.json');
   // ... mapear refs, crear entidades
   
   const orgUnits = await this.readSeedJson<OrganizationalUnitSeed[]>('organizationalUnits.json');
   // ... manejar jerarquía parent/child
   ```

3. **Impuestos**
   ```typescript
   const taxes = await this.readSeedJson<TaxSeed[]>('taxes.json');
   // ... crear con parseEnum(TaxType, ...)
   ```

4. **Cuentas contables (jerárquicas)**
   ```typescript
   const accounts = await this.readSeedJson<AccountingAccountSeed[]>('accountingAccounts.json');
   // ... resolver dependencias parentRef, crear en orden
   ```

5. **Categorías de gasto**
   ```typescript
   const expenseCategories = await this.readSeedJson<ExpenseCategorySeed[]>('expenseCategories.json');
   // ... vincular con resultCenterRef
   ```

6. **Reglas contables**
   ```typescript
   const rules = await this.readSeedJson<AccountingRuleSeed[]>('accountingRules.json');
   // ... mapear a debit/creditAccountRef usando cuentas creadas
   ```

7. **Categorías, atributos, unidades**
   ```typescript
   const categories = await this.readSeedJson<CategorySeed[]>('categories.json');
   const attributes = await this.readSeedJson<AttributeSeed[]>('attributes.json');
   const units = await this.readSeedJson<UnitSeed[]>('units.json');
   ```

8. **Listas de precios**
   ```typescript
   const priceLists = await this.readSeedJson<PriceListSeed[]>('priceLists.json');
   // ... crear con key único, mapear PriceListType
   ```

9. **Bodegas y puntos de venta**
   ```typescript
   const storages = await this.readSeedJson<StorageSeed[]>('storages.json');
   const pointsOfSale = await this.readSeedJson<PointOfSaleSeed[]>('pointsOfSale.json');
   ```

10. **Clientes, proveedores, empleados**
    ```typescript
    const customers = await this.readSeedJson<CustomerSeed[]>('customers.json');
    // ... crear Person + Customer, manejar bankAccounts
    
    const suppliers = await this.readSeedJson<SupplierSeed[]>('suppliers.json');
    const employees = await this.readSeedJson<EmployeeSeed[]>('employees.json');
    ```

11. **Usuarios y permisos**
    ```typescript
    const users = await this.readSeedJson<UserSeed[]>('users.json');
    // ... hashear password, asignar permisos ALL o específicos
    ```

12. **Productos y variantes con pricing**
    ```typescript
    const products = await this.readSeedJson<ProductSeed[]>('products.json');
    // ... crear Product, ProductVariant, PriceListItem para cada variante/lista
    ```

13. **Períodos contables**
    ```typescript
    const periods = await this.readSeedJson<AccountingPeriodSeed[]>('accountingPeriods.json');
    ```

14. **Socios (shareholders)**
    ```typescript
    const shareholders = await this.readSeedJson<ShareholderSeed[]>('shareholders.json');
    // ... crear Person + Shareholder con ownershipPercentage
    ```

15. **Transacciones y movimientos**
    ```typescript
    const transactions = await this.readSeedJson<TransactionSeed[]>('transactions.json');
    // ... crear Transaction + TransactionLine, postear a ledger
    ```

### Paso 3: Definir Types e Interfaces

Agregar en `seed.service.ts` los tipos necesarios (extraídos de seed-flowstore.ts):

```typescript
type CompanySeed = {
  name: string;
  defaultCurrency?: string;
  isActive?: boolean;
  settings?: Record<string, unknown> | null;
  bankAccounts?: RawBankAccount[];
};

type BranchSeed = {
  ref: string;
  name: string;
  address?: string;
  phone?: string;
  location?: { lat: number; lng: number } | null;
  isHeadquarters: boolean;
  legacyNames?: string[];
};

// ... más tipos según sea necesario
```

### Paso 4: Implementar Helpers Específicos

Agregar métodos auxiliares según se necesiten:

```typescript
private mapBankAccounts(accounts: RawBankAccount[] | undefined | null): PersonBankAccount[] | null {
  if (!accounts || accounts.length === 0) return null;
  
  return accounts.map((account, index) => ({
    ...account,
    accountKey: account.accountKey ?? `BANK-${String(index + 1).padStart(3, '0')}`,
    bankName: this.parseEnum(BankName, account.bankName, 'bankName'),
    accountType: this.parseEnum(AccountTypeName, account.accountType, 'accountType'),
  }));
}

private async computePriceWithTaxes(basePrice: number, taxIds: string[]): Promise<number> {
  // Calcular precio con impuestos aplicados
  // Puede requerir importar lógica de desktop/lib/pricing/
}
```

### Paso 5: Migrar Lógica de AccountingEngine

Si el seed necesita postear transacciones al ledger:

```typescript
// Opción A: Usar el AccountingEngine compartido
import { postTransactionToLedger } from '../shared/application/AccountingEngine';

// Opción B: Llamar al endpoint del módulo accounting
// (requiere que el backend esté corriendo, no recomendado para seeds)
```

### Paso 6: Testing

1. Probar con base de datos de desarrollo:
   ```bash
   npm run seed
   ```

2. Verificar logs de creación

3. Validar datos en MySQL:
   ```sql
   SELECT * FROM companies;
   SELECT * FROM branches;
   SELECT * FROM users;
   ```

## 📝 Notas Importantes

### Diferencias con Desktop

- **No usar `getDb()`**: Ahora se usa `@InjectDataSource() dataSource: DataSource`
- **Imports con alias**: `@modules/*/domain/*.entity` en lugar de rutas relativas
- **Logger de NestJS**: `this.logger.log()` en lugar de `console.log()`
- **Async context**: Todo dentro del contexto de aplicación NestJS

### Dependencias

El servicio ya tiene acceso a:
- ✅ TypeORM DataSource
- ✅ Repositorios de todas las entidades (via TypeOrmModule.forFeature)
- ✅ bcryptjs para passwords
- ✅ uuid para IDs
- ✅ fs/promises para leer JSON

### Enums Requeridos

Asegúrate de que estos enums estén exportados desde sus módulos:
- `PersonType, DocumentType, BankName, AccountTypeName` → Person entity
- `TaxType` → Tax entity
- `PriceListType` → PriceList entity
- `StorageType, StorageCategory` → Storage entity
- `ResultCenterType` → ResultCenter entity
- `OrganizationalUnitType` → OrganizationalUnit entity
- `AccountType` → AccountingAccount entity
- `RuleScope` → AccountingRule entity
- `TransactionType, PaymentMethod, TransactionStatus` → Transaction entity
- `ProductType` → Product entity
- `SupplierType` → Supplier entity
- `EmploymentType, EmployeeStatus` → Employee entity
- `CashSessionStatus` → CashSession entity
- `AccountingPeriodStatus` → AccountingPeriod entity

## 🎯 Resultado Esperado

Al finalizar, ejecutar `npm run seed` debe:

1. Limpiar base de datos completamente
2. Crear toda la estructura de Joyarte SpA
3. Poblar con datos de ejemplo funcionales
4. Permitir login con usuario admin / 098098
5. Mostrar resumen detallado en consola

## 📚 Referencias

- Lógica original: `desktop/data/seed/seed-flowstore.ts` (líneas 550-2959)
- Helper functions: `desktop/data/seed/seed-flowstore.ts` (líneas 42-549)
- Pricing logic: `desktop/lib/pricing/priceCalculations.ts`
- Accounting engine: `desktop/data/services/AccountingEngine.ts` (ahora en `backend/src/shared/application/`)

---

**Próximos pasos**: Comenzar implementando los pasos 1-3 para tener un seed funcional básico, luego expandir gradualmente con más entidades.
