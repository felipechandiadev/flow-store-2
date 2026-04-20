import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';

// Import all entity modules if needed for repositories
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { CashSession } from '@modules/cash-sessions/domain/cash-session.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingPeriod } from '@modules/accounting-periods/domain/accounting-period.entity';
import { Transaction } from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { OrganizationalUnit } from '@modules/organizational-units/domain/organizational-unit.entity';
import { Employee } from '@modules/employees/domain/employee.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Branch,
      User,
      Person,
      Customer,
      Supplier,
      Shareholder,
      Tax,
      Category,
      PriceList,
      PriceListItem,
      Storage,
      PointOfSale,
      CashSession,
      Attribute,
      Product,
      ProductVariant,
      Unit,
      AccountingAccount,
      ExpenseCategory,
      AccountingRule,
      AccountingPeriod,
      Transaction,
      TransactionLine,
      TreasuryAccount,
      ResultCenter,
      OrganizationalUnit,
      Employee,
    ]),
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
