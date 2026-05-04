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

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Get current company (first company in database)
   */
  async getCompany() {
    try {
      const company = await this.companyRepository.findOne({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });

      if (!company) {
        // Sin fila en BD: no enviar id ficticio (debe ser uuid en columnas uuid).
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
    } catch (error) {
      console.error('Error fetching company:', error);
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
  }

  async updateCompany(data: UpdateCompanyDto) {
    const company = await this.companyRepository.findOne({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    if (!company) {
      throw new NotFoundException('Empresa no encontrada');
    }

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

    await this.companyRepository.save(company);
    return this.getCompany();
  }

  async addBankAccount(accountData: PersonBankAccountDto) {
    const company = await this.companyRepository.findOne({
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
    const newAccount: CompanyBankAccount = {
      ...accountData,
      accountKey,
    };

    if (newAccount.isPrimary) {
      company.bankAccounts = company.bankAccounts.map((acc) => ({
        ...acc,
        isPrimary: false,
      }));
    }

    company.bankAccounts.push(newAccount);
    await this.companyRepository.save(company);
    return this.getCompany();
  }
}
