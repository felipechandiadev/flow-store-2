import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { CashSessionsService } from '../application/cash-sessions.service';
import { CashSessionIntegrityService } from '../application/cash-session-integrity.service';
import { CashSessionCoreService } from '../application/cash-session-core.service';
import { SalesFromSessionService } from '../application/sales-from-session.service';
import { OpeningTransactionDto } from '../application/dto/opening-transaction.dto';
import { GetCashSessionsDto } from '../application/dto/get-cash-sessions.dto';
import { OpenCashSessionDto } from '../application/dto/open-cash-session.dto';
import { CreateSaleDto } from '../application/dto/create-sale.dto';
import { RegisterCashMovementDto } from '../application/dto/register-cash-movement.dto';
import { CloseCashSessionDto } from '../application/dto/close-cash-session.dto';

@Controller('cash-sessions')
export class CashSessionsController {
  constructor(
    // New refactored services (preferred)
    private readonly coreService: CashSessionCoreService,
    private readonly salesService: SalesFromSessionService,
    // Old services (maintained for backward compatibility)
    private readonly cashSessionsService: CashSessionsService,
    private readonly integrityService: CashSessionIntegrityService,
  ) {}

  /**
   * UPDATED: Use new CashSessionCoreService
   */
  @Get()
  async findAll(@Query() query: GetCashSessionsDto) {
    return this.coreService.findAll(query);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.coreService.findOne(id);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   *
   * Now delegates to TransactionsService for CASH_SESSION_OPENING
   */
  @Post()
  async open(@Body() openDto: OpenCashSessionDto) {
    return this.coreService.open(openDto);
  }

  /**
   * UPDATED: Use new SalesFromSessionService
   */
  @Get(':id/sales')
  async getSales(@Param('id') id: string) {
    return this.salesService.getSalesForSession(id);
  }

  /**
   * UPDATED: Use new SalesFromSessionService
   *
   * Now delegates to TransactionsService for SALE + asientos generation
   */
  @Post('sales')
  async createSale(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  /**
   * TODO: Deprecated - Use open() endpoint instead
   * or implement via CashSessionCoreService
   */
  @Post('opening-transaction')
  async registerOpeningTransaction(@Body() dto: OpeningTransactionDto) {
    // Delegate to old service for now (backward compatibility)
    return this.cashSessionsService.registerOpeningTransaction(dto);
  }

  /**
   * TODO: Deprecated - Analyze if needed
   * Potentially use CapitalContributionsService or CashDepositsService
   */
  @Post('cash-deposits')
  async registerCashDeposit(@Body() dto: RegisterCashMovementDto) {
    return this.cashSessionsService.registerCashDeposit(dto);
  }

  /**
   * TODO: Deprecated - Analyze if needed
   */
  @Post('cash-withdrawals')
  async registerCashWithdrawal(@Body() dto: RegisterCashMovementDto) {
    return this.cashSessionsService.registerCashWithdrawal(dto);
  }

  /**
   * UPDATED: Use new CashSessionCoreService
   *
   * Now delegates to TransactionsService for CASH_SESSION_CLOSING
   */
  @Post('close')
  async close(@Body() dto: CloseCashSessionDto) {
    const sessionId = dto.sessionId || dto.cashSessionId;
    const userId = dto.userId || dto.closedById || dto.user?.id;
    const userName = dto.userName;

    if (!sessionId) {
      throw new BadRequestException(
        'sessionId es requerido para cerrar la sesión',
      );
    }

    if (userId) {
      return this.coreService.close(sessionId, userId, {
        cashHubId: dto.cashHubId,
      });
    }

    if (userName) {
      return this.coreService.closeByUserName(sessionId, userName, {
        cashHubId: dto.cashHubId,
      });
    }

    throw new BadRequestException(
      'userId o userName es requerido para cerrar la sesión',
    );
  }

  @Get('integrity/check')
  async checkIntegrity() {
    return this.integrityService.validateIntegrity();
  }

  @Post('integrity/cleanup')
  async cleanupIntegrity() {
    return this.integrityService.cleanupCorruptSessions();
  }
}
