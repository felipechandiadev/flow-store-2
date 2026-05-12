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
  SkipTenant,
  SuperAdminOnly,
} from '@common/tenant';
import { UpdateCompanyDto } from '../application/dto/update-company.dto';
import { CreateCompanyDto } from '../application/dto/create-company.dto';
import { CompaniesService } from '../application/companies.service';

@Controller()
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  /**
   * Compat. con clientes single-company: devuelve la empresa "activa".
   * - ADMIN/OPERATOR: su company.
   * - SUPER_ADMIN: la company seleccionada via X-Active-Company-Id, o la primera activa.
   */
  @Get('company')
  async getCompany(@OptionalCurrentCompany() activeCompanyId: string | null) {
    if (activeCompanyId) {
      return this.companiesService.getCompanyById(activeCompanyId);
    }
    return this.companiesService.getCompany();
  }

  /**
   * Listado público de empresas activas (sin auth ni tenant).
   * Pensado para la pantalla de setup del POS donde el operario
   * elige a qué empresa se conecta antes de iniciar sesión.
   * Devuelve solo campos mínimos para identificarlas en UI.
   */
  @Get('companies/public/list')
  @SkipTenant()
  async listPublicCompanies() {
    const companies = await this.companiesService.listCompanies(false);
    return {
      success: true,
      companies: companies.map((c) => ({
        id: c.id,
        razonSocial: c.razonSocial,
        nombreFantasia: c.nombreFantasia,
        rut: c.rut ?? null,
      })),
    };
  }

  /**
   * Lista todas las empresas (solo SUPER_ADMIN).
   * ADMIN/OPERATOR no acceden al listado global.
   */
  @Get('companies')
  @SuperAdminOnly()
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
   * Detalle de una empresa por id (solo SUPER_ADMIN).
   */
  @Get('companies/:id')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async getById(@Param('id') id: string) {
    const company = await this.companiesService.getCompanyById(id);
    return { success: true, company };
  }

  /**
   * Crear una nueva empresa (solo SUPER_ADMIN).
   */
  @Post('companies')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async create(@Body() body: CreateCompanyDto) {
    const company = await this.companiesService.createCompany(body);
    return { success: true, company };
  }

  /**
   * Actualizar empresa por id (solo SUPER_ADMIN).
   */
  @Patch('companies/:id')
  @SuperAdminOnly()
  @AllowAdminWithoutCompany()
  async updateById(
    @Param('id') id: string,
    @Body() body: UpdateCompanyDto & { isActive?: boolean },
  ) {
    const company = await this.companiesService.updateCompanyById(id, body);
    return { success: true, company };
  }

  /**
   * Soft delete (desactivar) empresa (solo SUPER_ADMIN).
   */
  @Delete('companies/:id')
  @SuperAdminOnly()
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

  /**
   * Configuración de cotizaciones de una empresa (solo ADMIN). Si la
   * empresa aún no la tiene definida, devuelve los defaults.
   */
  @Get('companies/:id/quotation-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyQuotationSettings(@Param('id') id: string) {
    const quotationSettings =
      await this.companiesService.getQuotationSettings(id);
    return { success: true, quotationSettings };
  }

  /**
   * Reemplaza la configuración de cotizaciones de una empresa.
   * Body: `{ quotationSettings: CompanyQuotationSettings }` o el objeto directo.
   */
  @Put('companies/:id/quotation-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyQuotationSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body && typeof body === 'object' && 'quotationSettings' in (body as any)
        ? (body as any).quotationSettings
        : body;
    const quotationSettings =
      await this.companiesService.replaceQuotationSettings(id, incoming);
    return { success: true, quotationSettings };
  }

  /**
   * Política global de crédito interno para clientes (`settings.internalCustomerCredit`).
   */
  @Get('companies/:id/internal-customer-credit-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async getCompanyInternalCustomerCreditSettings(@Param('id') id: string) {
    const internalCustomerCredit =
      await this.companiesService.getInternalCustomerCreditSettings(id);
    return { success: true, internalCustomerCredit };
  }

  /**
   * Body: `{ internalCustomerCredit: { enabled: boolean } }` o el objeto directo.
   */
  @Put('companies/:id/internal-customer-credit-settings')
  @AdminOnly()
  @AllowAdminWithoutCompany()
  async replaceCompanyInternalCustomerCreditSettings(
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const incoming =
      body &&
      typeof body === 'object' &&
      'internalCustomerCredit' in (body as any)
        ? (body as any).internalCustomerCredit
        : body;
    const internalCustomerCredit =
      await this.companiesService.replaceInternalCustomerCreditSettings(
        id,
        incoming,
      );
    return { success: true, internalCustomerCredit };
  }
}
