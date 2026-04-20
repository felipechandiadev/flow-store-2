import { Controller, Get } from '@nestjs/common';
import { CompaniesService } from '../application/companies.service';

@Controller('company')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getCompany() {
    return await this.companiesService.getCompany();
  }
}
