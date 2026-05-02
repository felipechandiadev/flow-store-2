import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from '../config/typeorm.config';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { Tax } from '@modules/taxes/domain/tax.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { Category } from '@modules/categories/domain/category.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { PriceList } from '@modules/price-lists/domain/price-list.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import { Supplier } from '@modules/suppliers/domain/supplier.entity';
import { AccountingAccount } from '@modules/accounting-accounts/domain/accounting-account.entity';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';
import { AccountingRuleLine } from '@modules/accounting-rules/domain/accounting-rule-line.entity';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';

/**
 * Misma conexión y entidades que el API: el esquema lo define TypeORM vía
 * `DB_SYNCHRONIZE` (ver `typeorm.config.ts`). Este módulo solo aporta repositorios para el script de seed.
 */
@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: typeOrmConfig,
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      Person,
      Company,
      Tax,
      Branch,
      Unit,
      Category,
      Attribute,
      PriceList,
      PointOfSale,
      ExpenseCategory,
      Supplier,
      AccountingAccount,
      AccountingRule,
      AccountingRuleLine,
      Product,
      ProductVariant,
      PriceListItem,
      Storage,
    ]),
  ],
})
export class MinimalSeedModule {}
