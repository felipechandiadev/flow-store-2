#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { MinimalSeedModule } from './minimal-seed.module';
import { User, UserRole } from '@modules/users/domain/user.entity';
import {
  Person,
  PersonType,
  DocumentType,
} from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { UnitDimension } from '@modules/units/domain/unit-dimension.enum';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceList, PriceListType } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier, SupplierType } from '@modules/suppliers/domain/supplier.entity';
import { AccountingAccount, AccountType } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule, RuleScope } from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  AccountingRuleLine,
  AccountingRuleLineAmountMode,
  AccountingRuleLineSide,
} from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AutomationRule } from '@modules/automation/domain/automation-rule.entity';
import { AutomationAction } from '@modules/automation/domain/automation-action.entity';
import { AutomationEventType } from '@modules/automation/domain/automation-event-type.enum';
import { AutomationActionType } from '@modules/automation/domain/automation-action-type.enum';
import {
  ExpenseCategoryOperationalGroup,
} from '@modules/expense-categories/domain/expense-category-operational-group.enum';
import { assertValidChileCompanyRut } from '@shared/utils/chile-company-rut.util';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';

const SEED_IVA_DESCRIPTION =
  'Impuesto al Valor Agregado sobre ventas, servicios e importaciones.';

const SEED_BRANCH_NAME = 'Local Principal';
const SEED_BRANCH_ADDRESS = 'Av. Anibal Pinto 1000, Parral';
const SEED_BRANCH_PHONE = '999999999';
const SEED_BRANCH_LOCATION = {
  lat: -36.15943159155879,
  lng: -71.78741455078126,
};

/** Almacenes demo: sala ligada a la sucursal seed; depósito central (sin sucursal). */
const SEED_STORAGE_SALA_NAME = 'Sala de venta';
const SEED_STORAGE_SALA_CODE = 'SEED-SALA-VENTA';
const SEED_STORAGE_DEPOSITO_NAME = 'Depósito principal';
const SEED_STORAGE_DEPOSITO_CODE = 'SEED-DEP-PRINCIPAL';

const SEED_UNIT_BASE_NAME = 'UNIDAD';
const SEED_UNIT_BASE_SYMBOL = 'UN';
const SEED_UNIT_DERIVED_NAME = 'DOCENA';
const SEED_UNIT_DERIVED_SYMBOL = 'DOC';

const SEED_CATEGORY_PARENT_NAME = 'CAT 01';
const SEED_CATEGORY_CHILD_NAME = 'CAT 02';

/** Catálogo de atributos demo (nombre único + opciones). TALLA se usa en variantes de polera. */
const SEED_ATTRIBUTES: readonly {
  name: string;
  options: readonly string[];
  displayOrder: number;
}[] = [
  {
    name: 'TALLA',
    options: ['XS', 'SM', 'M', 'L', 'XL', 'XXL'],
    displayOrder: 0,
  },
  {
    name: 'COLOR',
    options: ['Negro', 'Blanco', 'Gris', 'Azul marino', 'Rojo'],
    displayOrder: 1,
  },
  {
    name: 'MATERIAL',
    options: ['Algodón', 'Poliéster', 'Lino', 'Mixto'],
    displayOrder: 2,
  },
  {
    name: 'ORIGEN',
    options: ['Chile', 'Perú', 'Colombia', 'Brasil'],
    displayOrder: 3,
  },
  {
    name: 'MOLIENDA',
    options: ['Grano entero', 'Espresso', 'Fina', 'Media'],
    displayOrder: 4,
  },
  {
    name: 'PESO',
    options: ['250 g', '500 g', '1 kg'],
    displayOrder: 5,
  },
];

const SEED_PRICE_LIST_RETAIL_NAME = 'MINORISTA';
const SEED_PRICE_LIST_WHOLESALE_NAME = 'MAYORISTA';

const SEED_POS_NAME = 'CAJA LOCAL';

