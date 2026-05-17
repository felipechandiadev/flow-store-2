import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthServiceAdapter } from '../application/auth.service.adapter';
import { LoginDto } from '../application/dto/login.dto';
import { LoginResponseDto } from '../application/dto/login-response.dto';
import { LogoutDto } from '../application/dto/logout.dto';
import { LogoutResponseDto } from '../application/dto/logout-response.dto';
import { Company } from '@modules/companies/domain/company.entity';
import {
  AdminOnly,
  AllowAdminWithoutCompany,
  CurrentUser,
  CurrentUserPayload,
  SkipTenant,
} from '@common/tenant';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthServiceAdapter,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  @SkipTenant()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with username and password',
  })
  @ApiBody({
    type: LoginDto,
    description: 'Login credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid credentials' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['userName should not be empty'],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Headers('x-active-company-id') companyHint?: string,
  ): Promise<LoginResponseDto> {
    return this.authService.login(loginDto, {
      companyHint: companyHint && isUUID(companyHint) ? companyHint : null,
    });
  }

  @SkipTenant()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'User logout',
    description: 'Logout user and invalidate session',
  })
  @ApiBody({
    type: LogoutDto,
    description: 'Logout request',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async logout(@Body() logoutDto: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(logoutDto);
  }

  /**
   * Lista las empresas disponibles para el ADMIN actual.
   * Operadores solo pueden ver su propia empresa.
   */
  @Get('companies')
  @AllowAdminWithoutCompany()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Empresas disponibles para el usuario',
    description:
      'ADMIN: todas las empresas activas. OPERATOR: solo su empresa.',
  })
  async companies(@CurrentUser() user: CurrentUserPayload) {
    if (user.rol === 'ADMIN') {
      const all = await this.companyRepository.find({
        where: { isActive: true },
        order: { createdAt: 'ASC' },
      });
      return {
        success: true,
        companies: all.map((c) => ({
          id: c.id,
          razonSocial: c.razonSocial,
          nombreFantasia: c.nombreFantasia ?? null,
        })),
      };
    }
    if (!user.companyId) {
      return { success: true, companies: [] };
    }
    const own = await this.companyRepository.findOne({
      where: { id: user.companyId },
    });
    return {
      success: true,
      companies: own
        ? [
            {
              id: own.id,
              razonSocial: own.razonSocial,
              nombreFantasia: own.nombreFantasia ?? null,
            },
          ]
        : [],
    };
  }

  /**
   * ADMIN: cambia la empresa activa. El cliente debe enviar el nuevo companyId
   * y, en requests subsecuentes, el header X-Active-Company-Id con ese valor.
   * Devuelve la company para que el cliente persista el contexto.
   */
  @Post('switch-company')
  @HttpCode(HttpStatus.OK)
  @AdminOnly()
  @AllowAdminWithoutCompany()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Cambiar empresa activa (solo ADMIN)',
  })
  async switchCompany(
    @Body() body: { companyId: string },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.rol !== 'ADMIN') {
      throw new ForbiddenException('Solo administradores pueden cambiar de empresa');
    }
    const id = String(body?.companyId || '').trim();
    if (!isUUID(id)) {
      throw new BadRequestException('companyId inválido');
    }
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new BadRequestException('Empresa no encontrada');
    }
    if (!company.isActive) {
      throw new BadRequestException('La empresa está inactiva');
    }
    return {
      success: true,
      activeCompanyId: company.id,
      company: {
        id: company.id,
        razonSocial: company.razonSocial,
        nombreFantasia: company.nombreFantasia ?? null,
      },
    };
  }
}
