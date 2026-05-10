import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import {
  CashSession,
  CashSessionStatus,
} from '@modules/cash-sessions/domain/cash-session.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { User } from '@modules/users/domain/user.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import { CompaniesService } from '@modules/companies/application/companies.service';

/**
 * SalesFromSessionService - Single Responsibility: Sale Transaction Creation
 *
 * Responsabilidades:
 * - Crear transacciones SALE desde una sesión de caja
 * - Gestionar líneas de venta (add, update, delete)
 * - Queries de ventas por sesión
 *
 * Delegaciones:
 * - Transacción atómica + asientos → TransactionsService.createTransaction()
 * - Validaciones V1-V7 → TransactionsService (enforced at creation)
 * - Stock management → SessionInventoryService
 *
 * IMPORTANTE: Cada SALE que se crea aquí genera automáticamente:
 * - 1 Transaction record (SALE type)
 * - N TransactionLine records (1 per product)
 * - M LedgerEntry records (auto-generated via TransactionsService)
 * - Validation gates V1-V7 enforced
 * - Audit trail recorded
 */
@Injectable()
export class SalesFromSessionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    @InjectRepository(CashSession)
    private readonly cashSessionRepository: Repository<CashSession>,
    @InjectRepository(PointOfSale)
    private readonly pointOfSaleRepository: Repository<PointOfSale>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    private readonly companiesService: CompaniesService,
  ) {}

  /**
   * Query: Obtener todas las ventas de una sesión
   */
  async getSalesForSession(cashSessionId: string) {
    // Verificar que la sesión existe
    const cashSession = await this.cashSessionRepository.findOne({
      where: { id: cashSessionId },
    });

    if (!cashSession) {
      throw new NotFoundException(
        `Sesión de caja ${cashSessionId} no encontrada`,
      );
    }

    // Obtener todas las transacciones de tipo SALE
    const sales = await this.transactionRepository.find({
      where: {
        cashSessionId,
        transactionType: TransactionType.SALE,
      },
      relations: [
        'lines',
        'lines.productVariant',
        'lines.productVariant.product',
      ],
      order: {
        createdAt: 'DESC',
      },
    });

    // Mapear a formato simplificado
    const mappedSales = sales.map((transaction) => ({
      id: transaction.id,
      type: transaction.transactionType,
      amount: transaction.total, // ✅ FIXED: usar total, no taxAmount
      paymentMethod: transaction.paymentMethod,
      status: transaction.status,
      createdAt: transaction.createdAt,
      documentNumber: transaction.documentNumber,
      externalReference: transaction.externalReference,
      notes: transaction.notes,
      lines:
        transaction.lines?.map((line) => ({
          id: line.id,
          productVariantId: line.productVariantId,
          productName:
            line.productVariant?.product?.name || 'Producto desconocido',
          variantName: undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountAmount: line.discountAmount,
          taxAmount: line.taxAmount,
          totalAmount: line.total, // ✅ FIXED: usar line.total
        })) || [],
    }));

    return {
      success: true,
      cashSessionId,
      totalSales: sales.length,
      sales: mappedSales,
    };
  }

  /**
   * Crear una nueva SALE desde sesión de caja
   *
   * IMPORTANTE DELEGACIÓN: Esta función crea la transacción PERO DELEGA
   * la generación de asientos a TransactionsService.createTransaction()
   *
   * Flujo:
   * 1. Validaciones básicas (líneas no vacías, etc)
   * 2. Validar usuario, POS, sesión
   * 3. Validar productos/variantes
   * 4. Calcular totales (subtotal, tax, discount, total)
   * 5. Crear Transaction en BD
   * 6. Crear TransactionLine records
   * 7. Delegar a TransactionsService.createTransaction() para:
   *    - Generar documentNumber único
   *    - Validaciones V1-V7 (saldo cliente, inventario, etc)
   *    - Generación automática de asientos
   *    - Audit trail
   * 8. Reservar stock (SessionInventoryService)
   * 9. Retornar transacción con asientos
   */
  async createSale(createSaleDto: CreateSaleDto) {
    const {
      userName,
      pointOfSaleId,
      cashSessionId,
      paymentMethod,
      payments,
      lines,
      amountPaid,
      changeAmount,
      customerId,
      documentNumber,
      externalReference,
      notes,
      storageId,
      bankAccountKey,
      metadata,
    } = createSaleDto;

    // Validaciones básicas
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Debes enviar al menos una línea de venta');
    }

    // Determinar método de pago final.
    // Si hay múltiples pagos, NO se marca como `MIXED`: el sistema
    // infiere "mixto" leyendo `metadata.paymentSnapshots.length > 1`.
    // Para `paymentMethod` se usa el medio del pago de mayor monto
    // (fallback al primero) para que reportes/asientos sigan teniendo
    // un valor representativo.
    let finalPaymentMethod = paymentMethod;
    const isMixedPayment = !!(payments && payments.length > 1);
    if (payments && payments.length > 1) {
      const dominant = [...payments].sort(
        (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0),
      )[0];
      finalPaymentMethod = dominant?.paymentMethod ?? payments[0].paymentMethod;
    } else if (payments && payments.length === 1) {
      finalPaymentMethod = payments[0].paymentMethod;
    }

    return await this.dataSource.transaction(async (manager) => {
      // Verificar usuario
      const user = await manager.getRepository(User).findOne({
        where: { userName, deletedAt: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`Usuario ${userName} no encontrado`);
      }

      // Verificar POS
      const pointOfSale = await manager.getRepository(PointOfSale).findOne({
        where: { id: pointOfSaleId, deletedAt: IsNull() },
      });
      if (!pointOfSale) {
        throw new NotFoundException(
          `Punto de venta ${pointOfSaleId} no encontrado`,
        );
      }

      // Verificar sesión de caja
      const cashSession = await manager.getRepository(CashSession).findOne({
        where: { id: cashSessionId },
      });
      if (!cashSession) {
        throw new NotFoundException(
          `Sesión de caja ${cashSessionId} no encontrada`,
        );
      }

      if (cashSession.status !== CashSessionStatus.OPEN) {
        throw new ConflictException(
          `La sesión de caja está en estado ${cashSession.status}, no se pueden registrar ventas`,
        );
      }

      // Calcular totales
      let subtotal = 0;
      let taxAmount = 0;
      let discountAmount = 0;

      const transactionLines: Partial<TransactionLine>[] = [];

      for (const line of lines) {
        // Verificar variante existe
        const variant = await manager.getRepository(ProductVariant).findOne({
          where: { id: line.productVariantId },
          relations: ['product'],
        });
        if (!variant) {
          throw new NotFoundException(
            `Variante ${line.productVariantId} no encontrada`,
          );
        }
        if (!variant.product) {
          throw new NotFoundException(
            `Producto no encontrado para variante ${line.productVariantId}`,
          );
        }

        const lineSubtotal = line.quantity * line.unitPrice;
        const lineDiscount = line.discountAmount || 0;
        const lineTax = line.taxAmount || 0;
        const lineTotal = lineSubtotal - lineDiscount + lineTax;

        // Defensive: Ensure taxRate is within valid range (0-100)
        const safeTaxRate = Math.max(0, Math.min(100, line.taxRate || 0));

        subtotal += lineSubtotal;
        discountAmount += lineDiscount;
        taxAmount += lineTax;

        transactionLines.push({
          productId: variant.productId,
          productVariantId: line.productVariantId,
          productName: variant.product.name,
          productSku: variant.sku,
          variantName: variant.product.name,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          unitCost: line.unitCost || variant.baseCost || 0,
          discountAmount: lineDiscount,
          taxId: line.taxId || undefined,
          taxRate: safeTaxRate,
          taxAmount: lineTax,
          subtotal: lineSubtotal - lineDiscount,
          total: lineTotal,
          notes: line.notes || undefined,
        });
      }

      const total = subtotal - discountAmount + taxAmount;

      // Construir snapshots inmutables de medios de pago (trazabilidad).
      // Si una entrada incluye `companyPaymentMethodId`, hidratamos alias,
      // bankAccountKey y método desde el catálogo vivo de la empresa.
      let paymentSnapshots: Array<{
        companyPaymentMethodId: string | null;
        method: string;
        alias: string | null;
        bankAccountKey: string | null;
        amount: number;
        reference: string | null;
        capturedAt: string;
        checkData?: Record<string, any> | null;
      }> = [];
      if (Array.isArray(payments) && payments.length > 0) {
        const companyId = pointOfSale.companyId;
        let catalog: Awaited<
          ReturnType<CompaniesService['getPaymentMethods']>
        > = [];
        try {
          if (companyId) {
            catalog = await this.companiesService.getPaymentMethods(companyId);
          }
        } catch {
          catalog = [];
        }
        const now = new Date().toISOString();
        paymentSnapshots = payments.map((p) => {
          const cmpId = (p as any).companyPaymentMethodId as string | undefined;
          const cmp = cmpId ? catalog.find((c) => c.id === cmpId) : undefined;
          const rawCheckData = (p as any).checkData as
            | Record<string, any>
            | undefined;
          return {
            companyPaymentMethodId: cmp?.id ?? null,
            method: cmp?.method ?? p.paymentMethod,
            alias: cmp?.alias ?? null,
            bankAccountKey: cmp?.bankAccountKey ?? p.bankAccountId ?? null,
            amount: Number(p.amount) || 0,
            reference: ((p as any).reference as string | undefined) ?? null,
            capturedAt: now,
            checkData:
              rawCheckData && typeof rawCheckData === 'object'
                ? rawCheckData
                : null,
          };
        });
      }

      // ✅ DELEGAR: Usar TransactionsService.createTransaction() para generar asientos
      // Esto asegura:
      // 1. documentNumber único generado
      // 2. Validaciones V1-V7
      // 3. Asientos contables automáticos (revenue, receivable, COGS, inventory)
      // 4. Audit trail completo
      // construir DTO de transacción usando la clase para que métodos como validate() existan
      const dto = new CreateTransactionDto();
      Object.assign(dto, {
        transactionType: TransactionType.SALE,
        branchId: pointOfSale.branchId,
        userId: user.id,
        pointOfSaleId: pointOfSale.id,
        cashSessionId: cashSession.id,
        customerId: customerId || undefined,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        paymentMethod: finalPaymentMethod,
        amountPaid: amountPaid || total,
        changeAmount: changeAmount || 0,
        externalReference: externalReference || undefined,
        notes: notes || undefined,
        bankAccountKey: bankAccountKey || undefined,
        metadata: {
          ...metadata,
          paymentDetails: payments,
          paymentSnapshots:
            paymentSnapshots.length > 0 ? paymentSnapshots : undefined,
          paymentSnapshot:
            paymentSnapshots.length === 1 ? paymentSnapshots[0] : undefined,
          /**
           * Flag explícito para reportes/UI. También se puede inferir
           * con `paymentSnapshots.length > 1`. Existe porque ya no
           * marcamos `paymentMethod = MIXED`.
           */
          isMixedPayment,
          storageId: storageId || undefined,
        },
      });

      // transformar líneas a instancias de CreateTransactionLineDto
      dto.lines = transactionLines.map((line) => {
        const lineDto = new CreateTransactionLineDto();
        Object.assign(lineDto, line);
        return lineDto;
      });

      // Delegar a TransactionsService para obtener transacción con asientos generados
      const finalTransaction =
        await this.transactionsService.createTransaction(dto);

      // Actualizar `expectedAmount` de la sesión solo con el efectivo
      // realmente recibido. Antes se sumaba el `amountPaid` total cuando
      // el método era `CASH` o `MIXED`, lo cual sobre-contaba en pagos
      // mixtos (sumaba también la parte tarjeta/transferencia). Ahora
      // se suma exactamente la porción `CASH` declarada en `payments`.
      const cashPortion = (() => {
        if (payments && payments.length > 0) {
          return payments
            .filter((p) => p.paymentMethod === PaymentMethod.CASH)
            .reduce((acc, p) => acc + Number(p.amount ?? 0), 0);
        }
        if (finalPaymentMethod === PaymentMethod.CASH) {
          return Number(amountPaid || total) || 0;
        }
        return 0;
      })();
      if (cashPortion > 0) {
        const previousExpected =
          cashSession.expectedAmount || cashSession.openingAmount || 0;
        cashSession.expectedAmount = Number(previousExpected) + cashPortion;
        await manager.getRepository(CashSession).save(cashSession);
      }

      return {
        success: true,
        transaction: {
          id: finalTransaction.id,
          documentNumber: finalTransaction.documentNumber,
          transactionType: finalTransaction.transactionType,
          total: Number(finalTransaction.total),
          status: finalTransaction.status,
          createdAt: finalTransaction.createdAt,
          paymentMethod: finalTransaction.paymentMethod,
          lines: transactionLines,
        },
        lines: transactionLines,
      };
    });
  }

  /**
   * Agregar línea a una venta existente
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos (LedgerEntriesService.regenerateForTransaction)
   * - Reservar stock nuevamente
   */
  async addLineItem(saleId: string, lineItem: any) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  /**
   * Actualizar línea de venta existente
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos
   * - Ajustar stock
   */
  async updateLineItem(saleId: string, lineItemId: string, updates: any) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  /**
   * Eliminar línea de venta
   *
   * Triggers:
   * - Recalcular totales
   * - Re-generar asientos
   * - Liberar stock
   */
  async deleteLineItem(saleId: string, lineItemId: string) {
    // TODO: Implement
    throw new Error('Not implemented yet');
  }

  private generateTempDocumentNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TEMP-${timestamp}-${random}`;
  }
}
