import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull, In } from 'typeorm';
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
import { Unit } from '@modules/units/domain/unit.entity';
import { VariantQuantityConversionService } from '@modules/product-variants/application/variant-quantity-conversion.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import { CompaniesService } from '@modules/companies/application/companies.service';
import { PromotionsService } from '@modules/promotions/application/promotions.service';
import { applyPromotions } from '@modules/promotions/application/discount-engine';
import type { AppliedSnapshot } from '@modules/promotions/application/discount-engine.types';
import { Promotion } from '@modules/promotions/domain/promotion.entity';
import { PromotionRedemption } from '@modules/promotions/domain/promotion-redemption.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';

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
  private readonly logger = new Logger(SalesFromSessionService.name);

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
    private readonly promotionsService: PromotionsService,
    private readonly variantQuantityConversion: VariantQuantityConversionService,
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
      promotionSnapshot,
    } = createSaleDto;

    /** Medios con monto > 0: montos en cero no cuentan como uso en la venta. */
    const paymentsForSale = Array.isArray(payments)
      ? payments.filter((p) => (Number(p.amount) || 0) > 0)
      : null;

    // Validaciones básicas
    if (!lines || lines.length === 0) {
      throw new BadRequestException('Debes enviar al menos una línea de venta');
    }

    if (
      Array.isArray(payments) &&
      payments.length > 0 &&
      paymentsForSale &&
      paymentsForSale.length === 0
    ) {
      throw new BadRequestException(
        'Todos los medios de pago enviados tienen monto cero.',
      );
    }

    const paymentsUsed = paymentsForSale ?? [];

    // Determinar método de pago final.
    // Si hay múltiples pagos, NO se marca como `MIXED`: el sistema
    // infiere "mixto" leyendo `metadata.paymentSnapshots.length > 1`.
    // Para `paymentMethod` se usa el medio del pago de mayor monto
    // (fallback al primero) para que reportes/asientos sigan teniendo
    // un valor representativo.
    let finalPaymentMethod = paymentMethod;
    const isMixedPayment = paymentsUsed.length > 1;
    if (paymentsUsed.length > 1) {
      const dominant = [...paymentsUsed].sort(
        (a, b) => Number(b.amount ?? 0) - Number(a.amount ?? 0),
      )[0];
      finalPaymentMethod =
        dominant?.paymentMethod ?? paymentsUsed[0].paymentMethod;
    } else if (paymentsUsed.length === 1) {
      finalPaymentMethod = paymentsUsed[0].paymentMethod;
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

      if (!pointOfSale.companyId) {
        throw new BadRequestException('Punto de venta sin empresa asociada.');
      }
      const companyIdForUnits = pointOfSale.companyId;
      const unitRows = await manager.getRepository(Unit).find({
        where: { companyId: companyIdForUnits, deletedAt: IsNull() },
      });
      const unitsById = new Map(unitRows.map((u) => [u.id, u]));

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
      // Paralelo a `transactionLines`: el contexto que el motor necesita
      // (lineId estable, categoryId, etc.). Usamos un lineId determinista
      // basado en el índice para correlacionar de vuelta los resolvedLines.
      const engineCartLines: Array<{
        lineId: string;
        variantId: string;
        productId: string;
        categoryId: string | null;
        unitPrice: number;
        quantity: number;
      }> = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
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

        const lineUnitId = (
          (line as any).unitId ??
          variant.saleUnitId ??
          variant.unitId ??
          ''
        )
          .toString()
          .trim();
        if (!lineUnitId) {
          throw new BadRequestException(
            `Variante ${variant.id} sin unidad de venta (saleUnitId / unitId).`,
          );
        }
        const converted = this.variantQuantityConversion.toVariantStockBaseSync(
          variant,
          Number(line.quantity) || 0,
          lineUnitId,
          unitsById,
          'sale',
        );

        transactionLines.push({
          productId: variant.productId,
          productVariantId: line.productVariantId,
          productName: variant.product.name,
          productSku: variant.sku,
          variantName: variant.product.name,
          unitId: lineUnitId,
          quantity: line.quantity,
          quantityInBase: converted.quantityInBase,
          unitConversionFactor: converted.unitConversionFactor,
          unitOfMeasure: converted.unitOfMeasure,
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

        engineCartLines.push({
          lineId: `srv-${i}`,
          variantId: line.productVariantId,
          productId: variant.productId ?? '',
          categoryId: (variant.product as any).categoryId ?? null,
          unitPrice: Number(line.unitPrice) || 0,
          quantity: Number(line.quantity) || 0,
        });
      }

      let total = subtotal - discountAmount + taxAmount;

      // ============================================================
      // RE-VALIDACIÓN DE PROMOCIONES (PR 5)
      // ------------------------------------------------------------
      // Si el cliente envió `promotionSnapshot`, re-ejecutamos el
      // motor canónico con datos del servidor. Comparamos por promoción
      // con tolerancia (epsilon = 1 unidad monetaria) y, si hay
      // divergencia material, abortamos. Al pasar la validación,
      // sobreescribimos `discountAmount` y los descuentos por línea con
      // los valores autoritativos del servidor; el snapshot inmutable
      // queda en `metadata.promotionSnapshot`.
      // ============================================================
      const clientSnapshot = Array.isArray(promotionSnapshot)
        ? promotionSnapshot
        : [];
      const companyId = pointOfSale.companyId!;

      let serverAppliedPromotions: AppliedSnapshot[] = [];
      let reservedPromotionIds: string[] = [];

      if (clientSnapshot.length > 0) {
        const effective = await this.promotionsService.findEffective(
          companyId,
          pointOfSale.branchId!,
          pointOfSale.id,
          true,
        );

        const paymentMethodIds: string[] = paymentsUsed
          .map((p) => (p as any).companyPaymentMethodId as string | undefined)
          .filter((x): x is string => !!x);

        const manualSelections = clientSnapshot
          .filter(
            (s) => s.activation === 'MANUAL' || s.activation === 'CODE_ENTRY',
          )
          .map((s) => ({ promotionId: s.promotionId }));

        let customerHistory: {
          promotionId: string;
          usesByThisCustomer: number;
        }[] = [];
        if (customerId) {
          const histRows = await manager.query<
            { promotion_id: string; cnt: string }[]
          >(
            `SELECT promotion_id, COUNT(*) AS cnt
               FROM promotion_redemptions
              WHERE customer_id = $1 AND amount_discounted > 0
              GROUP BY promotion_id`,
            [customerId],
          );
          customerHistory = (histRows ?? []).map((r) => ({
            promotionId: r.promotion_id,
            usesByThisCustomer: Number(r.cnt) || 0,
          }));
        }

        const serverResult = applyPromotions({
          cart: {
            lines: engineCartLines,
            customerId: customerId ?? null,
            paymentMethodIds,
          },
          ctx: {
            companyId,
            branchId: pointOfSale.branchId!,
            pointOfSaleId: pointOfSale.id,
            now: new Date(),
          },
          promotions: effective,
          manualSelections,
          customerHistory,
        });

        // Validación: comparar por promoción y total contra el snapshot.
        const epsilon = 1;
        const clientById = new Map<string, number>();
        for (const s of clientSnapshot) {
          clientById.set(
            s.promotionId,
            (clientById.get(s.promotionId) ?? 0) +
              (Number(s.amountDiscounted) || 0),
          );
        }
        const serverById = new Map<string, number>();
        for (const ap of serverResult.appliedPromotions) {
          serverById.set(
            ap.promotionId,
            (serverById.get(ap.promotionId) ?? 0) +
              (Number(ap.amountDiscounted) || 0),
          );
        }
        const allIds = new Set<string>([
          ...clientById.keys(),
          ...serverById.keys(),
        ]);
        for (const id of allIds) {
          const c = clientById.get(id) ?? 0;
          const s = serverById.get(id) ?? 0;
          if (Math.abs(c - s) > epsilon) {
            throw new BadRequestException(
              `El descuento de la promoción ${id} no coincide con el cálculo del servidor (${c} vs ${s}). La venta no se procesará.`,
            );
          }
        }

        // Aplicar resultado canónico a líneas y totales.
        let recomputedSubtotal = 0;
        let recomputedLineDiscount = 0;
        let recomputedTax = 0;
        for (let i = 0; i < transactionLines.length; i++) {
          const tl = transactionLines[i];
          const resolved = serverResult.resolvedLines.find(
            (r) => r.lineId === `srv-${i}`,
          );
          const lineQty = Number(tl.quantity) || 0;
          const lineUnit = Number(tl.unitPrice) || 0;
          const lineSubtotal = lineQty * lineUnit;
          const lineTax = Number(tl.taxAmount) || 0;
          const ld = resolved?.discount?.discountAmount ?? 0;
          const lp = resolved?.discount?.discountPercentage ?? 0;
          tl.discountAmount = ld;
          tl.discountPercentage = lp;
          tl.subtotal = lineSubtotal - ld;
          tl.total = lineSubtotal - ld + lineTax;
          recomputedSubtotal += lineSubtotal;
          recomputedLineDiscount += ld;
          recomputedTax += lineTax;
        }
        subtotal = recomputedSubtotal;
        taxAmount = recomputedTax;
        discountAmount =
          recomputedLineDiscount +
          (Number(serverResult.orderDiscountAmount) || 0);
        total = subtotal - discountAmount + taxAmount;

        // Reserva atómica de `uses_count` ANTES de crear la transacción.
        // Si alguna promoción se agotó entre el cálculo y el cierre, el
        // UPDATE no devolverá filas y abortamos antes de persistir nada.
        for (const ap of serverResult.appliedPromotions) {
          const updated = await manager.query<{ id: string }[]>(
            `UPDATE promotions
                SET uses_count = uses_count + 1,
                    updated_at = now()
              WHERE id = $1
                AND deleted_at IS NULL
                AND (max_uses_total IS NULL OR uses_count < max_uses_total)
              RETURNING id`,
            [ap.promotionId],
          );
          if (!updated || updated.length === 0) {
            // Compensar reservas previas dentro del mismo cierre.
            for (const pid of reservedPromotionIds) {
              try {
                await manager.query(
                  `UPDATE promotions SET uses_count = GREATEST(uses_count - 1, 0), updated_at = now() WHERE id = $1`,
                  [pid],
                );
              } catch {
                /* swallow compensation errors */
              }
            }
            throw new ConflictException(
              `La promoción '${ap.promotionCode}' alcanzó su límite total de usos.`,
            );
          }
          reservedPromotionIds.push(ap.promotionId);
        }
        serverAppliedPromotions = serverResult.appliedPromotions;
      }

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
      if (paymentsUsed.length > 0) {
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
        paymentSnapshots = paymentsUsed.map((p) => {
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

      // Almacén para stock y automation: debe persistirse en `transactions.storageId`
      // (UpdateStockActionHandler lo exige). Sin `storageId`, el listener no mueve inventario.
      let effectiveStorageId =
        typeof storageId === 'string' && storageId.trim()
          ? storageId.trim()
          : undefined;
      if (!effectiveStorageId && pointOfSale.storageId) {
        effectiveStorageId = pointOfSale.storageId;
      }
      if (!effectiveStorageId && pointOfSale.branchId) {
        const storageRepo = manager.getRepository(Storage);
        const branchId = pointOfSale.branchId;
        let chosen = await storageRepo.findOne({
          where: {
            branchId,
            isDefault: true,
            isActive: true,
            deletedAt: IsNull(),
          },
          order: { name: 'ASC' },
        });
        if (!chosen) {
          chosen = await storageRepo.findOne({
            where: {
              branchId,
              isActive: true,
              deletedAt: IsNull(),
            },
            order: { isDefault: 'DESC', name: 'ASC' },
          });
        }
        effectiveStorageId = chosen?.id;
      }

      const qtyNeedByVariant = new Map<string, number>();
      for (const tl of transactionLines) {
        const vid = tl.productVariantId as string | undefined;
        if (!vid) continue;
        const q = Number(tl.quantityInBase) || 0;
        if (q <= 0) continue;
        qtyNeedByVariant.set(vid, (qtyNeedByVariant.get(vid) ?? 0) + q);
      }
      const variantIdsToCheck = [...qtyNeedByVariant.keys()];
      if (effectiveStorageId && variantIdsToCheck.length > 0) {
        const variantsToCheck = await manager.getRepository(ProductVariant).find({
          where: { id: In(variantIdsToCheck) },
          select: ['id', 'sku', 'trackInventory', 'allowNegativeStock'],
        });
        for (const v of variantsToCheck) {
          if (!v.trackInventory || v.allowNegativeStock) continue;
          const need = qtyNeedByVariant.get(v.id) ?? 0;
          const sl = await manager.getRepository(StockLevel).findOne({
            where: {
              productVariantId: v.id,
              storageId: effectiveStorageId,
            },
          });
          const avail = Number(sl?.availableStock ?? 0);
          if (need > avail) {
            throw new BadRequestException(
              `Stock insuficiente en sala de venta para ${v.sku ?? v.id}: se requieren ${need} (unidad base), disponible ${avail}.`,
            );
          }
        }
      }

      const hasStockLines = transactionLines.some((l) => l.productVariantId);
      if (hasStockLines && !effectiveStorageId) {
        this.logger.error(
          `Venta sin storageId: POS=${pointOfSaleId} branch=${pointOfSale.branchId ?? 'null'}. ` +
            `UpdateStock omitirá el descuento de inventario.`,
        );
        throw new BadRequestException(
          'No hay almacén para descontar stock en esta sucursal. Marque un almacén como predeterminado ' +
            '(Inventario → Almacenes) o envíe storageId en la venta.',
        );
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
        storageId: effectiveStorageId,
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
          paymentDetails: paymentsUsed.length > 0 ? paymentsUsed : undefined,
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
          storageId: effectiveStorageId || undefined,
          promotionSnapshot:
            serverAppliedPromotions.length > 0
              ? serverAppliedPromotions
              : undefined,
        },
      });

      // transformar líneas a instancias de CreateTransactionLineDto
      dto.lines = transactionLines.map((line) => {
        const lineDto = new CreateTransactionLineDto();
        Object.assign(lineDto, line);
        return lineDto;
      });

      // Delegar a TransactionsService para obtener transacción con asientos generados.
      // Si esto falla, devolvemos `uses_count` a su valor previo para no
      // dejar reservas huérfanas.
      let finalTransaction: Awaited<
        ReturnType<TransactionsService['createTransaction']>
      >;
      try {
        finalTransaction =
          await this.transactionsService.createTransaction(dto);
      } catch (err) {
        for (const pid of reservedPromotionIds) {
          try {
            await manager.query(
              `UPDATE promotions SET uses_count = GREATEST(uses_count - 1, 0), updated_at = now() WHERE id = $1`,
              [pid],
            );
          } catch {
            /* swallow compensation errors */
          }
        }
        throw err;
      }

      // Persistir redenciones inmutables vinculadas a la transacción
      // recién creada. El snapshot inmutable de cada promoción sobrevive
      // a ediciones futuras de la regla.
      if (serverAppliedPromotions.length > 0) {
        for (const ap of serverAppliedPromotions) {
          await manager.getRepository(PromotionRedemption).insert({
            companyId,
            promotionId: ap.promotionId,
            transactionId: finalTransaction.id,
            customerId: customerId ?? null,
            amountDiscounted: Number(ap.amountDiscounted) || 0,
            snapshot: ap as unknown as Record<string, any>,
          });
        }
      }

      // Actualizar `expectedAmount` de la sesión solo con el efectivo
      // realmente recibido. Antes se sumaba el `amountPaid` total cuando
      // el método era `CASH` o `MIXED`, lo cual sobre-contaba en pagos
      // mixtos (sumaba también la parte tarjeta/transferencia). Ahora
      // se suma exactamente la porción `CASH` declarada en los pagos con monto > 0.
      const cashPortion = (() => {
        if (paymentsUsed.length > 0) {
          return paymentsUsed
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
