import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Import entities using @modules alias
import { Company } from '@modules/companies/domain/company.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User, UserRole } from '@modules/users/domain/user.entity';
import {
  Person,
  PersonType,
  DocumentType,
  BankName,
  AccountTypeName,
} from '@modules/persons/domain/person.entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import {
  Supplier,
  SupplierType,
} from '@modules/suppliers/domain/supplier.entity';
import { Shareholder } from '@modules/shareholders/domain/shareholder.entity';
import { Tax, TaxType } from '@modules/taxes/domain/tax.entity';
import { Category } from '@modules/categories/domain/category.entity';
import {
  PriceList,
  PriceListType,
} from '@modules/price-lists/domain/price-list.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  Storage,
  StorageCategory,
  StorageType,
} from '@modules/storages/domain/storage.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { Permission } from '@modules/permissions/domain/permission.enum';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { Product, ProductType } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { MultimediaAsset } from '@modules/multimedia/domain/multimedia-asset.entity';
import { MultimediaLink } from '@modules/multimedia/domain/multimedia-link.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { MetalPrice } from '@modules/metal-prices/domain/metal-price.entity';
import {
  AccountingAccount,
  AccountType,
} from '@modules/accounting-accounts/domain/accounting-account.entity';
import { ExpenseCategory } from '@modules/expense-categories/domain/expense-category.entity';
import {
  AccountingRule,
  RuleScope,
} from '@modules/accounting-rules/domain/accounting-rule.entity';
import {
  AccountingPeriod,
  AccountingPeriodStatus,
} from '@modules/accounting-periods/domain/accounting-period.entity';
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { TreasuryAccount } from '@modules/treasury-accounts/domain/treasury-account.entity';
import {
  ResultCenter,
  ResultCenterType,
} from '@modules/result-centers/domain/result-center.entity';
import {
  OrganizationalUnit,
  OrganizationalUnitType,
} from '@modules/organizational-units/domain/organizational-unit.entity';
import {
  Employee,
  EmploymentType,
  EmployeeStatus,
} from '@modules/employees/domain/employee.entity';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ejecuta el seed completo de FlowStore
   */
  async seedFlowStore(): Promise<void> {
    this.logger.log('💎 FlowStore Joyería - Seed Inicial');
    this.logger.log(
      '═══════════════════════════════════════════════════════════',
    );

    await this.cleanCorruptData();
    await this.verifyConnection();
    await this.resetDatabase();
    await this.createSeedData();

    this.logger.log('✅ Seed completado exitosamente');
  }

  private async cleanCorruptData(): Promise<void> {
    this.logger.log('🧹 Limpiando datos corruptos...');
    try {
      await this.dataSource.query(
        "DELETE FROM permissions WHERE ability IS NULL OR ability = ''",
      );
      this.logger.log('   ✓ Datos corruptos limpiados');
    } catch (error) {
      this.logger.warn(
        '   ⚠ No se pudieron limpiar datos (tabla puede no existir aún)',
      );
    }
  }

  private async verifyConnection(): Promise<void> {
    this.logger.log('🔄 Verificando conexión a base de datos...');
    try {
      await this.dataSource.query('SELECT 1');
      this.logger.log('   ✓ Conexión verificada correctamente');
    } catch (error) {
      this.logger.error('   ✗ Error verificando conexión:', error);
      throw error;
    }
  }

  private async resetDatabase(): Promise<void> {
    this.logger.log('🧨 Reiniciando base de datos...');
    const queryRunner = this.dataSource.createQueryRunner();
    let foreignKeysDisabled = false;

    try {
      await queryRunner.connect();
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
      foreignKeysDisabled = true;

      const tables: Array<{ tableName: string | null }> =
        await queryRunner.query(
          `SELECT table_name AS tableName 
           FROM information_schema.tables 
           WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
        );

      const tablesToSkip = new Set(['migrations', 'typeorm_metadata']);

      for (const { tableName } of tables) {
        if (!tableName || tablesToSkip.has(tableName)) {
          continue;
        }
        await queryRunner.query(`TRUNCATE TABLE \`${tableName}\``);
      }

      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      foreignKeysDisabled = false;
      this.logger.log('   ✓ Base de datos reiniciada');
    } catch (error) {
      this.logger.warn('   ⚠ No se pudo reiniciar la base de datos:', error);
      throw error;
    } finally {
      if (foreignKeysDisabled) {
        try {
          await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
        } catch (fkError) {
          this.logger.warn(
            '   ⚠ No se pudieron restaurar llaves foráneas automáticamente',
          );
        }
      }
      await queryRunner.release();
    }
  }

  private async createSeedData(): Promise<void> {
    this.logger.log('🏢 Creando datos iniciales...');

    try {
      // Load seed data from JSON files
      const companies = await this.readSeedJson<any[]>('companies.json');
      const users = await this.readSeedJson<any[]>('users.json');
      const shareholders = await this.readSeedJson<any[]>('shareholders.json');
      const units = await this.readSeedJson<any[]>('units.json');
      const customers = await this.readSeedJson<any[]>('customers.json');
      const suppliers = await this.readSeedJson<any[]>('suppliers.json');
      const employees = await this.readSeedJson<any[]>('employees.json');
      const branches = await this.readSeedJson<any[]>('branches.json');
      const storages = await this.readSeedJson<any[]>('storages.json');
      const organizationalUnits = await this.readSeedJson<any[]>(
        'organizational-units.json',
      );
      const priceLists = await this.readSeedJson<any[]>('price-lists.json');
      const taxes = await this.readSeedJson<any[]>('taxes.json');
      const metalPrices = await this.readSeedJson<any[]>('metal-prices.json');
      const accountingAccounts = await this.readSeedJson<any[]>(
        'accounting-accounts.json',
      );
      const accountingRules = await this.readSeedJson<any[]>(
        'accounting-rules.json',
      );
      const productCategories =
        await this.readSeedJson<any[]>('categories.json');
      const expenseCategories = await this.readSeedJson<any[]>(
        'expense-categories.json',
      );

      const companyMap = new Map<string, Company>();
      const branchMap = new Map<string, Branch>();
      const categoryMap = new Map<string, Category>();
      const accountMap = new Map<string, AccountingAccount>();
      const taxMap = new Map<string, Tax>();
      const organizationalUnitMap = new Map<string, OrganizationalUnit>();
      const expenseCategoryMap = new Map<string, ExpenseCategory>();

      // 1. Create Companies and Bank Accounts
      if (companies && companies.length > 0) {
        for (const companyData of companies) {
          const company = this.dataSource.manager.create(Company, {
            name:
              companyData.businessName || companyData.name || 'Default Company',
            defaultCurrency: companyData.defaultCurrency || 'CLP',
            fiscalYearStart: companyData.fiscalYearStart,
            isActive: true,
            bankAccounts: companyData.bankAccounts || [],
          });
          const savedCompany = await this.dataSource.manager.save(company);
          companyMap.set(companyData.name || 'joyarte-spa', savedCompany);
          this.logger.log(`   ✓ Empresa '${savedCompany.name}' creada`);
        }
      }

      // Get the first company for shareholders
      const defaultCompany = companyMap.values().next().value as Company;

      // 2. Create Taxes
      if (taxes && taxes.length > 0 && defaultCompany) {
        for (const taxData of taxes) {
          const tax = this.dataSource.manager.create(Tax, {
            companyId: defaultCompany.id,
            name: taxData.name,
            code: taxData.code,
            taxType: taxData.taxType
              ? this.parseEnum(TaxType, taxData.taxType, 'tax.taxType')
              : TaxType.IVA,
            rate: taxData.rate ?? 0,
            description: taxData.description ?? undefined,
            isDefault: !!taxData.isDefault,
            isActive: taxData.isActive !== false,
          });
          const savedTax = await this.dataSource.manager.save(tax);
          if (taxData.code) {
            taxMap.set(taxData.code, savedTax);
          }
          this.logger.log(`   ✓ Impuesto '${taxData.name}' creado`);
        }
      }

      // 3. Create Metal Prices
      if (metalPrices && metalPrices.length > 0) {
        for (const priceData of metalPrices) {
          const metalPrice = this.dataSource.manager.create(MetalPrice, {
            metal: priceData.metal || 'Oro 18K',
            date: new Date(priceData.date),
            valueCLP: priceData.valueCLP,
            notes: priceData.notes ?? undefined,
          });
          await this.dataSource.manager.save(metalPrice);
          this.logger.log(`   ✓ Metal price '${metalPrice.metal}' created`);
        }
      }

      // 4. Create Accounting Accounts
      if (
        accountingAccounts &&
        accountingAccounts.length > 0 &&
        defaultCompany
      ) {
        for (const accountData of accountingAccounts) {
          const parent = accountData.parentRef
            ? accountMap.get(accountData.parentRef)
            : null;
          const account = this.dataSource.manager.create(AccountingAccount, {
            companyId: defaultCompany.id,
            code: accountData.code,
            name: accountData.name,
            type: this.parseEnum(
              AccountType,
              accountData.type,
              `accountingAccounts.${accountData.code}`,
            ),
            parentId: parent?.id ?? null,
            isActive: accountData.isActive !== false,
          });
          const savedAccount = await this.dataSource.manager.save(account);
          if (accountData.ref) {
            accountMap.set(accountData.ref, savedAccount);
          }
          this.logger.log(
            `   ✓ Cuenta contable '${accountData.code} ${accountData.name}' creada`,
          );
        }
      }

      // 5. Create Accounting Rules
      if (accountingRules && accountingRules.length > 0 && defaultCompany) {
        for (const ruleData of accountingRules) {
          const debitAccount = accountMap.get(ruleData.debitAccountRef);
          const creditAccount = accountMap.get(ruleData.creditAccountRef);
          if (!debitAccount || !creditAccount) {
            this.logger.warn(
              `   ⚠ Regla contable '${ruleData.ref ?? ruleData.transactionType}' omitida: cuenta no encontrada`,
            );
            continue;
          }

          const tax = ruleData.taxCode ? taxMap.get(ruleData.taxCode) : null;

          const rule = this.dataSource.manager.create(AccountingRule, {
            companyId: defaultCompany.id,
            appliesTo: this.parseEnum(
              RuleScope,
              ruleData.appliesTo,
              'accountingRules.appliesTo',
            ),
            transactionType: this.parseEnum(
              TransactionType,
              ruleData.transactionType,
              'accountingRules.transactionType',
            ),
            paymentMethod: ruleData.paymentMethod
              ? this.parseEnum(
                  PaymentMethod,
                  ruleData.paymentMethod,
                  'accountingRules.paymentMethod',
                )
              : null,
            debitAccountId: debitAccount.id,
            creditAccountId: creditAccount.id,
            taxId: tax?.id ?? null,
            expenseCategoryId: null,
            priority: ruleData.priority ?? 0,
            isActive: ruleData.isActive !== false,
          });
          await this.dataSource.manager.save(rule);
          this.logger.log(
            `   ✓ Regla contable '${ruleData.ref ?? ruleData.transactionType}' creada`,
          );
        }
      }

      // 5b. Create Expense Categories
      if (expenseCategories && expenseCategories.length > 0 && defaultCompany) {
        for (const categoryData of expenseCategories) {
          const category = this.dataSource.manager.create(ExpenseCategory, {
            companyId: defaultCompany.id,
            code: categoryData.code,
            name: categoryData.name,
            groupName: categoryData.groupName ?? undefined,
            description: categoryData.description ?? undefined,
            requiresApproval: categoryData.requiresApproval ?? false,
            approvalThreshold:
              categoryData.approvalThreshold?.toString() ?? '0',
            defaultResultCenterId: null,
            isActive: categoryData.isActive !== false,
            examples: categoryData.examples ?? [],
            metadata: categoryData.metadata ?? null,
          });
          const savedCategory = await this.dataSource.manager.save(category);
          if (categoryData.ref) {
            expenseCategoryMap.set(categoryData.ref, savedCategory);
          }
          this.logger.log(
            `   ✓ Categoría de gasto '${categoryData.name}' creada`,
          );
        }
      }

      // 5c. Create Product Categories (with hierarchy support)
      if (productCategories && productCategories.length > 0) {
        // First pass: create parent categories
        for (const categoryData of productCategories) {
          if (!categoryData.parentRef) {
            const category = this.dataSource.manager.create(Category, {
              name: categoryData.name,
              description: categoryData.description ?? undefined,
              parentId: undefined,
              sortOrder: categoryData.sortOrder ?? 0,
              isActive: categoryData.isActive !== false,
              resultCenterId: undefined,
            });
            const savedCategory = await this.dataSource.manager.save(category);
            await this.createSeedMultimediaLink(
              'category',
              savedCategory.id,
              categoryData.imagePath,
              'primary-image',
            );
            if (categoryData.ref) {
              categoryMap.set(categoryData.ref, savedCategory);
            }
            this.logger.log(
              `   ✓ Categoría de producto '${categoryData.name}' creada`,
            );
          }
        }

        // Second pass: create child categories
        for (const categoryData of productCategories) {
          if (categoryData.parentRef) {
            const parent = categoryMap.get(categoryData.parentRef);
            if (parent) {
              const category = this.dataSource.manager.create(Category, {
                name: categoryData.name,
                description: categoryData.description ?? undefined,
                parentId: parent.id,
                sortOrder: categoryData.sortOrder ?? 0,
                isActive: categoryData.isActive !== false,
                resultCenterId: undefined,
              });
              const savedCategory =
                await this.dataSource.manager.save(category);
              await this.createSeedMultimediaLink(
                'category',
                savedCategory.id,
                categoryData.imagePath,
                'primary-image',
              );
              if (categoryData.ref) {
                categoryMap.set(categoryData.ref, savedCategory);
              }
              this.logger.log(
                `   ✓ Categoría de producto '${categoryData.name}' (hijo de ${categoryData.parentRef}) creada`,
              );
            } else {
              this.logger.warn(
                `   ⚠ Categoría '${categoryData.name}' omitida: categoría padre '${categoryData.parentRef}' no encontrada`,
              );
            }
          }
        }
      }

      // 6. Create Branches
      if (branches && branches.length > 0) {
        for (const branchData of branches) {
          const branch = this.dataSource.manager.create(Branch, {
            companyId: defaultCompany?.id,
            name: branchData.name,
            address: branchData.address ?? null,
            phone: branchData.phone ?? null,
            location: branchData.location ?? null,
            isActive: true,
            isHeadquarters: !!branchData.isHeadquarters,
          });
          const savedBranch = await this.dataSource.manager.save(branch);
          if (branchData.ref) {
            branchMap.set(branchData.ref, savedBranch);
          }
          this.logger.log(`   ✓ Sucursal '${branchData.name}' creada`);
        }
      }

      // 7. Create Organizational Units
      if (
        organizationalUnits &&
        organizationalUnits.length > 0 &&
        defaultCompany
      ) {
        for (const unitData of organizationalUnits) {
          const branch = unitData.branchRef
            ? branchMap.get(unitData.branchRef)
            : null;
          const parent = unitData.parentRef
            ? organizationalUnitMap.get(unitData.parentRef)
            : null;

          const unit = this.dataSource.manager.create(OrganizationalUnit, {
            companyId: defaultCompany.id,
            code: unitData.code,
            name: unitData.name,
            description: unitData.description ?? undefined,
            unitType: unitData.unitType
              ? this.parseEnum(
                  OrganizationalUnitType,
                  unitData.unitType,
                  'organizationalUnit.unitType',
                )
              : OrganizationalUnitType.OTHER,
            parentId: parent?.id ?? null,
            branchId: branch?.id ?? null,
            resultCenterId: null,
            isActive: unitData.isActive !== false,
            metadata: unitData.metadata ?? undefined,
          });
          const savedUnit = await this.dataSource.manager.save(unit);
          if (unitData.ref) {
            organizationalUnitMap.set(unitData.ref, savedUnit);
          }
          this.logger.log(
            `   ✓ Unidad organizacional '${unitData.name}' creada`,
          );
        }
      }

      // 8. Create Storages
      if (storages && storages.length > 0) {
        for (const storageData of storages) {
          const branch = storageData.branchRef
            ? branchMap.get(storageData.branchRef)
            : null;
          const storage = this.dataSource.manager.create(Storage, {
            branchId: branch?.id ?? null,
            name: storageData.name,
            code: storageData.code ?? undefined,
            type: storageData.type
              ? this.parseEnum(StorageType, storageData.type, 'storage.type')
              : StorageType.WAREHOUSE,
            category: storageData.category
              ? this.parseEnum(
                  StorageCategory,
                  storageData.category,
                  'storage.category',
                )
              : StorageCategory.IN_BRANCH,
            capacity: storageData.capacity ?? null,
            location: storageData.location ?? null,
            isDefault: !!storageData.isDefault,
            isActive: storageData.isActive !== false,
          });
          await this.dataSource.manager.save(storage);
          this.logger.log(`   ✓ Almacen '${storageData.name}' creado`);
        }
      }

      // 8. Create Price Lists
      if (priceLists && priceLists.length > 0) {
        for (const priceListData of priceLists) {
          const priceList = this.dataSource.manager.create(PriceList, {
            name: priceListData.name,
            priceListType: priceListData.priceListType
              ? this.parseEnum(
                  PriceListType,
                  priceListData.priceListType,
                  'priceList.priceListType',
                )
              : PriceListType.RETAIL,
            currency: priceListData.currency || 'CLP',
            validFrom: priceListData.validFrom
              ? new Date(priceListData.validFrom)
              : undefined,
            validUntil: priceListData.validUntil
              ? new Date(priceListData.validUntil)
              : undefined,
            priority: priceListData.priority ?? 0,
            isDefault: !!priceListData.isDefault,
            isActive: priceListData.isActive !== false,
            description: priceListData.description ?? undefined,
          });
          await this.dataSource.manager.save(priceList);
          this.logger.log(
            `   ✓ Lista de precios '${priceListData.name}' creada`,
          );
        }
      }

      // 9. Create Shareholders and their Persons
      if (shareholders && shareholders.length > 0 && defaultCompany) {
        for (const shareholderData of shareholders) {
          // Create Person for shareholder
          const person = this.dataSource.manager.create(Person, {
            type: PersonType.NATURAL,
            firstName: shareholderData.person?.firstName,
            lastName: shareholderData.person?.lastName,
            documentType: (shareholderData.person?.documentType ||
              'RUT') as DocumentType,
            documentNumber: shareholderData.person?.documentNumber,
            email: shareholderData.person?.email,
            phone: shareholderData.person?.phone,
          });
          const savedPerson = await this.dataSource.manager.save(person);

          // Create Shareholder
          const shareholder = this.dataSource.manager.create(Shareholder, {
            company: defaultCompany,
            person: savedPerson,
            role: shareholderData.role,
            ownershipPercentage: shareholderData.ownershipPercentage,
            notes: shareholderData.notes,
            isActive: true,
          });
          await this.dataSource.manager.save(shareholder);
          this.logger.log(
            `   ✓ Socio '${shareholderData.person?.firstName} ${shareholderData.person?.lastName}' creado (${shareholderData.ownershipPercentage}%)`,
          );
        }
      }

      // 10. Create Persons and Users
      if (users && users.length > 0) {
        for (const userData of users) {
          // Create Person
          const personType =
            userData.person?.type === 'COMPANY'
              ? PersonType.COMPANY
              : PersonType.NATURAL;

          const person = this.dataSource.manager.create(Person, {
            type: personType,
            firstName: userData.person?.firstName || 'Admin',
            lastName: userData.person?.lastName || 'User',
            businessName: userData.person?.businessName,
            documentType: (userData.person?.documentType ||
              'RUT') as DocumentType,
            documentNumber: userData.person?.documentNumber || '0000000-0',
            email:
              userData.person?.email || `${userData.userName}@flowstore.local`,
            phone: userData.person?.phone,
            address: userData.person?.address,
          });
          const savedPerson = await this.dataSource.manager.save(person);

          // Create User with bcrypt-hashed password
          const user = this.dataSource.manager.create(User, {
            userName: userData.userName,
            pass: this.hashPassword(userData.password), // Hash the password
            mail:
              userData.person?.email || `${userData.userName}@flowstore.local`,
            rol: userData.role || userData.rol || 'ADMIN',
            person: savedPerson,
          });
          await this.dataSource.manager.save(user);
          this.logger.log(
            `   ✓ Usuario '${userData.userName}' creado exitosamente`,
          );
        }
      }

      // 11. Create Units
      if (units && units.length > 0) {
        for (const unitData of units) {
          const unit = this.dataSource.manager.create(Unit, {
            name: unitData.name,
            symbol: unitData.symbol,
            dimension: unitData.dimension,
            conversionFactor: unitData.conversionFactor || 1,
            allowDecimals: unitData.allowDecimals || false,
            isBase: unitData.isBase || false,
            active: true,
          });
          await this.dataSource.manager.save(unit);
          this.logger.log(`   ✓ Unidad de medida '${unitData.symbol}' creada`);
        }
      }

      // 11b. Create Attributes (if present in seed data)
      const attributes = await this.readSeedJson<any[]>('attributes.json');
      if (attributes && attributes.length > 0) {
        for (const attrData of attributes) {
          try {
            const attribute = this.dataSource.manager.create(Attribute, {
              name: attrData.name,
              description: attrData.description ?? undefined,
              options: Array.isArray(attrData.options) ? attrData.options : [],
              displayOrder:
                typeof attrData.displayOrder === 'number'
                  ? attrData.displayOrder
                  : 0,
              isActive: attrData.isActive !== false,
            });
            await this.dataSource.manager.save(attribute);
            this.logger.log(`   ✓ Atributo '${attrData.name}' creado`);
          } catch (err) {
            this.logger.warn(
              `   ⚠ No se pudo crear atributo '${attrData.name}': ${err?.message || err}`,
            );
          }
        }
      }

      // 12. Create Customers
      if (customers && customers.length > 0) {
        for (const customerData of customers) {
          // Create Person for customer
          const personType =
            customerData.person?.type === 'COMPANY'
              ? PersonType.COMPANY
              : PersonType.NATURAL;

          const person = this.dataSource.manager.create(Person, {
            type: personType,
            firstName:
              customerData.person?.firstName ||
              (personType === PersonType.COMPANY ? 'Company' : 'Cliente'),
            lastName:
              customerData.person?.lastName ||
              (personType === PersonType.COMPANY ? 'Business' : ''),
            businessName: customerData.person?.businessName,
            documentType: (customerData.person?.documentType ||
              'RUT') as DocumentType,
            documentNumber: customerData.person?.documentNumber,
            email: customerData.person?.email,
            phone: customerData.person?.phone,
          });
          const savedPerson = await this.dataSource.manager.save(person);

          // Create Customer
          const customer = this.dataSource.manager.create(Customer, {
            person: savedPerson,
            customerType: customerData.customerType || 'RETAIL',
            paymentTerms: customerData.paymentTerms,
            creditLimit: customerData.creditLimit || 0,
            notes: customerData.notes,
            isActive: true,
          });
          await this.dataSource.manager.save(customer);
          const customerName =
            customerData.person?.businessName ||
            `${customerData.person?.firstName} ${customerData.person?.lastName}`;
          this.logger.log(`   ✓ Cliente '${customerName}' creado`);
        }
      }

      // 13. Create Suppliers with Bank Accounts and Persons
      if (suppliers && suppliers.length > 0) {
        for (const supplierData of suppliers) {
          // Create Person for supplier
          const personType =
            supplierData.person?.type === 'COMPANY'
              ? PersonType.COMPANY
              : PersonType.NATURAL;

          const person = this.dataSource.manager.create(Person, {
            type: personType,
            firstName:
              supplierData.person?.firstName ||
              (personType === PersonType.COMPANY ? 'Company' : 'Proveedor'),
            lastName:
              supplierData.person?.lastName ||
              (personType === PersonType.COMPANY ? 'Business' : ''),
            businessName: supplierData.person?.businessName,
            documentType: (supplierData.person?.documentType ||
              'RUT') as DocumentType,
            documentNumber: supplierData.person?.documentNumber,
            email: supplierData.person?.email,
            phone: supplierData.person?.phone,
            address: supplierData.person?.address,
            // Add bank accounts to person
            bankAccounts: supplierData.bankAccounts
              ? supplierData.bankAccounts.map((account: any) => ({
                  bankName: account.bankName as BankName,
                  accountTypeName: account.accountTypeName as AccountTypeName,
                  accountNumber: account.accountNumber,
                  currency: account.currency || 'CLP',
                }))
              : [],
          });
          const savedPerson = await this.dataSource.manager.save(person);

          // Create Supplier
          const supplier = this.dataSource.manager.create(Supplier, {
            person: savedPerson,
            supplierType: supplierData.supplierType || 'GENERAL',
            creditTerms: supplierData.creditTerms,
            creditLimit: supplierData.creditLimit || 0,
            paymentTerms: supplierData.paymentTerms,
            notes: supplierData.notes,
            isActive: true,
          });
          await this.dataSource.manager.save(supplier);
          const supplierName =
            supplierData.person?.businessName ||
            `${supplierData.person?.firstName} ${supplierData.person?.lastName}`;
          this.logger.log(
            `   ✓ Proveedor '${supplierName}' creado con cuentas bancarias`,
          );
        }
      }

      // 14. Create Employees
      if (employees && employees.length > 0 && defaultCompany) {
        for (const employeeData of employees) {
          // Create Person for employee
          const person = this.dataSource.manager.create(Person, {
            type: PersonType.NATURAL,
            firstName: employeeData.person?.firstName || 'Empleado',
            lastName: employeeData.person?.lastName || '',
            documentType: (employeeData.person?.documentType ||
              'RUT') as DocumentType,
            documentNumber: employeeData.person?.documentNumber,
            email: employeeData.person?.email,
            phone: employeeData.person?.phone,
            address: employeeData.person?.address,
          });
          const savedPerson = await this.dataSource.manager.save(person);

          // Get branch by ref if provided
          const branch = employeeData.branchRef
            ? branchMap.get(employeeData.branchRef)
            : null;

          // Create Employee
          const employee = this.dataSource.manager.create(Employee, {
            companyId: defaultCompany.id,
            personId: savedPerson.id,
            branchId: branch?.id || null,
            employmentType: this.parseEnum(
              EmploymentType,
              employeeData.employmentType || 'FULL_TIME',
              'employee.employmentType',
            ),
            status: this.parseEnum(
              EmployeeStatus,
              employeeData.status || 'ACTIVE',
              'employee.status',
            ),
            hireDate: employeeData.hireDate,
            terminationDate: employeeData.terminationDate || null,
            baseSalary: employeeData.baseSalary?.toString() || null,
            metadata: {
              position: employeeData.position,
              department: employeeData.department,
            },
          });
          await this.dataSource.manager.save(employee);
          const employeeName = `${employeeData.person?.firstName} ${employeeData.person?.lastName}`;
          this.logger.log(
            `   ✓ Empleado '${employeeName}' creado (${employeeData.position || 'Sin cargo'})`,
          );
        }
      }

      this.logger.log('✅ Seed completado exitosamente');
    } catch (error: any) {
      this.logger.error('❌ Error ejecutando seed:', error.message);
      throw error;
    }
  }

  private async readSeedJson<T>(fileName: string): Promise<T | null> {
    try {
      const filePath = join(__dirname, 'data', fileName);
      const raw = await readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  private hashPassword(password: string): string {
    return bcrypt.hashSync(password, 12);
  }

  private parseEnum<E extends Record<string, string>>(
    enumObject: E,
    raw: string,
    context: string,
  ): E[keyof E] {
    const enumRecord = enumObject as Record<string, string>;

    if (Object.prototype.hasOwnProperty.call(enumRecord, raw)) {
      return enumRecord[raw] as E[keyof E];
    }

    const normalizedRaw = raw.toLowerCase();
    for (const [key, value] of Object.entries(enumRecord)) {
      if (
        key.toLowerCase() === normalizedRaw ||
        value.toLowerCase() === normalizedRaw
      ) {
        return value as E[keyof E];
      }
    }

    throw new Error(`Valor inválido para ${context}: ${raw}`);
  }

  private ensureArray<T>(data: T[] | null | undefined, fileName: string): T[] {
    if (!data || data.length === 0) {
      throw new Error(
        `El archivo ${fileName} debe contener al menos un registro.`,
      );
    }
    return data;
  }

  private buildPersonDisplayName(person: {
    type: PersonType;
    firstName?: string | null;
    lastName?: string | null;
    businessName?: string | null;
    documentNumber?: string | null;
  }): string {
    if (person.type === PersonType.COMPANY) {
      return (
        person.businessName?.trim() || person.firstName || 'Empresa sin nombre'
      );
    }

    const parts = [person.firstName, person.lastName]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value): value is string => value.length > 0);

    if (parts.length > 0) {
      return parts.join(' ');
    }

    if (person.businessName && person.businessName.trim().length > 0) {
      return person.businessName.trim();
    }

    return person.documentNumber?.trim() || 'Persona sin identificación';
  }

  private async createSeedMultimediaLink(
    entityType: string,
    entityId: string,
    filePath?: string | null,
    usageType: string = 'default',
  ): Promise<void> {
    if (!filePath) {
      return;
    }

    const fileName = filePath.split('/').pop() || filePath;
    const loweredPath = filePath.toLowerCase();
    const mimeType = loweredPath.endsWith('.png')
      ? 'image/png'
      : loweredPath.endsWith('.jpg') || loweredPath.endsWith('.jpeg')
        ? 'image/jpeg'
        : loweredPath.endsWith('.webp')
          ? 'image/webp'
          : loweredPath.endsWith('.pdf')
            ? 'application/pdf'
            : 'application/octet-stream';
    const kind = mimeType === 'application/pdf' ? 'document' : 'image';

    const asset = this.dataSource.manager.create(MultimediaAsset, {
      originalName: fileName,
      storedName: fileName,
      storageKey: filePath,
      publicUrl: filePath,
      mimeType,
      kind,
      storageProvider: 'local',
      size: 0,
      status: 'active',
      metadata: {
        seeded: true,
        source: 'seed.service',
      },
    });

    const savedAsset = await this.dataSource.manager.save(asset);

    const link = this.dataSource.manager.create(MultimediaLink, {
      assetId: savedAsset.id,
      entityType,
      entityId,
      usageType,
      sortOrder: 0,
      isPrimary: true,
      metadata: {
        seeded: true,
      },
    });

    await this.dataSource.manager.save(link);
  }
}
