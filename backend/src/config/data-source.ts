import { DataSource } from 'typeorm';
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar igual que en desarrollo: .env y opcional .env.local / .env.development (override)
const _dsRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(_dsRoot, '.env') });
dotenv.config({ path: path.join(_dsRoot, '.env.local') });
dotenv.config({ path: path.join(_dsRoot, '.env.development') });

// Import all entities
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { DocumentSequence } from '@modules/transactions/domain/document-sequence.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { OperationalExpense } from '@modules/operational-expenses/domain/operational-expense.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { AccountingPeriodSnapshot } from '@modules/accounting-period-snapshots/domain/accounting-period-snapshot.entity';
import { AccountBalance } from '@modules/account-balances/domain/account-balance.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import { Audit } from '@modules/audits/domain/audit.entity';
import { Permission } from '@modules/permissions/domain/permission.enum';
import { LedgerEntry } from '@modules/ledger-entries/domain/ledger-entry.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { Employee } from '@modules/employees/domain/employee.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Budget } from '@modules/budgets/domain/budget.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Reception } from '@modules/receptions/domain/reception.entity';
import { ReceptionLine } from '@modules/receptions/domain/reception-line.entity';
import { Installment } from '@modules/installments/domain/installment.entity';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { CashHub } from '@modules/cash-hubs/domain/cash-hub.entity';
import { AccountingRuleLine } from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { AutomationRule } from '@modules/automation/domain/automation-rule.entity';
import { AutomationAction } from '@modules/automation/domain/automation-action.entity';
import { Recipe } from '@modules/recipes/domain/recipe.entity';
import { RecipeLine } from '@modules/recipes/domain/recipe-line.entity';
import { Check } from '@modules/checks/domain/check.entity';
import { CheckTransactionLink } from '@modules/checks/domain/check-transaction-link.entity';
import { CheckEvent } from '@modules/checks/domain/check-event.entity';
import { AuditSubscriber } from '../subscribers/AuditSubscriber';
import { TenantSubscriber } from '../common/tenant/tenant.subscriber';
import { AddTaxNonDeletable1740000000000 } from '../migrations/1740000000000-AddTaxNonDeletable';
import { CashHubsAndSessionToHub1741000000000 } from '../migrations/1741000000000-CashHubsAndSessionToHub';
import { AddCashSessionToHubTransferAccountingRuleEnum1741100000000 } from '../migrations/1741100000000-AddCashSessionToHubTransferAccountingRuleEnum';
import { MultiCompanyInit1742000000000 } from '../migrations/1742000000000-MultiCompanyInit';
import { PosSettingsJson1743000000000 } from '../migrations/1743000000000-PosSettingsJson';
import { Checks1744000000000 } from '../migrations/1744000000000-Checks';
import { Quotations1745000000000 } from '../migrations/1745000000000-Quotations';
import { EnsureDocumentSequences1746000000000 } from '../migrations/1746000000000-EnsureDocumentSequences';

/**
 * DataSource usado por `typeorm` CLI (`migration:run`, `schema:log`, …).
 * Migraciones explícitas en `src/migrations/`; en desarrollo también puede aplicarse DDL vía
 * `DB_SYNCHRONIZE=true` en Nest (`typeorm.config.ts`).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  /** Postgres no usa "root"; alinear con .env.example / usuario local típico */
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'flow-store',
  /** Misma lógica que el API: solo genera DDL si el env lo pide */
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  entities: [
    PointOfSale,
    Branch,
    Company,
    PriceList,
    User,
    Person,
    CashSession,
    Transaction,
    DocumentSequence,
    TransactionLine,
    Product,
    ProductVariant,
    Customer,
    Tax,
    Unit,
    Category,
    Supplier,
    TreasuryAccount,
    Storage,
    ResultCenter,
    ExpenseCategory,
    OperationalExpense,
    AccountingAccount,
    AccountingRule,
    AccountingRuleLine,
    AutomationRule,
    AutomationAction,
    Recipe,
    RecipeLine,
    AccountingPeriod,
    AccountingPeriodSnapshot,
    AccountBalance,
    Attribute,
    PriceListItem,
    MetalPrice,
    Audit,
    Permission,
    LedgerEntry,
    OrganizationalUnit,
    Employee,
    Shareholder,
    Budget,
    StockLevel,
    Reception,
    ReceptionLine,
    Installment,
    MultimediaAsset,
    MultimediaLink,
    CashHub,
    Check,
    CheckTransactionLink,
    CheckEvent,
  ],
  subscribers: [AuditSubscriber, TenantSubscriber],
  migrations: [
    AddTaxNonDeletable1740000000000,
    CashHubsAndSessionToHub1741000000000,
    AddCashSessionToHubTransferAccountingRuleEnum1741100000000,
    MultiCompanyInit1742000000000,
    PosSettingsJson1743000000000,
    Checks1744000000000,
    Quotations1745000000000,
    EnsureDocumentSequences1746000000000,
  ],
  migrationsTableName: 'typeorm_migrations',
  logging: process.env.DB_LOGGING === 'true',
  extra: {
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    enableKeepAlive: true,
    decimalNumbers: true,
  },
});
