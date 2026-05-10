import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import {
  CompanyPaymentMethodConfig,
  buildDefaultCompanyCatalog,
  validateCompanyPaymentMethods,
} from '@modules/payment-methods-config';
import { Company, type CompanyBankAccount } from '../domain/company.entity';
import {
  CompanyCheckSettings,
  buildDefaultCompanyCheckSettings,
  sanitizeCompanyCheckSettings,
} from '../domain/company-checks.types';
import { PaymentMethod } from '@modules/transactions/domain/transaction.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';

export interface CompanyDetail {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
  businessActivity: string | null;
  rut: string | null;
  defaultCurrency: string;
  fiscalYearStart?: Date;
  isActive: boolean;
  settings?: Record<string, any>;
  bankAccounts: CompanyBankAccount[];
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Lista todas las empresas (incluye inactivas opcionalmente).
   */
  async listCompanies(includeInactive = false): Promise<CompanyDetail[]> {
    const where = includeInactive ? {} : { isActive: true };
    const list = await this.companyRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
    return list.map((c) => this.toDetail(c));
  }

  /**
   * Obtiene una empresa por ID.
   */
  async getCompanyById(id: string): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return this.toDetail(company);
  }

  /**
   * Compatibilidad: devuelve la empresa activa (la primera por orden de creación).
   * Sin filas devuelve un placeholder no persistido (compat. con `pwa-pos`).
   */
  async getCompany(): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!company) {
      return {
        id: null,
        razonSocial: 'Empresa por defecto',
        nombreFantasia: null,
        businessActivity: null,
        rut: null,
        defaultCurrency: 'CLP',
        isActive: true,
        bankAccounts: [],
      };
    }
    return this.toDetail(company);
  }

  async createCompany(data: CreateCompanyDto): Promise<CompanyDetail> {
    const rut = data.rut.trim();
    if (!rut) throw new ConflictException('El RUT es requerido');

    const exists = await this.companyRepository.findOne({ where: { rut } });
    if (exists) throw new ConflictException('El RUT ya está registrado');

    const company = this.companyRepository.create({
      razonSocial: data.razonSocial.trim(),
      nombreFantasia: data.nombreFantasia?.trim() || null,
      businessActivity: data.businessActivity?.trim() || null,
      rut,
      defaultCurrency: data.defaultCurrency?.trim() || 'CLP',
      isActive: data.isActive !== false,
    });
    const saved = await this.companyRepository.save(company);
    return this.toDetail(saved);
  }

  async updateCompanyById(
    id: string,
    data: UpdateCompanyDto & { isActive?: boolean },
  ): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    if (data.rut !== undefined && data.rut.trim() !== company.rut) {
      const conflict = await this.companyRepository.findOne({
        where: { rut: data.rut.trim() },
      });
      if (conflict && conflict.id !== company.id) {
        throw new ConflictException('El RUT ya está registrado');
      }
    }

    if (data.razonSocial !== undefined) {
      company.razonSocial = data.razonSocial.trim();
    }
    if (data.nombreFantasia !== undefined) {
      const v = data.nombreFantasia.trim();
      company.nombreFantasia = v === '' ? null : v;
    }
    if (data.businessActivity !== undefined) {
      const v = data.businessActivity.trim();
      company.businessActivity = v === '' ? null : v;
    }
    if (data.rut !== undefined) {
      company.rut = data.rut.trim();
    }
    if ((data as any).isActive !== undefined) {
      company.isActive = !!(data as any).isActive;
    }

    await this.companyRepository.save(company);
    return this.toDetail(company);
  }

  async softDeleteCompany(id: string): Promise<{ success: true }> {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    company.isActive = false;
    await this.companyRepository.save(company);
    await this.companyRepository.softDelete({ id });
    return { success: true };
  }

  /**
   * Compat. legacy: actualiza la empresa única (la primera activa).
   */
  async updateCompany(data: UpdateCompanyDto): Promise<CompanyDetail> {
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }
    return this.updateCompanyById(company.id, data);
  }

  /**
   * Lee el catálogo de medios de pago de una empresa.
   * Si no existe en `settings.paymentMethods`, devuelve un set por defecto
   * (no se persiste hasta que el admin guarde explícitamente).
   */
  async getPaymentMethods(
    companyId: string,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.paymentMethods;
    if (!Array.isArray(raw) || raw.length === 0) {
      return buildDefaultCompanyCatalog();
    }
    try {
      return validateCompanyPaymentMethods(raw);
    } catch {
      // Si lo persistido es inválido, no rompemos el GET; devolvemos default.
      return buildDefaultCompanyCatalog();
    }
  }

  /**
   * Reemplaza el catálogo de medios de pago de una empresa.
   * Hace bulk-replace con validación de unicidad (alias por método, ids).
   */
  async replacePaymentMethods(
    companyId: string,
    list: unknown,
  ): Promise<CompanyPaymentMethodConfig[]> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    let validated: CompanyPaymentMethodConfig[];
    try {
      validated = validateCompanyPaymentMethods(list);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Configuración inválida',
      );
    }
    company.settings = { ...(company.settings ?? {}), paymentMethods: validated };
    await this.companyRepository.save(company);
    return validated;
  }

  /**
   * Lee la configuración de cheques de una empresa.
   * Si no existe en `settings.checks`, devuelve el default sin persistir.
   */
  async getCheckSettings(companyId: string): Promise<CompanyCheckSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    const raw = company.settings?.checks;
    if (!raw || typeof raw !== 'object') {
      return buildDefaultCompanyCheckSettings();
    }
    return sanitizeCompanyCheckSettings(raw);
  }

  /**
   * Reemplaza la configuración de cheques de una empresa.
   * Sincroniza la entrada `CHECK` del catálogo `paymentMethods`: si
   * `receiveChecks=false`, la entrada se marca `isActive=false`; si
   * `receiveChecks=true` y existía la entrada, se reactiva.
   */
  async replaceCheckSettings(
    companyId: string,
    raw: unknown,
  ): Promise<CompanyCheckSettings> {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const validated = sanitizeCompanyCheckSettings(raw);

    const settings = { ...(company.settings ?? {}) };
    settings.checks = validated;

    if (Array.isArray(settings.paymentMethods)) {
      try {
        const list = validateCompanyPaymentMethods(settings.paymentMethods);
        const next = list.map((m) =>
          m.method === PaymentMethod.CHECK
            ? { ...m, isActive: validated.receiveChecks ? true : false }
            : m,
        );
        settings.paymentMethods = next;
      } catch {
        // Si el catálogo es inválido no rompemos la actualización de
        // settings.checks; queda como estaba.
      }
    }

    company.settings = settings;
    await this.companyRepository.save(company);
    return validated;
  }

  async addBankAccount(
    companyId: string | null,
    accountData: PersonBankAccountDto,
  ): Promise<CompanyDetail> {
    const company = companyId
      ? await this.companyRepository.findOne({ where: { id: companyId } })
      : await this.companyRepository.findOne({
          where: { isActive: true },
          order: { createdAt: 'ASC' },
        });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

    if (!company.bankAccounts) {
      company.bankAccounts = [];
    }

    const accountKey = `${accountData.bankName}_${accountData.accountNumber}_${Date.now()}`;
    const newAccount: CompanyBankAccount = { ...accountData, accountKey };

    if (newAccount.isPrimary) {
      company.bankAccounts = company.bankAccounts.map((acc) => ({
        ...acc,
        isPrimary: false,
      }));
    }

    company.bankAccounts.push(newAccount);
    await this.companyRepository.save(company);
    return this.toDetail(company);
  }

  private toDetail(company: Company): CompanyDetail {
    return {
      id: company.id,
      razonSocial: company.razonSocial,
      nombreFantasia: company.nombreFantasia ?? null,
      businessActivity: company.businessActivity ?? null,
      rut: company.rut,
      defaultCurrency: company.defaultCurrency,
      fiscalYearStart: company.fiscalYearStart,
      isActive: company.isActive,
      settings: company.settings || {},
      bankAccounts: company.bankAccounts || [],
    };
  }
}
