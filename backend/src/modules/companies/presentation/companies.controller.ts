import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PersonBankAccountDto } from '@modules/persons/application/dto/person-bank-account.dto';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentCompany,
  CurrentUser,
  CurrentUserPayload,
  OptionalCurrentCompany,
} from '@common/tenant';
import { UpdateCompanyDto } from '../application/dto/update-company.dto';
import { CreateCompanyDto } from '../application/dto/create-company.dto';
import { CompaniesService } from '../application/companies.service';

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Compat. con clientes single-company: devuelve la empresa "activa".
   * - OPERATOR: su company.
   * - ADMIN: la company seleccionada via X-Active-Company-Id, o la primera activa.
   */
  @Get('company')
  async getCompany(@OptionalCurrentCompany() activeCompanyId: string | null) {
    if (activeCompanyId) {
      return this.companiesService.getCompanyById(activeCompanyId);
    }
    return this.companiesService.getCompany();
  }

  /**
   * Lista todas las empresas (solo ADMIN).
   * Operadores no tienen acceso al listado.
   */
  @Get('companies')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async listCompanies(
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() _user?: CurrentUserPayload,
  ) {
    const include = includeInactive === 'true' || includeInactive === '1';
    const companies = await this.companiesService.listCompanies(include);
    return { success: true, companies };
  }

  /**
   * Detalle de una empresa por id (solo ADMIN).
   */
  @Get('companies/:id')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getById(@Param('id') id: string) {
    const company = await this.companiesService.getCompanyById(id);
    return { success: true, company };
  }

  /**
   * Crear una nueva empresa (solo ADMIN).
   */
  @Post('companies')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async create(@Body() body: CreateCompanyDto) {
    const company = await this.companiesService.createCompany(body);
    return { success: true, company };
  }

  /**
   * Actualizar empresa por id (solo ADMIN).
   */
  @Patch('companies/:id')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async updateById(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto & { isActive?: boolean },
  ) {
    const company = await this.companiesService.updateCompanyById(id, body);
    return { success: true, company };
  }

  /**
   * Soft delete (desactivar) empresa.
   */
  @Delete('companies/:id')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async remove(@Param('id') id: string) {
    return this.companiesService.softDeleteCompany(id);
  }

  /**
   * Compat. legacy: actualizar la empresa "activa" actual.
   */
  @Patch('company')
  async updateCompany(
    @Body() body: UpdateCompanyDto,
    @OptionalCurrentCompany() activeCompanyId: string | null,
  ) {
    if (activeCompanyId) {
      return this.companiesService.updateCompanyById(activeCompanyId, body);
    }
    return this.companiesService.updateCompany(body);
  }

  /**
   * Cuentas bancarias de la empresa activa.
   */
  @Post('company/bank-accounts')
  async addBankAccount(
    @Body() body: PersonBankAccountDto,
    @CurrentCompany() activeCompanyId: string,
  ) {
    return this.companiesService.addBankAccount(activeCompanyId, body);
  }
}
