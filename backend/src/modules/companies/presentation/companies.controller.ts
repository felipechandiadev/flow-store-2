import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import { UpdateCompanyDto } from '../application/dto/update-company.dto';
import { CompaniesService } from '../application/companies.service';

@Controller('company')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  async getCompany() {
    return await this.companiesService.getCompany();
  }

  @Patch()
  async updateCompany(@Body() body: UpdateCompanyDto) {
    return await this.companiesService.updateCompany(body);
  }

  @Post('bank-accounts')
  async addBankAccount(@Body() body: PersonBankAccountDto) {
    return await this.companiesService.addBankAccount(body);
  }
}
