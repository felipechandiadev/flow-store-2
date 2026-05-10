import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
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

  /**
   * Catálogo de medios de pago de una empresa (solo ADMIN).
   * Si la empresa aún no lo tiene definido, devuelve el set por defecto.
   */
  @Get('companies/:id/payment-methods')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyPaymentMethods(@Param('id') id: string) {
    const paymentMethods = await this.companiesService.getPaymentMethods(id);
    return { success: true, paymentMethods };
  }

  /**
   * Reemplaza el catálogo completo de medios de pago de una empresa.
   * Body: `{ paymentMethods: CompanyPaymentMethodConfig[] }` o el array directo.
   */
  @Put('companies/:id/payment-methods')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyPaymentMethods(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming = Array.isArray(body)
      ? body
      : Array.isArray((body as any)?.paymentMethods)
        ? (body as any).paymentMethods
        : [];
    const paymentMethods = await this.companiesService.replacePaymentMethods(
      id,
      incoming,
    );
    return { success: true, paymentMethods };
  }

  /**
   * Configuración de cheques de una empresa (solo ADMIN). Si la empresa
   * aún no la tiene definida, devuelve un default todo-desactivado.
   */
  @Get('companies/:id/check-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyCheckSettings(@Param('id') id: string) {
    const checkSettings = await this.companiesService.getCheckSettings(id);
    return { success: true, checkSettings };
  }

  /**
   * Reemplaza la configuración de cheques de una empresa.
   * Body: `{ checkSettings: CompanyCheckSettings }` o el objeto directo.
   */
  @Put('companies/:id/check-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyCheckSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'checkSettings' in (body as any)
        ? (body as any).checkSettings
        : body;
    const checkSettings = await this.companiesService.replaceCheckSettings(
      id,
      incoming,
    );
    return { success: true, checkSettings };
  }
}