const SEED_ACCOUNTING_ACCOUNTS: readonly {
  code: string;
  name: string;
  type: AccountType;
  parentCode?: string;
  isActive?: boolean;
}[] = [
  // Assets
  { code: '1000', name: 'Activos', type: AccountType.ASSET },
  { code: '1100', name: 'Caja y bancos', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1101', name: 'Caja', type: AccountType.ASSET, parentCode: '1100' },
  { code: '1102', name: 'Banco', type: AccountType.ASSET, parentCode: '1100' },
  { code: '1200', name: 'Cuentas por cobrar', type: AccountType.ASSET, parentCode: '1000' },
  { code: '1201', name: 'Clientes', type: AccountType.ASSET, parentCode: '1200' },

  // Liabilities
  { code: '2000', name: 'Pasivos', type: AccountType.LIABILITY },
  { code: '2100', name: 'Cuentas por pagar', type: AccountType.LIABILITY, parentCode: '2000' },
  { code: '2101', name: 'Proveedores', type: AccountType.LIABILITY, parentCode: '2100' },

  // Equity
  { code: '3000', name: 'Patrimonio', type: AccountType.EQUITY },
  { code: '3100', name: 'Capital', type: AccountType.EQUITY, parentCode: '3000' },
  { code: '3101', name: 'Capital social', type: AccountType.EQUITY, parentCode: '3100' },

  // Income
  { code: '4000', name: 'Ingresos', type: AccountType.INCOME },
  { code: '4100', name: 'Ventas', type: AccountType.INCOME, parentCode: '4000' },
  { code: '4101', name: 'Ventas (mercaderías)', type: AccountType.INCOME, parentCode: '4100' },

  // Expenses
  { code: '5000', name: 'Gastos', type: AccountType.EXPENSE },
  { code: '5100', name: 'Costo de ventas', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5101', name: 'Costo de mercaderías', type: AccountType.EXPENSE, parentCode: '5100' },
  { code: '5200', name: 'Gastos operativos', type: AccountType.EXPENSE, parentCode: '5000' },
  { code: '5201', name: 'Gastos operativos varios', type: AccountType.EXPENSE, parentCode: '5200' },
] as const;

const SEED_EXPENSE_CATEGORIES: readonly {
  name: string;
  operationalExpenseGroup: ExpenseCategoryOperationalGroup;
}[] = [
  { name: 'Sueldos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Horas extra', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Cargas sociales', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Capacitación operativa', operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERSONAL_NOMINA },
  { name: 'Arriendo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Gastos comunes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Mantención', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Limpieza', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Seguridad física', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOCALES_INSTALACIONES },
  { name: 'Embalaje', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Útiles', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  { name: 'Materiales no inventariables', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES },
  {
    name: 'EPP (Elementos de Protección Personal)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SUMINISTROS_CONSUMIBLES,
  },
  { name: 'Flete', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Courier', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Combustible operativo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Peajes', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Almacenaje externo', operationalExpenseGroup: ExpenseCategoryOperationalGroup.LOGISTICA_DISTRIBUCION },
  { name: 'Software recurrente', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Hosting', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'POS (Puntos de Venta)', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Soporte', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  { name: 'Licencias', operationalExpenseGroup: ExpenseCategoryOperationalGroup.TECNOLOGIA_SISTEMAS },
  {
    name: 'Promociones en tienda',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Señalética',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Muestras',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.COMUNICACION_MARKETING_OPERATIVO,
  },
  {
    name: 'Contabilidad/tributario recurrente',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS,
  },
  { name: 'Retainer legal', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  { name: 'Auditorías', operationalExpenseGroup: ExpenseCategoryOperationalGroup.SERVICIOS_EXTERNOS },
  {
    name: 'Comisiones bancarias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  { name: 'Seguros operativos', operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA },
  {
    name: 'Costos de líneas de crédito',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.FINANCIEROS_TESORERIA,
  },
  {
    name: 'Mermas autorizadas',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Diferencias de caja menores',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Obsolescencia (gasto operativo)',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  },
  {
    name: 'Permisos municipales',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Fiscalización',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
  {
    name: 'Certificaciones obligatorias',
    operationalExpenseGroup: ExpenseCategoryOperationalGroup.REGULATORIO_CUMPLIMIENTO,
  },
] as const;

const SEED_SUPPLIERS: readonly {
  person: {
    type: PersonType;
    firstName: string;
    lastName?: string;
    businessName?: string;
    documentType?: DocumentType;
    documentNumber: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  supplier: {
    supplierType: SupplierType;
    alias?: string;
    defaultPaymentTermDays: number;
    isActive: boolean;
    notes?: string;
  };
}[] = [
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Comercial Andes SpA',
      businessName: 'Comercial Andes SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.123.456-7',
      email: 'contacto@andes-proveedores.cl',
      phone: '+56 9 6123 4567',
      address: 'Av. Providencia 1234, Santiago',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'Andes',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Distribuidor multirubro con despacho nacional.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Textiles del Sur Ltda',
      businessName: 'Textiles del Sur Ltda',
      documentType: DocumentType.RUT,
      documentNumber: '77.234.567-8',
      email: 'ventas@textilessur.cl',
      phone: '+56 41 245 7788',
      address: 'Ruta 5 Sur km 505, Temuco',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      alias: 'TextilSur',
      defaultPaymentTermDays: 45,
      isActive: true,
      notes: 'Fabricante directo; condiciones especiales por volumen.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'María',
      lastName: 'Pérez Soto',
      documentType: DocumentType.RUN,
      documentNumber: '15.876.543-2',
      email: 'maria.perez@servicios.cl',
      phone: '+56 9 9988 7766',
      address: 'Los Canelos 778, Talca',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      defaultPaymentTermDays: 0,
      isActive: true,
      notes: 'Servicio local con pago contra entrega.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'John',
      lastName: 'Miller',
      documentType: DocumentType.PASSPORT,
      documentNumber: 'P99887766',
      email: 'john.miller@imports.com',
      phone: '+1 305 555 1122',
      address: '745 Brickell Ave, Miami',
    },
    supplier: {
      supplierType: SupplierType.IMPORTER,
      alias: 'JM Imports',
      defaultPaymentTermDays: 60,
      isActive: true,
      notes: 'Proveedor importado con lead time variable.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Envases Pacifico S.A.',
      businessName: 'Envases Pacifico S.A.',
      documentType: DocumentType.RUT,
      documentNumber: '96.345.678-9',
      email: 'contacto@envasespacifico.cl',
      address: 'Camino a Melipilla 8800, Maipú',
    },
    supplier: {
      supplierType: SupplierType.MANUFACTURER,
      defaultPaymentTermDays: 15,
      isActive: true,
      notes: 'Especialista en packaging y consumibles.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Servicios Tributarios Integrales EIRL',
      businessName: 'Servicios Tributarios Integrales EIRL',
      documentType: DocumentType.RUT,
      documentNumber: '76.876.543-1',
      email: 'admin@sti.cl',
      phone: '+56 2 2677 8899',
    },
    supplier: {
      supplierType: SupplierType.SERVICE_PROVIDER,
      alias: 'STI',
      defaultPaymentTermDays: 10,
      isActive: false,
      notes: 'Proveedor inactivo para pruebas de filtro.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Andrea',
      lastName: 'Rojas',
      documentType: DocumentType.OTHER,
      documentNumber: 'PROV-AR-001',
      phone: '+56 9 4321 1000',
      address: 'Pasaje Las Flores 120, Chillán',
    },
    supplier: {
      supplierType: SupplierType.CONTRACTOR,
      alias: 'A. Rojas',
      defaultPaymentTermDays: 7,
      isActive: true,
      notes: 'Proveedor sin email para validar campos opcionales.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Mayorista Central SPA',
      businessName: 'Mayorista Central SPA',
      documentType: DocumentType.RUT,
      documentNumber: '77.987.654-3',
      email: 'compras@mayoristacentral.cl',
      phone: '+56 2 2987 1200',
      address: 'Av. Matta 3400, Santiago',
    },
    supplier: {
      supplierType: SupplierType.WHOLESALER,
      defaultPaymentTermDays: 90,
      isActive: true,
      notes: 'Mayorista con crédito amplio y despacho semanal.',
    },
  },
  {
    person: {
      type: PersonType.NATURAL,
      firstName: 'Carlos',
      lastName: 'Gutiérrez',
      documentType: DocumentType.RUN,
      documentNumber: '12.345.678-5',
      email: 'carlos.gutierrez@logistica.cl',
      address: 'Los Aromos 450, Rancagua',
    },
    supplier: {
      supplierType: SupplierType.LOGISTICS,
      defaultPaymentTermDays: 21,
      isActive: true,
      notes: 'Distribución regional zona centro sur.',
    },
  },
  {
    person: {
      type: PersonType.COMPANY,
      firstName: 'Tecnologia Retail Hub SpA',
      businessName: 'Tecnologia Retail Hub SpA',
      documentType: DocumentType.RUT,
      documentNumber: '76.654.321-0',
      email: 'soporte@retailhub.cl',
      phone: '+56 2 2555 7788',
      address: 'Av. Apoquindo 4800, Las Condes',
    },
    supplier: {
      supplierType: SupplierType.DISTRIBUTOR,
      alias: 'RetailHub',
      defaultPaymentTermDays: 30,
      isActive: true,
      notes: 'Proveedor de hardware POS y licenciamiento.',
    },
  },
] as const;

/** Tablas en `public` que no deben truncarse (extensiones PostGIS u otras). */
const TRUNCATE_EXCLUDE_TABLES = new Set([
  'spatial_ref_sys',
  'geometry_columns',
  'geography_columns',
  'raster_columns',
  'raster_overviews',
]);

/**
 * Vacía todas las tablas del esquema `public` (reinicia secuencias).
 * Usar solo en entornos de desarrollo con `npm run seed`.
 */
async function truncateAllPublicTables(dataSource: DataSource): Promise<void> {
  const schema = 'public';
  const rows = await dataSource.query<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`,
    [schema],
  );
  const names = rows
    .map((r) => r.tablename)
    .filter((t) => !TRUNCATE_EXCLUDE_TABLES.has(t));
  if (names.length === 0) {
    console.log(`⚠️  No hay tablas para truncar en ${schema}.`);
    return;
  }
  const quoted = names.map((n) => `"${n.replace(/"/g, '""')}"`).join(', ');
  await dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(
    `✅ Base de datos limpiada: ${names.length} tabla(s) en «${schema}» (TRUNCATE … CASCADE).`,
  );
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(MinimalSeedModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const dataSource = app.get(DataSource);

    // Ensure new tables exist even if DB_SYNCHRONIZE is off.
    // This seed is used in dev environments and must stay resilient.
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS accounting_rule_lines (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ruleId" uuid NOT NULL,
        side varchar(20) NOT NULL,
        "accountId" uuid NOT NULL,
        "amountMode" varchar(20) NOT NULL,
        "amountValue" numeric(15,2),
        "sortOrder" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_accounting_rule_lines_rule FOREIGN KEY ("ruleId") REFERENCES accounting_rules(id) ON DELETE CASCADE,
        CONSTRAINT fk_accounting_rule_lines_account FOREIGN KEY ("accountId") REFERENCES accounting_accounts(id) ON DELETE RESTRICT
      );
    `);
    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_accounting_rule_lines_rule_sort
      ON accounting_rule_lines ("ruleId", "sortOrder");
    `);

    // ---------------------------------------------------------------------
    // Automation tables (MVP: rules + actions)
    // ---------------------------------------------------------------------
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "eventType" varchar(60) NOT NULL,
        filters json,
        priority int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_automation_rules_company_event_active
      ON automation_rules ("companyId", "eventType", "isActive");
    `);
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS automation_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ruleId" uuid NOT NULL,
        type varchar(80) NOT NULL,
        params json,
        "sortOrder" int NOT NULL DEFAULT 0,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_automation_actions_rule FOREIGN KEY ("ruleId") REFERENCES automation_rules(id) ON DELETE CASCADE
      );
    `);
    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_actions_rule_sort
      ON automation_actions ("ruleId", "sortOrder");
    `);

    if (process.env.SEED_SKIP_TRUNCATE === 'true') {
      console.log(
        '⚠️  SEED_SKIP_TRUNCATE=true — no se truncan tablas (datos previos se mezclan con el seed).',
      );
    } else {
      console.log('🧹 Limpiando todas las tablas (schema public) antes del seed…');
      await truncateAllPublicTables(dataSource);
    }

    const userRepo = dataSource.getRepository(User);
    const personRepo = dataSource.getRepository(Person);
    const companyRepo = dataSource.getRepository(Company);
    const taxRepo = dataSource.getRepository(Tax);
    const branchRepo = dataSource.getRepository(Branch);
    const unitRepo = dataSource.getRepository(Unit);
    const categoryRepo = dataSource.getRepository(Category);
    const attributeRepo = dataSource.getRepository(Attribute);
    const priceListRepo = dataSource.getRepository(PriceList);
    const posRepo = dataSource.getRepository(PointOfSale);
    const expenseCategoryRepo = dataSource.getRepository(ExpenseCategory);
    const supplierRepo = dataSource.getRepository(Supplier);
    const accountingAccountRepo = dataSource.getRepository(AccountingAccount);
    const accountingRuleRepo = dataSource.getRepository(AccountingRule);
    const accountingRuleLineRepo = dataSource.getRepository(AccountingRuleLine);
    const automationRuleRepo = dataSource.getRepository(AutomationRule);
    const automationActionRepo = dataSource.getRepository(AutomationAction);

    const userName = process.env.SEED_ADMIN_USERNAME || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || '098098';
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@flowstore.local';
    const razonSocial =
      process.env.SEED_COMPANY_RAZON_SOCIAL || 'Mi Empresa SpA';
    const nombreFantasia =
      process.env.SEED_NOMBRE_FANTASIA || 'Mi Empresa';
    const businessActivity =
      process.env.SEED_BUSINESS_ACTIVITY || 'Comercio al por menor';
    const rut = process.env.SEED_COMPANY_RUT || '11.111.111-1';

    assertValidChileCompanyRut(rut, 'SEED_COMPANY_RUT');

    let company = await companyRepo.findOne({
      where: { rut, deletedAt: null as never },
    });
    if (!company) {
      company = companyRepo.create({
        razonSocial,
        nombreFantasia,
        businessActivity,
        rut,
        defaultCurrency: 'CLP',
        isActive: true,
      });
      await companyRepo.save(company);
      console.log(
        `✅ Empresa creada: id=${company.id} razonSocial='${razonSocial}' rut='${rut}'`,
      );
    } else {
      company.razonSocial = razonSocial;
      company.nombreFantasia = nombreFantasia;
      company.businessActivity = businessActivity;
      await companyRepo.save(company);
      console.log(
        `✅ Empresa ya existía: id=${company.id} razonSocial='${company.razonSocial}' rut='${company.rut}' (datos básicos actualizados)`,
      );
    }

    let ivaTax = await taxRepo.findOne({
      where: {
        companyId: company.id,
        name: 'IVA',
        taxType: TaxType.IVA,
      },
    });
    if (!ivaTax) {
      ivaTax = taxRepo.create({
        companyId: company.id,
        name: 'IVA',
        code: null,
        taxType: TaxType.IVA,
        rate: 19,
        description: SEED_IVA_DESCRIPTION,
        isDefault: false,
        isActive: true,
      });
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo creado: IVA 19% id=${ivaTax.id} companyId=${company.id}`,
      );
    } else {
      ivaTax.code = null;
      ivaTax.rate = 19;
      ivaTax.description = SEED_IVA_DESCRIPTION;
      ivaTax.isDefault = false;
      ivaTax.isActive = true;
      ivaTax.taxType = TaxType.IVA;
      await taxRepo.save(ivaTax);
      console.log(
        `✅ Impuesto ejemplo IVA ya existía: id=${ivaTax.id} (sincronizado con seed)`,
      );
    }

    // ---------------------------------------------------------------------
    // Accounting accounts (plan de cuentas mínimo)
    // ---------------------------------------------------------------------
    const existingAccounts = await accountingAccountRepo.find({
      where: { companyId: company.id },
      order: { code: 'ASC' },
    });
    const byCode = new Map(existingAccounts.map((a) => [a.code, a]));

    // First pass: create/update roots and all accounts with parentCode resolved later.
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      const prev = byCode.get(item.code);
      const row = prev
        ? Object.assign(prev, {
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            isActive: item.isActive ?? true,
          })
        : accountingAccountRepo.create({
            companyId: company.id,
            code: item.code,
            name: item.name,
            type: item.type,
            parentId: null,
            isActive: item.isActive ?? true,
          });
      const saved = await accountingAccountRepo.save(row);
      byCode.set(saved.code, saved);
    }

    // Second pass: set parentId for those that have parentCode
    for (const item of SEED_ACCOUNTING_ACCOUNTS) {
      if (!item.parentCode) continue;
      const child = byCode.get(item.code);
      const parent = byCode.get(item.parentCode);
      if (!child || !parent) continue;
      const needsUpdate = (child.parentId ?? null) !== parent.id;
      if (needsUpdate) {
        child.parentId = parent.id;
        await accountingAccountRepo.save(child);
      }
    }

    console.log(
      `✅ Plan de cuentas mínimo sincronizado: companyId=${company.id} total=${SEED_ACCOUNTING_ACCOUNTS.length}`,
    );

    // ---------------------------------------------------------------------
    // Accounting rules (reglas mínimas por evento)
    // ---------------------------------------------------------------------
    const deleteRulesResult = await accountingRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AccountingRule)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Reglas contables eliminadas para companyId=${company.id}: ${deleteRulesResult.affected ?? 0}`,
    );

    const acc = (code: string) => {
      const a = byCode.get(code);
      if (!a) {
        throw new Error(`Seed contable: falta cuenta code=${code}`);
      }
      return a.id;
    };

    const seedRules: Array<Partial<AccountingRule>> = [
      // Ventas: Caja/Banco (debe) contra Ventas (haber). Genérica (sin paymentMethod).
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SALE' as any,
        debitAccountId: acc('1101'),
        creditAccountId: acc('4101'),
        priority: 0,
        isActive: true,
      },
      // Cobro a cliente: Banco (debe) contra Clientes (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PAYMENT_IN' as any,
        debitAccountId: acc('1102'),
        creditAccountId: acc('1201'),
        priority: 0,
        isActive: true,
      },
      // Compra: Costo mercaderías (debe) contra Proveedores (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'PURCHASE' as any,
        debitAccountId: acc('5101'),
        creditAccountId: acc('2101'),
        priority: 0,
        isActive: true,
      },
      // Pago a proveedor: Proveedores (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'SUPPLIER_PAYMENT' as any,
        debitAccountId: acc('2101'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'OPERATING_EXPENSE' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 0,
        isActive: true,
      },
      // Pago gasto operativo: Gastos operativos (debe) contra Banco (haber)
      {
        companyId: company.id,
        appliesTo: RuleScope.TRANSACTION,
        transactionType: 'EXPENSE_PAYMENT' as any,
        debitAccountId: acc('5201'),
        creditAccountId: acc('1102'),
        priority: 10,
        isActive: true,
      },
    ];

    for (const r of seedRules) {
      const row = accountingRuleRepo.create(r as any);
      const savedRule = (await accountingRuleRepo.save(
        row as any,
      )) as unknown as AccountingRule;
      // Crear líneas por defecto equivalentes al par débito/crédito
      const lines = [
        {
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.DEBIT,
          accountId: (r.debitAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 0,
          isActive: true,
        },
        {
          ruleId: savedRule.id,
          side: AccountingRuleLineSide.CREDIT,
          accountId: (r.creditAccountId as string),
          amountMode: AccountingRuleLineAmountMode.TOTAL,
          amountValue: null,
          sortOrder: 1,
          isActive: true,
        },
      ];
      for (const l of lines) {
        await accountingRuleLineRepo.save(accountingRuleLineRepo.create(l as any));
      }
      console.log(
        `✅ Regla contable creada: type=${String(r.transactionType)} scope=${String(r.appliesTo)} priority=${r.priority} id=${savedRule.id}`,
      );
    }

    // ---------------------------------------------------------------------
    // Automation rules (transaction events -> actions)
    // ---------------------------------------------------------------------
    await automationActionRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationAction)
      .where(`"ruleId" IN (SELECT id FROM automation_rules WHERE "companyId" = :companyId)`, {
        companyId: company.id,
      })
      .execute();
    await automationRuleRepo
      .createQueryBuilder()
      .delete()
      .from(AutomationRule)
      .where(`"companyId" = :companyId`, { companyId: company.id })
      .execute();

    const createAutomationRule = async (row: {
      eventType: AutomationEventType;
      filters?: Record<string, any> | null;
      priority?: number;
      isActive?: boolean;
      actions: Array<{
        type: AutomationActionType;
        sortOrder: number;
        isActive?: boolean;
        params?: Record<string, any> | null;
      }>;
    }) => {
      const saved = (await automationRuleRepo.save(
        automationRuleRepo.create({
          companyId: company.id,
          eventType: row.eventType,
          filters: row.filters ?? null,
          priority: row.priority ?? 0,
          isActive: row.isActive !== false,
        } as any),
      )) as unknown as AutomationRule;
      for (const a of row.actions) {
        await automationActionRepo.save(
          automationActionRepo.create({
            ruleId: saved.id,
            type: a.type,
            sortOrder: a.sortOrder ?? 0,
            isActive: a.isActive !== false,
            params: a.params ?? null,
          } as any),
        );
      }
      console.log(`✅ Automation rule creada: event=${row.eventType} id=${saved.id}`);
    };

    // SALE + deliveryMode=IMMEDIATE + contado -> ADJUSTMENT_OUT + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'IMMEDIATE',
      },
      priority: 0,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'ADJUSTMENT_OUT',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // SALE + deliveryMode=DEFERRED + contado -> INVENTORY_RESERVATION + PAYMENT_IN
    await createAutomationRule({
      eventType: AutomationEventType.TRANSACTION_CREATED,
      filters: {
        transactionType: 'SALE',
        paymentStatus: 'PAID',
        'metadata.fulfillment.deliveryMode': 'DEFERRED',
      },
      priority: 10,
      isActive: true,
      actions: [
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 0,
          isActive: true,
          params: {
            transactionType: 'INVENTORY_RESERVATION',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'transform_cost',
            totalFrom: 'costTotal',
            setFields: { paymentStatus: 'PAID', amountPaid: 0 },
          },
        },
        {
          type: AutomationActionType.CREATE_DERIVED_TRANSACTION,
          sortOrder: 1,
          isActive: true,
          params: {
            transactionType: 'PAYMENT_IN',
            linkMode: 'relatedTransactionId',
            lineStrategy: 'none',
            totalFrom: 'amountPaid',
            copyFields: ['paymentMethod', 'amountPaid', 'changeAmount', 'customerId'],
            setFields: { paymentStatus: 'PAID' },
          },
        },
      ],
    });

    // Nota: reglas de PURCHASE y pagos posteriores se tratarán en flujos dedicados.

    let seedBranch = await branchRepo.findOne({
      where: { companyId: company.id, name: SEED_BRANCH_NAME },
      withDeleted: true,
    });
    if (!seedBranch) {
      seedBranch = branchRepo.create({
        companyId: company.id,
        name: SEED_BRANCH_NAME,
        address: SEED_BRANCH_ADDRESS,
        phone: SEED_BRANCH_PHONE,
        location: SEED_BRANCH_LOCATION,
        isActive: true,
        isHeadquarters: false,
      });
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo creada: «${SEED_BRANCH_NAME}» id=${seedBranch.id} companyId=${company.id}`,
      );
    } else {
      if (seedBranch.deletedAt) {
        seedBranch = await branchRepo.recover(seedBranch);
      }
      seedBranch.companyId = company.id;
      seedBranch.address = SEED_BRANCH_ADDRESS;
      seedBranch.phone = SEED_BRANCH_PHONE;
      seedBranch.location = SEED_BRANCH_LOCATION;
      seedBranch.isActive = true;
      seedBranch.isHeadquarters = false;
      await branchRepo.save(seedBranch);
      console.log(
        `✅ Sucursal ejemplo «${SEED_BRANCH_NAME}» ya existía: id=${seedBranch.id} (sincronizado con seed)`,
      );
    }

    // Almacenes (ejemplos): sala de venta en sucursal seed; depósito principal central
    const storageRepo = dataSource.getRepository(Storage);

    let seedSalaVenta = await storageRepo.findOne({
      where: { code: SEED_STORAGE_SALA_CODE },
      withDeleted: true,
    });
    if (!seedSalaVenta) {
      seedSalaVenta = storageRepo.create({
        name: SEED_STORAGE_SALA_NAME,
        code: SEED_STORAGE_SALA_CODE,
        branchId: seedBranch.id,
        type: StorageType.STORE,
        category: StorageCategory.IN_BRANCH,
        isDefault: false,
        isActive: true,
      });
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén ejemplo creado: «${SEED_STORAGE_SALA_NAME}» id=${seedSalaVenta.id} branchId=${seedBranch.id}`,
      );
    } else {
      if (seedSalaVenta.deletedAt) {
        seedSalaVenta = await storageRepo.recover(seedSalaVenta);
      }
      seedSalaVenta.name = SEED_STORAGE_SALA_NAME;
      seedSalaVenta.branchId = seedBranch.id;
      seedSalaVenta.type = StorageType.STORE;
      seedSalaVenta.category = StorageCategory.IN_BRANCH;
      seedSalaVenta.isDefault = false;
      seedSalaVenta.isActive = true;
      await storageRepo.save(seedSalaVenta);
      console.log(
        `✅ Almacén «${SEED_STORAGE_SALA_NAME}» ya existía: id=${seedSalaVenta.id} (sincronizado con seed)`,
      );
    }

    let seedDepositoPrincipal = await storageRepo.findOne({
      where: { code: SEED_STORAGE_DEPOSITO_CODE },
      withDeleted: true,
    });
    if (!seedDepositoPrincipal) {
      seedDepositoPrincipal = storageRepo.create({
        name: SEED_STORAGE_DEPOSITO_NAME,
        code: SEED_STORAGE_DEPOSITO_CODE,
        branchId: null,
        type: StorageType.WAREHOUSE,
        category: StorageCategory.CENTRAL,
        isDefault: true,
        isActive: true,
      });
      await storageRepo.save(seedDepositoPrincipal);
      console.log(`✅ Almacén ejemplo creado: «${SEED_STORAGE_DEPOSITO_NAME}» id=${seedDepositoPrincipal.id} (central)`);
    } else {
      if (seedDepositoPrincipal.deletedAt) {
        seedDepositoPrincipal = await storageRepo.recover(seedDepositoPrincipal);
      }
      seedDepositoPrincipal.name = SEED_STORAGE_DEPOSITO_NAME;
      seedDepositoPrincipal.branchId = null;
      seedDepositoPrincipal.type = StorageType.WAREHOUSE;
      seedDepositoPrincipal.category = StorageCategory.CENTRAL;
      seedDepositoPrincipal.isDefault = true;
      seedDepositoPrincipal.isActive = true;
      await storageRepo.save(seedDepositoPrincipal);
      console.log(
        `✅ Almacén «${SEED_STORAGE_DEPOSITO_NAME}» ya existía: id=${seedDepositoPrincipal.id} (sincronizado con seed)`,
      );
    }

    // Units (ejemplos): UNIDAD (base) y DOCENA (derivada)
    // Se alinean con la data existente en BD: dimension=count, allowDecimals=false.
    let baseUnit = await unitRepo.findOne({
      where: { symbol: SEED_UNIT_BASE_SYMBOL, deletedAt: null as never },
    });
    if (!baseUnit) {
      baseUnit = unitRepo.create({
        name: SEED_UNIT_BASE_NAME,
        symbol: SEED_UNIT_BASE_SYMBOL,
        dimension: UnitDimension.COUNT,
        conversionFactor: 1,
        allowDecimals: false,
        isBase: true,
        baseUnitId: null,
        active: true,
      });
      await unitRepo.save(baseUnit);
      console.log(`✅ Unidad ejemplo creada: ${baseUnit.symbol} (${baseUnit.name}) id=${baseUnit.id}`);
    } else {
      baseUnit.name = SEED_UNIT_BASE_NAME;
      baseUnit.dimension = UnitDimension.COUNT;
      baseUnit.conversionFactor = 1;
      baseUnit.allowDecimals = false;
      baseUnit.isBase = true;
      baseUnit.baseUnitId = null;
      baseUnit.active = true;
      await unitRepo.save(baseUnit);
      console.log(`✅ Unidad ejemplo ${baseUnit.symbol} ya existía: id=${baseUnit.id} (sincronizada con seed)`);
    }

    let dozen = await unitRepo.findOne({
      where: { symbol: SEED_UNIT_DERIVED_SYMBOL },
      withDeleted: true,
    });
    if (!dozen) {
      dozen = unitRepo.create({
        name: SEED_UNIT_DERIVED_NAME,
        symbol: SEED_UNIT_DERIVED_SYMBOL,
        dimension: UnitDimension.COUNT,
        conversionFactor: 12,
        allowDecimals: false,
        isBase: false,
        baseUnitId: baseUnit.id,
        active: false,
      });
      await unitRepo.save(dozen);
      console.log(`✅ Unidad ejemplo creada: ${dozen.symbol} (${dozen.name}) id=${dozen.id} base=${baseUnit.symbol}`);
    } else {
      if (dozen.deletedAt) {
        dozen = await unitRepo.recover(dozen);
      }
      dozen.name = SEED_UNIT_DERIVED_NAME;
      dozen.dimension = UnitDimension.COUNT;
      dozen.conversionFactor = 12;
      dozen.allowDecimals = false;
      dozen.isBase = false;
      dozen.baseUnitId = baseUnit.id;
      dozen.active = false;
      await unitRepo.save(dozen);
      console.log(`✅ Unidad ejemplo ${dozen.symbol} ya existía: id=${dozen.id} (sincronizada con seed)`);
    }

    // Categories (ejemplos): CAT 01 (padre) y CAT 02 (hija)
    const existingCat1 = await categoryRepo.findOne({
      where: { name: SEED_CATEGORY_PARENT_NAME },
    });
    const cat1 = existingCat1
      ? await categoryRepo.save({
          ...existingCat1,
          name: SEED_CATEGORY_PARENT_NAME,
          description: undefined,
          parentId: undefined,
          sortOrder: 0,
          isActive: true,
          resultCenterId: null,
        })
      : await categoryRepo.save(
          categoryRepo.create({
            name: SEED_CATEGORY_PARENT_NAME,
            description: undefined,
            parentId: undefined,
            sortOrder: 0,
            isActive: true,
            resultCenterId: null,
          }),
        );
    console.log(
      `✅ Categoría ejemplo ${cat1.name} ${existingCat1 ? 'ya existía' : 'creada'}: id=${cat1.id}`,
    );

    const existingCat2 = await categoryRepo.findOne({
      where: { name: SEED_CATEGORY_CHILD_NAME },
    });
    const cat2 = existingCat2
      ? await categoryRepo.save({
          ...existingCat2,
          name: SEED_CATEGORY_CHILD_NAME,
          description: undefined,
          parentId: cat1.id,
          sortOrder: 0,
          isActive: true,
          resultCenterId: null,
        })
      : await categoryRepo.save(
          categoryRepo.create({
            name: SEED_CATEGORY_CHILD_NAME,
            description: undefined,
            parentId: cat1.id,
            sortOrder: 0,
            isActive: true,
            resultCenterId: null,
          }),
        );
    console.log(
      `✅ Categoría ejemplo ${cat2.name} ${existingCat2 ? 'ya existía' : 'creada'}: id=${cat2.id} parent=${cat1.name}`,
    );

    // Atributos de catálogo (TALLA + 4 extras para demo en admin)
    let talla: Attribute | undefined;
    let peso: Attribute | undefined;
    for (const def of SEED_ATTRIBUTES) {
      const existingAttr = await attributeRepo.findOne({
        where: { name: def.name },
      });
      const saved = existingAttr
        ? await attributeRepo.save({
            ...existingAttr,
            description: undefined,
            options: [...def.options],
            displayOrder: def.displayOrder,
            isActive: true,
          })
        : await attributeRepo.save(
            attributeRepo.create({
              name: def.name,
              description: undefined,
              options: [...def.options],
              displayOrder: def.displayOrder,
              isActive: true,
            }),
          );
      if (def.name === 'TALLA') {
        talla = saved;
      }
      if (def.name === 'PESO') {
        peso = saved;
      }
      console.log(
        `✅ Atributo ${saved.name} ${existingAttr ? 'ya existía' : 'creado'}: id=${saved.id}`,
      );
    }
    if (!talla) {
      throw new Error('Seed minimal: atributo TALLA no sincronizado');
    }
    if (!peso) {
      throw new Error('Seed minimal: atributo PESO no sincronizado');
    }

    // Price lists (ejemplos): MINORISTA (RETAIL, default) y MAYORISTA (WHOLESALE)
    const existingRetail = await priceListRepo.findOne({
      where: { name: SEED_PRICE_LIST_RETAIL_NAME },
    });
    const minorista = existingRetail
      ? await priceListRepo.save({
          ...existingRetail,
          priceListType: PriceListType.RETAIL,
          currency: 'CLP',
          validFrom: undefined,
          validUntil: undefined,
          priority: 0,
          isDefault: true,
          isActive: true,
          description: undefined,
        })
      : await priceListRepo.save(
          priceListRepo.create({
            name: SEED_PRICE_LIST_RETAIL_NAME,
            priceListType: PriceListType.RETAIL,
            currency: 'CLP',
            validFrom: undefined,
            validUntil: undefined,
            priority: 0,
            isDefault: true,
            isActive: true,
            description: undefined,
          }),
        );
    console.log(
      `✅ Lista de precios ${minorista.name} ${existingRetail ? 'ya existía' : 'creada'}: id=${minorista.id}`,
    );

    const existingWholesale = await priceListRepo.findOne({
      where: { name: SEED_PRICE_LIST_WHOLESALE_NAME },
    });
    const mayorista = existingWholesale
      ? await priceListRepo.save({
          ...existingWholesale,
          priceListType: PriceListType.WHOLESALE,
          currency: 'CLP',
          validFrom: undefined,
          validUntil: undefined,
          priority: 0,
          isDefault: false,
          isActive: true,
          description: undefined,
        })
      : await priceListRepo.save(
          priceListRepo.create({
            name: SEED_PRICE_LIST_WHOLESALE_NAME,
            priceListType: PriceListType.WHOLESALE,
            currency: 'CLP',
            validFrom: undefined,
            validUntil: undefined,
            priority: 0,
            isDefault: false,
            isActive: true,
            description: undefined,
          }),
        );
    console.log(
      `✅ Lista de precios ${mayorista.name} ${existingWholesale ? 'ya existía' : 'creada'}: id=${mayorista.id}`,
    );

    // ---------------------------------------------------------------------
    // Productos demo (catálogo): físico varias presentaciones, multivariante tallas, servicio, digital, insumo BOM
    // ---------------------------------------------------------------------
    const productRepo = dataSource.getRepository(Product);
    const variantRepo = dataSource.getRepository(ProductVariant);
    const priceListItemRepo = dataSource.getRepository(PriceListItem);

    type SeedVariantSeed = {
      sku: string;
      barcode?: string;
      basePrice: number;
      baseCost: number;
      pmp: number;
      trackInventory: boolean;
      allowNegativeStock?: boolean;
      attributeValues?: Record<string, string>;
      retailNet: number;
      wholesaleNet: number;
    };

    type SeedProductSeed = {
      name: string;
      brand?: string;
      description?: string;
      productType: ProductType;
      categoryId: string;
      variants: SeedVariantSeed[];
    };

    const seedDemoProducts: SeedProductSeed[] = [
      {
        name: 'Café de grano',
        brand: 'Origen Sur',
        description:
          'Físico con tres presentaciones por peso (250 g, 500 g, 1 kg); inventario rastreado; típico venta minorista / compra a proveedor.',
        productType: ProductType.PHYSICAL,
        categoryId: cat2.id,
        variants: [
          {
            sku: 'SEED-DEMO-CAFE-250',
            barcode: '7800001002501',
            basePrice: 2790,
            baseCost: 1200,
            pmp: 1400,
            trackInventory: true,
            attributeValues: { [peso.id]: '250 g' },
            retailNet: 2790,
            wholesaleNet: 2350,
          },
          {
            sku: 'SEED-DEMO-CAFE-500',
            barcode: '7800001005001',
            basePrice: 4990,
            baseCost: 2200,
            pmp: 2500,
            trackInventory: true,
            attributeValues: { [peso.id]: '500 g' },
            retailNet: 4990,
            wholesaleNet: 4200,
          },
          {
            sku: 'SEED-DEMO-CAFE-1KG',
            barcode: '7800001010001',
            basePrice: 8990,
            baseCost: 4000,
            pmp: 4500,
            trackInventory: true,
            attributeValues: { [peso.id]: '1 kg' },
            retailNet: 8990,
            wholesaleNet: 7600,
          },
        ],
      },
      {
        name: 'Polera algodón estampada',
        brand: 'Demo Wear',
        description:
          'Físico multivariante (varias tallas) usando el atributo TALLA del seed; mismo producto, SKUs distintos.',
        productType: ProductType.PHYSICAL,
        categoryId: cat1.id,
        variants: [
          {
            sku: 'SEED-DEMO-POL-XS',
            barcode: '7800002001000',
            basePrice: 11990,
            baseCost: 5600,
            pmp: 6000,
            trackInventory: true,
            attributeValues: { [talla.id]: 'XS' },
            retailNet: 11990,
            wholesaleNet: 10200,
          },
          {
            sku: 'SEED-DEMO-POL-SM',
            barcode: '7800002000999',
            basePrice: 12490,
            baseCost: 5800,
            pmp: 6200,
            trackInventory: true,
            attributeValues: { [talla.id]: 'SM' },
            retailNet: 12490,
            wholesaleNet: 10600,
          },
          {
            sku: 'SEED-DEMO-POL-ML',
            barcode: '7800002001001',
            basePrice: 12990,
            baseCost: 6000,
            pmp: 6500,
            trackInventory: true,
            attributeValues: { [talla.id]: 'M' },
            retailNet: 12990,
            wholesaleNet: 11000,
          },
          {
            sku: 'SEED-DEMO-POL-LG',
            barcode: '7800002001002',
            basePrice: 12990,
            baseCost: 6000,
            pmp: 6500,
            trackInventory: true,
            attributeValues: { [talla.id]: 'L' },
            retailNet: 12990,
            wholesaleNet: 11000,
          },
          {
            sku: 'SEED-DEMO-POL-XL',
            barcode: '7800002001003',
            basePrice: 13490,
            baseCost: 6200,
            pmp: 6700,
            trackInventory: true,
            attributeValues: { [talla.id]: 'XL' },
            retailNet: 13490,
            wholesaleNet: 11400,
          },
          {
            sku: 'SEED-DEMO-POL-XXL',
            barcode: '7800002001004',
            basePrice: 13990,
            baseCost: 6400,
            pmp: 6900,
            trackInventory: true,
            attributeValues: { [talla.id]: 'XXL' },
            retailNet: 13990,
            wholesaleNet: 11800,
          },
        ],
      },
      {
        name: 'Servicio armado de pedido en tienda',
        brand: 'Demo Servicios',
        description:
          'Servicio (tipo SERVICE): variante única; consumos por receta/BOM al completar órdenes de servicio.',
        productType: ProductType.SERVICE,
        categoryId: cat1.id,
        variants: [
          {
            sku: 'SEED-DEMO-SRV-ARM',
            basePrice: 3500,
            baseCost: 0,
            pmp: 0,
            trackInventory: false,
            allowNegativeStock: false,
            retailNet: 3500,
            wholesaleNet: 3000,
          },
        ],
      },
      {
        name: 'Pack plantillas hoja de cálculo (digital)',
        brand: 'Demo Digital',
        description:
          'Digital: sin stock físico; útil para ventas documentadas y flujos sin inventario.',
        productType: ProductType.DIGITAL,
        categoryId: cat2.id,
        variants: [
          {
            sku: 'SEED-DEMO-DIG-XLS',
            basePrice: 15000,
            baseCost: 0,
            pmp: 0,
            trackInventory: false,
            retailNet: 15000,
            wholesaleNet: 12000,
          },
        ],
      },
      {
        name: 'Harina integral saco 25 kg',
        brand: 'Molino Demo',
        description:
          'Materia prima / insumo físico (25 kg y 5 kg) para recepciones y líneas de receta (BOM) hacia servicios o producción.',
        productType: ProductType.PHYSICAL,
        categoryId: cat2.id,
        variants: [
          {
            sku: 'SEED-DEMO-MP-HAR25',
            barcode: '7800003002501',
            basePrice: 18990,
            baseCost: 12000,
            pmp: 12500,
            trackInventory: true,
            retailNet: 18990,
            wholesaleNet: 16500,
          },
          {
            sku: 'SEED-DEMO-MP-HAR5',
            barcode: '7800003005001',
            basePrice: 45990,
            baseCost: 28000,
            pmp: 30000,
            trackInventory: true,
            retailNet: 45990,
            wholesaleNet: 39900,
          },
        ],
      },
    ];

    const upsertPriceListItem = async (args: {
      priceListId: string;
      productId: string;
      productVariantId: string;
      net: number;
      taxId: string;
    }) => {
      const gross = Math.round(args.net * 1.19);
      let row = await priceListItemRepo.findOne({
        where: {
          priceListId: args.priceListId,
          productId: args.productId,
          productVariantId: args.productVariantId,
        },
      });
      if (!row) {
        row = priceListItemRepo.create({
          priceListId: args.priceListId,
          productId: args.productId,
          productVariantId: args.productVariantId,
          netPrice: args.net,
          grossPrice: gross,
          taxIds: [args.taxId],
        });
      } else {
        row.netPrice = args.net;
        row.grossPrice = gross;
        row.taxIds = [args.taxId];
      }
      await priceListItemRepo.save(row);
    };

    for (const def of seedDemoProducts) {
      let product = await productRepo.findOne({
        where: { name: def.name },
      });
      const productPayload = {
        name: def.name,
        brand: def.brand,
        description: def.description,
        productType: def.productType,
        categoryId: def.categoryId,
        taxIds: [ivaTax.id],
        isActive: true,
        baseUnitId: baseUnit.id,
      };
      if (!product) {
        product = productRepo.create(productPayload);
      } else {
        Object.assign(product, productPayload);
      }
      product = await productRepo.save(product);

      for (const vd of def.variants) {
        let variant = await variantRepo.findOne({ where: { sku: vd.sku } });
        const variantPayload = {
          productId: product.id,
          sku: vd.sku,
          barcode: vd.barcode,
          basePrice: vd.basePrice,
          baseCost: vd.baseCost,
          pmp: vd.pmp,
          unitId: baseUnit.id,
          attributeValues: vd.attributeValues ?? undefined,
          taxIds: [ivaTax.id],
          trackInventory: vd.trackInventory,
          allowNegativeStock: vd.allowNegativeStock ?? false,
          isActive: true,
          minimumStock: 0,
          maximumStock: 0,
          reorderPoint: 0,
        };
        if (!variant) {
          variant = variantRepo.create(variantPayload);
        } else {
          Object.assign(variant, variantPayload);
        }
        variant = await variantRepo.save(variant);

        await upsertPriceListItem({
          priceListId: minorista.id,
          productId: product.id,
          productVariantId: variant.id,
          net: vd.retailNet,
          taxId: ivaTax.id,
        });
        await upsertPriceListItem({
          priceListId: mayorista.id,
          productId: product.id,
          productVariantId: variant.id,
          net: vd.wholesaleNet,
          taxId: ivaTax.id,
        });
      }

      console.log(
        `✅ Producto demo sincronizado: «${def.name}» (${def.productType}) variantes=${def.variants.length} productId=${product.id}`,
      );
    }

    // Point of sale (ejemplo): CAJA LOCAL en sucursal seed con listas de precios
    const priceListsJson = [
      { id: minorista.id, name: minorista.name, isActive: true },
      { id: mayorista.id, name: mayorista.name, isActive: true },
    ];
    const existingPos = await posRepo.findOne({
      where: { name: SEED_POS_NAME },
    });
    const caja = existingPos
      ? await posRepo.save({
          ...existingPos,
          branchId: seedBranch.id,
          isActive: true,
          deviceId: undefined,
          defaultPriceListId: minorista.id,
          priceLists: priceListsJson,
        })
      : await posRepo.save(
          posRepo.create({
            name: SEED_POS_NAME,
            branchId: seedBranch.id,
            isActive: true,
            deviceId: undefined,
            defaultPriceListId: minorista.id,
            priceLists: priceListsJson,
          }),
        );
    console.log(
      `✅ Punto de venta ${caja.name} ${existingPos ? 'ya existía' : 'creado'}: id=${caja.id}`,
    );

    // Expense categories (seed explícito): limpiar y recrear catálogo por empresa.
    const deleteResult = await expenseCategoryRepo
      .createQueryBuilder()
      .delete()
      .from(ExpenseCategory)
      .where('companyId = :companyId', { companyId: company.id })
      .execute();
    console.log(
      `✅ Categorías de gasto eliminadas para companyId=${company.id}: ${deleteResult.affected ?? 0}`,
    );

    for (const item of SEED_EXPENSE_CATEGORIES) {
      const row = expenseCategoryRepo.create({
        companyId: company.id,
        code: null,
        name: item.name,
        operationalExpenseGroup: item.operationalExpenseGroup,
        description: item.name,
        requiresApproval: false,
        approvalThreshold: '0',
        defaultResultCenterId: null,
        isActive: true,
        examples: null,
        metadata: null,
      });
      await expenseCategoryRepo.save(row);
      console.log(
        `✅ Categoría de gasto creada: ${row.name} (${row.operationalExpenseGroup}) id=${row.id}`,
      );
    }

    // Suppliers (ejemplos): 10 combinaciones entre persona/empresa y campos opcionales.
    for (const item of SEED_SUPPLIERS) {
      let person = await personRepo.findOne({
        where: { documentNumber: item.person.documentNumber, deletedAt: null as never },
      });
      if (!person) {
        person = personRepo.create({
          type: item.person.type,
          firstName: item.person.firstName,
          lastName: item.person.lastName,
          businessName: item.person.businessName,
          documentType: item.person.documentType,
          documentNumber: item.person.documentNumber,
          email: item.person.email,
          phone: item.person.phone,
          address: item.person.address,
        });
      } else {
        person.type = item.person.type;
        person.firstName = item.person.firstName;
        person.lastName = item.person.lastName;
        person.businessName = item.person.businessName;
        person.documentType = item.person.documentType;
        person.email = item.person.email;
        person.phone = item.person.phone;
        person.address = item.person.address;
      }
      person = await personRepo.save(person);

      let supplier = await supplierRepo.findOne({
        where: { personId: person.id },
        withDeleted: true,
      });
      if (!supplier) {
        supplier = supplierRepo.create({
          personId: person.id,
          supplierType: item.supplier.supplierType,
          alias: item.supplier.alias,
          defaultPaymentTermDays: item.supplier.defaultPaymentTermDays,
          isActive: item.supplier.isActive,
          notes: item.supplier.notes,
        });
      } else {
        if (supplier.deletedAt) {
          supplier = await supplierRepo.recover(supplier);
        }
        supplier.personId = person.id;
        supplier.supplierType = item.supplier.supplierType;
        supplier.alias = item.supplier.alias;
        supplier.defaultPaymentTermDays = item.supplier.defaultPaymentTermDays;
        supplier.isActive = item.supplier.isActive;
        supplier.notes = item.supplier.notes;
      }
      supplier = await supplierRepo.save(supplier);
      console.log(
        `✅ Proveedor ${supplier.alias ?? person.businessName ?? `${person.firstName} ${person.lastName ?? ''}`.trim()} sincronizado: id=${supplier.id} tipo=${supplier.supplierType}`,
      );
    }

    let user = await userRepo.findOne({
      where: { userName, deletedAt: null as never },
      relations: ['person'],
    });

    if (!user) {
      const person = personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Administrador',
        lastName: 'Sistema',
        documentType: DocumentType.RUT,
        documentNumber: '11111111-1',
        email,
      });
      const savedPerson = await personRepo.save(person);

      user = userRepo.create({
        userName,
        pass: await bcrypt.hash(password, 12),
        mail: email,
        rol: UserRole.ADMIN,
        person: savedPerson,
      });
      await userRepo.save(user);

      console.log(
        `✅ Seed mínimo OK. Usuario creado: userName='${userName}' password='${password}'`,
      );
      return;
    }

    // If user exists, ensure it's loginable (password hashed, email/role set)
    const needsBcrypt = !user.pass?.startsWith('$2');
    if (needsBcrypt) {
      user.pass = await bcrypt.hash(password, 12);
    }
    user.mail = email;
    user.rol = UserRole.ADMIN;

    if (!user.person) {
      const person = personRepo.create({
        type: PersonType.NATURAL,
        firstName: 'Administrador',
        lastName: 'Sistema',
        documentType: DocumentType.RUT,
        documentNumber: '11111111-1',
        email,
      });
      user.person = await personRepo.save(person);
    } else if (!user.person.email) {
      user.person.email = email;
      await personRepo.save(user.person);
    }

    await userRepo.save(user);

    console.log(
      `✅ Seed mínimo OK. Usuario actualizado: userName='${userName}' password='${password}'`,
    );
  } catch (error) {
    console.error('❌ Error ejecutando seed mínimo:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
