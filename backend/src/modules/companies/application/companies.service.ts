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
        // Return default if no company exists
        return {
          id: '1',
          name: 'Default Company',
          defaultCurrency: 'CLP',
          isActive: true,
          bankAccounts: [],
        };
      }

      return {
        id: company.id,
        name: company.name,
        defaultCurrency: company.defaultCurrency,
        fiscalYearStart: company.fiscalYearStart,
        isActive: company.isActive,
        settings: company.settings || {},
        bankAccounts: company.bankAccounts || [],
      };
    } catch (error) {
      console.error('Error fetching company:', error);
      return {
        id: '1',
        name: 'Default Company',
        defaultCurrency: 'CLP',
        isActive: true,
        bankAccounts: [],
      };
    }
  }
}
