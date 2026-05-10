import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import { Company, type CompanyBankAccount } from '../domain/company.entity';
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
