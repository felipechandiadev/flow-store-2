import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../domain/company.entity';

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
}
