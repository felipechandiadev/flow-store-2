import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { GetCashSessionsDto } from './dto/get-cash-sessions.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';

/**
 * CashSessionCoreService - Single Responsibility: Session Lifecycle Management
 *
 * Responsabilidades:
 * - Abrir sesiones de caja
 * - Cerrar sesiones de caja
 * - Reconciliar sesiones
 * - Queries sobre sesiones
 *
 * Delegaciones:
 * - Creación de transacciones → SalesFromSessionService
 * - Gestión de stock → SessionInventoryService
 * - Generación de asientos → TransactionsService (via SalesFromSessionService)
 */
@Injectable()
export class CashSessionCoreService {
  private readonly logger = new Logger(CashSessionCoreService.name);

  constructor(
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(PointOfSale)
    private readonly pointOfSaleRepository: Repository<PointOfSale>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Query: Obtener una sesión por ID
   */
  async findOne(id: string) {
    const cashSession = await this.cashSessionRepository.findOne({
      where: { id, deletedAt: null as any },
      relations: [
        'pointOfSale',
        'openedBy',
        'openedBy.person',
        'closedBy',
        'closedBy.person',
      ],
    });

    if (!cashSession) {
      return { success: false, message: 'Sesión de caja no encontrada' };
    }

    // obtain movements associated with this session
    type CashSessionMovement = {
      id: string;
      transactionType: TransactionType;
      documentNumber?: string;
      createdAt?: Date;
      total: number;
      paymentMethod?: PaymentMethod;
      paymentMethodLabel?: string;
      userId?: string;
      userFullName?: string;
      userUserName?: string;
      notes?: string;
      reason?: string;
      metadata?: any;
      direction: 'IN' | 'OUT' | 'NEUTRAL';
    };

    let movements: CashSessionMovement[] = [];
    try {
      movements = (await this.transactionsService.getMovementsForSession(
        id,
      )) as CashSessionMovement[];
    } catch (e) {
      this.logger?.warn(
        `No se pudieron cargar movimientos para sesión ${id}: ${e}`,
      );
    }

    return {
      success: true,
      cashSession: {
        ...cashSession,
        openedBy: cashSession.openedBy
          ? {
              id: cashSession.openedBy.id,
              userName: cashSession.openedBy.userName,
              person: cashSession.openedBy.person
                ? {
                    firstName: cashSession.openedBy.person.firstName,
                    lastName: cashSession.openedBy.person.lastName,
                  }
                : null,
            }
          : null,
        closedBy: cashSession.closedBy
          ? {
              id: cashSession.closedBy.id,
              userName: cashSession.closedBy.userName,
              person: cashSession.closedBy.person
                ? {
                    firstName: cashSession.closedBy.person.firstName,
                    lastName: cashSession.closedBy.person.lastName,
                  }
                : null,
            }
          : null,
      },
      movements,
    };
  }

  /**
   * Query: Obtener todas las sesiones con filtros
   */
  async findAll(query: GetCashSessionsDto) {
    const qb = this.cashSessionRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.pointOfSale', 'pointOfSale')
      .leftJoinAndSelect('pointOfSale.branch', 'pointOfSaleBranch')
      .leftJoinAndSelect('cs.openedBy', 'openedBy')
      .leftJoinAndSelect('openedBy.person', 'openedByPerson')
      .leftJoinAndSelect('cs.closedBy', 'closedBy')
      .leftJoinAndSelect('closedBy.person', 'closedByPerson');

    if (query.pointOfSaleId) {
      qb.andWhere('cs.pointOfSaleId = :pointOfSaleId', {
        pointOfSaleId: query.pointOfSaleId,
      });
    }

    if (query.status) {
      qb.andWhere('cs.status = :status', { status: query.status });
    }

    qb.orderBy('cs.createdAt', 'DESC');

    // Limit results to a reasonable default (no pagination in DTO)
    const [items, total] = await qb.take(100).getManyAndCount();

    // Map user fields for frontend convenience (same shape returned by older service)
    const mapped = items.map((cs) => ({
      ...cs,
      pointOfSaleName: cs.pointOfSale?.name || null,
      branchName: cs.pointOfSale?.branch?.name || null,
      openedByUserName: cs.openedBy?.userName || null,
      openedByFullName: cs.openedBy?.person
        ? `${cs.openedBy.person.firstName} ${cs.openedBy.person.lastName}`
        : null,
      closedByUserName: cs.closedBy?.userName || null,
      closedByFullName: cs.closedBy?.person
        ? `${cs.closedBy.person.firstName} ${cs.closedBy.person.lastName}`
        : null,
    }));

    return { success: true, total, items: mapped };
  }

  /**
   * Abrir una sesión de caja
   *
   * IMPORTANTE: Genera transacción CASH_SESSION_OPENING con asientos automáticos
   *
   * Flujo:
   * 1. Validar saldo de Caja General
   * 2. Validar usuario existe
   * 3. Crear sesión en transacción atómica
   * 4. Delegar a TransactionsService para crear transacción con asientos
   */
  async open(openDto: OpenCashSessionDto) {
    const { userId, userName, pointOfSaleId, openingAmount } = openDto;

    // Validar POS existe
    const pointOfSale = await this.pointOfSaleRepository.findOne({
      where: { id: pointOfSaleId, deletedAt: IsNull() },
      relations: ['branch'],
    });
    if (!pointOfSale) {
      throw new NotFoundException('El punto de venta especificado no existe.');
    }
    const companyId = pointOfSale.branch?.companyId;
    if (!companyId) {
      throw new BadRequestException(
        'No se pudo determinar la empresa asociada al punto de venta.',
      );
    }

    // TODO: Llamar a LedgerEntriesService.getAccountBalance para validar saldo de caja (V2)
    // const cashBalance = await ledgerEntriesService.getAccountBalance(CASH_ACCOUNT_ID);
    // if (cashBalance <= 0) {
    //   throw new BadRequestException('No hay saldo suficiente en Caja General');
    // }

    // Validar usuario - intenta por userId primero, luego por userName
    let validatedUser: User | null = null;
    if (userId) {
      validatedUser = await this.userRepository.findOne({
        where: { id: userId, deletedAt: IsNull() },
      });
    }
    if (!validatedUser && userName) {
      validatedUser = await this.userRepository.findOne({
        where: { userName, deletedAt: IsNull() },
      });
    }
    if (!validatedUser) {
      throw new NotFoundException('El usuario especificado no existe.');
    }

    // Crear sesión en transacción atómica
    const result = await this.dataSource.transaction(async (manager) => {
      const cashSessionRepo = manager.getRepository(CashSession);

      // Verificar que no haya sesión abierta
      const existingOpenSession = await cashSessionRepo.findOne({
        where: {
          pointOfSaleId: pointOfSale.id,
          status: CashSessionStatus.OPEN,
        },
      });

      // Si existe una sesión abierta, verificar si fue abierta por el mismo usuario
      if (existingOpenSession) {
        if (existingOpenSession.openedById !== validatedUser.id) {
          throw new ConflictException(
            'El punto de venta ya tiene una sesión abierta por otro usuario. Cierre la sesión existente primero.',
          );
        }
        // Si es el mismo usuario, permitir que continúe retornando la sesión existente
        return existingOpenSession;
      }

      const openedAt = new Date();

      const newSession = cashSessionRepo.create({
        pointOfSaleId: pointOfSale.id,
        openedById: validatedUser.id,
        openingAmount,
        openedAt,
        status: CashSessionStatus.OPEN,
      });

      return await cashSessionRepo.save(newSession);
    });

    // create an actual opening transaction so movements list can show it
    try {
      const txDto = new CreateTransactionDto();
      txDto.transactionType = TransactionType.CASH_SESSION_OPENING;
      txDto.branchId = pointOfSale.branchId || '';
      txDto.userId = validatedUser.id;
      txDto.pointOfSaleId = pointOfSale.id;
      txDto.cashSessionId = result.id;
      txDto.subtotal = openingAmount;
      txDto.taxAmount = 0;
      txDto.discountAmount = 0;
      txDto.total = openingAmount;
      txDto.paymentMethod = PaymentMethod.CASH;
      txDto.amountPaid = openingAmount;
      txDto.changeAmount = 0;
      txDto.documentType = 'TICKET';
      txDto.notes = undefined;
      txDto.metadata = {};
      // validate() will be called internally by createTransaction

      await this.transactionsService.createTransaction(txDto);
    } catch (txErr) {
      this.logger.warn(
        `Opening transaction for session ${result.id} failed: ${txErr}`,
      );
      // don't block session creation; caller can retry or handle missing movement later
    }

    // Cargar validatedUser con su relación person para incluirla en la respuesta
    const userWithPerson = await this.userRepository.findOne({
      where: { id: validatedUser.id },
      relations: ['person'],
    });

    return {
      success: true,
      cashSession: {
        id: result.id,
        pointOfSaleId: result.pointOfSaleId,
        openedById: result.openedById,
        status: result.status,
        openingAmount: Number(result.openingAmount),
        openedAt: result.openedAt,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        expectedAmount: result.expectedAmount
          ? Number(result.expectedAmount)
          : null,
        closingAmount: result.closingAmount
          ? Number(result.closingAmount)
          : null,
        closedAt: result.closedAt || null,
        difference: result.difference ? Number(result.difference) : null,
        notes: result.notes || null,
        closingDetails: result.closingDetails || null,
        openedBy: userWithPerson
          ? {
              id: userWithPerson.id,
              userName: userWithPerson.userName,
              person: userWithPerson.person
                ? {
                    id: userWithPerson.person.id,
                    firstName: userWithPerson.person.firstName,
                    lastName: userWithPerson.person.lastName,
                  }
                : null,
            }
          : null,
      },
      pointOfSale: {
        id: pointOfSale.id,
        name: pointOfSale.name,
        deviceId: pointOfSale.deviceId || null,
        branchId: pointOfSale.branchId || null,
        branchName: pointOfSale.branch?.name || null,
        priceLists: Array.isArray(pointOfSale.priceLists)
          ? pointOfSale.priceLists
          : [],
      },
    };
  }

  /**
   * Cerrar una sesión de caja
   *
   * IMPORTANTE: Genera transacción CASH_SESSION_CLOSING con asientos automáticos
   *
   * Flujo:
   * 1. Validar sesión existe y está OPEN
   * 2. Bloquear sesión (prevent further sales)
   * 3. Calcular totales (expected amount from sales)
   * 4. Delegar a TransactionsService para crear transacción con asientos
   * 5. Liberar stock reservado
   * 6. Marcar sesión como CLOSED
   */
  async closeByUserName(sessionId: string, userName: string) {
    const trimmedUserName = userName?.trim();
    if (!trimmedUserName) {
      throw new BadRequestException(
        'userName es requerido para cerrar la sesión',
      );
    }

    const user = await this.userRepository.findOne({
      where: { userName: trimmedUserName },
    });

    if (!user) {
      throw new NotFoundException(`Usuario ${trimmedUserName} no encontrado`);
    }

    return this.close(sessionId, user.id);
  }

  async close(sessionId: string, userId: string) {
    // 1. Validar sesión
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['pointOfSale'],
    });
    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }
    if (session.status !== CashSessionStatus.OPEN) {
      throw new ConflictException(
        `No se puede cerrar sesión en estado ${session.status}`,
      );
    }

    // 2. Calcular expectedAmount (sumar ventas asociadas a la sesión)
    const expectedAmount =
      await this.transactionsService.getTotalSalesForSession(sessionId);

    // 3. Obtener usuario que cierra
    const closedBy = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!closedBy) {
      throw new NotFoundException('Usuario que cierra no encontrado');
    }

    // 4. Crear transacción de cierre de caja
    // Validar branchId
    // ensure we know the branchId for later transaction
    let branchId: string | null | undefined = session.pointOfSale?.branchId;
    if (!branchId && session.pointOfSaleId) {
      // as fallback query pos explicitly
      const pos = await this.pointOfSaleRepository.findOne({
        where: { id: session.pointOfSaleId },
        relations: ['branch'],
      });
      branchId = pos?.branchId || pos?.branch?.id || undefined;
    }
    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal (branchId) para la sesión de caja.',
      );
    }
    let closingTxId: string | null = null;
    if (Number(expectedAmount) >= 0.01) {
      const txDto = new CreateTransactionDto();
      txDto.transactionType = TransactionType.CASH_SESSION_CLOSING;
      txDto.branchId = branchId;
      txDto.userId = closedBy.id;
      txDto.pointOfSaleId = session.pointOfSaleId;
      txDto.cashSessionId = session.id;
      txDto.subtotal = expectedAmount;
      txDto.taxAmount = 0;
      txDto.discountAmount = 0;
      txDto.total = expectedAmount;
      txDto.paymentMethod = PaymentMethod.CASH;
      txDto.amountPaid = expectedAmount;
      txDto.lines = [];
      txDto.notes = 'Cierre automático de sesión de caja';

      const closingTx = await this.transactionsService.createTransaction(txDto);
      closingTxId = closingTx.id;
    }

    // 5. Actualizar sesión
    session.status = CashSessionStatus.CLOSED;
    session.closedAt = new Date();
    session.closedById = closedBy.id;
    session.expectedAmount = expectedAmount;
    session.closingAmount = expectedAmount; // Por ahora igual, se puede ajustar si hay conteo físico
    session.difference = 0; // Por ahora igual, se puede ajustar si hay conteo físico
    await this.cashSessionRepository.save(session);

    return {
      success: true,
      message: 'Sesión cerrada correctamente',
      sessionId,
      closingTransactionId: closingTxId,
      expectedAmount,
    };
  }

  /**
   * Reconciliar sesión: comparar saldo físico vs. saldo del sistema
   *
   * Si hay discrepancia: crear transacción ADJUSTMENT con asientos
   */
  async reconcile(sessionId: string, physicalAmount: number) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }

    const expectedAmount = session.expectedAmount ?? 0;
    const discrepancy = physicalAmount - Number(expectedAmount);

    // TODO: Si hay discrepancia > 0: crear ADJUSTMENT transaction con asientos
    // const adjustment = await this.transactionsService.createTransaction({
    //   transactionType: TransactionType.ADJUSTMENT,
    //   amount: Math.abs(discrepancy),
    //   direction: discrepancy > 0 ? 'CREDIT' : 'DEBIT',
    //   ...
    // });

    return {
      success: true,
      reconciliation: {
        sessionId,
        expectedAmount: Number(expectedAmount),
        physicalAmount,
        discrepancy,
        requiresAdjustment: Math.abs(discrepancy) > 0,
        // adjustmentTransactionId: adjustment?.id,
      },
    };
  }

  /**
   * Query: Obtener estadísticas de sesión
   */
  async getStats(sessionId: string) {
    const session = await this.cashSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Sesión ${sessionId} no encontrada`);
    }

    // TODO: Calcular estadísticas desde LedgerEntries
    // SELECT SUM(amount) FROM ledger_entries WHERE cashSessionId = ?
    // SELECT COUNT(*) FROM transactions WHERE cashSessionId AND type = SALE

    return {
      success: true,
      stats: {
        sessionId,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        status: session.status,
        expectedAmount: session.expectedAmount,
        closingAmount: session.closingAmount,
        difference: session.difference,
        // TODO: Add totalSales, totalPayments, etc from DB
      },
    };
  }
}
