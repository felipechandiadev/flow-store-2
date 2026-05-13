import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { StoragesService } from '../../storages/application/storages.service';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  TransactionType,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';
import { User } from '@modules/users/domain/user.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { TransactionLine } from '@modules/transaction-lines/domain/transaction-line.entity';
import { UpdateStockLevelThresholdsDto } from './dto/update-stock-level-thresholds.dto';
import type { StockUpdatedPayload } from '@modules/stock-realtime/stock-realtime.types';
import { buildStockUpdatedPayload } from '@modules/stock-realtime/stock-threshold-alert-payload.util';

function compactUnitSymbol(u: { symbol?: string | null; name?: string | null } | null | undefined): string {
  if (!u) {
    return '';
  }
  const sym = String(u.symbol || '').trim();
  if (sym) {
    return sym;
  }
  const name = String(u.name || '').trim();
  return name.length <= 10 ? name : `${name.slice(0, 8)}…`;
}

function parsePositiveBridge(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly storagesService: StoragesService,
    private readonly dataSource: DataSource,
    private readonly transactionsService: TransactionsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Return filter options used by the frontend inventory pages.
   * Provide real storages from the StoragesService; other filters remain empty for now.
   */
  async getFilters() {
    const storages = await this.storagesService.getAllStorages(false);

    return {
      storages,
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
  }

  /**
   * Basic inventory search placeholder. Returns empty rows and total=0.
   * Frontend expects either an array or an object with rows/data and total.
   */
  async search(params?: {
    search?: string;
    branchId?: string;
    storageId?: string;
    page?: number;
    limit?: number;
    sortField?: string;
    sort?: 'asc' | 'desc';
  }) {
    // List from product variants (LEFT stock_levels in a second query) so variants
    // without any stock_level row still appear with zeros.
    const variantQb = this.dataSource
      .getRepository(ProductVariant)
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('variant.stockBaseUnit', 'stockBaseUnit')
      .leftJoinAndSelect('variant.saleUnit', 'saleUnit')
      .where('variant.deletedAt IS NULL')
      .andWhere('(product.deletedAt IS NULL OR product.id IS NULL)');

    if (params?.search) {
      const s = `%${params.search}%`;
      variantQb.andWhere(
        '(product.name LIKE :s OR variant.sku LIKE :s OR (variant.barcode IS NOT NULL AND variant.barcode LIKE :s))',
        { s },
      );
    }

    const variants = await variantQb.getMany();
    const variantIds = variants.map((v) => v.id);

    // Active reservations (reserved qty) per variant, filtered by branch/storage if provided
    const reservationLineQb = this.dataSource
      .getRepository(TransactionLine)
      .createQueryBuilder('tl')
      .innerJoin('tl.transaction', 't')
      .select('tl.productVariantId', 'variantId')
      .addSelect('t.storageId', 'storageId')
      .addSelect('SUM(tl.quantity)', 'reservedQty')
      .where('t.transactionType = :type', { type: TransactionType.INVENTORY_RESERVATION })
      .andWhere('t.status = :status', { status: 'COMPLETED' })
      .andWhere('tl.productVariantId IS NOT NULL')
      .groupBy('tl.productVariantId')
      .addGroupBy('t.storageId');

    if (params?.branchId) {
      reservationLineQb.andWhere('t.branchId = :branchId', { branchId: params.branchId });
    }
    if (params?.storageId) {
      reservationLineQb.andWhere('t.storageId = :storageId', { storageId: params.storageId });
    }

    const reservationRows: Array<{ variantId: string; storageId: string; reservedQty: string }> =
      await reservationLineQb.getRawMany();
    const reservedByVariantStorage = new Map<string, number>();
    const reservedByVariant = new Map<string, number>();
    for (const r of reservationRows) {
      const key = `${r.variantId}::${r.storageId}`;
      const qty = Number(r.reservedQty || 0);
      reservedByVariantStorage.set(key, qty);
      reservedByVariant.set(r.variantId, (reservedByVariant.get(r.variantId) ?? 0) + qty);
    }

    const stockLevels: StockLevel[] = [];
    const CHUNK = 500;
    for (let i = 0; i < variantIds.length; i += CHUNK) {
      const chunk = variantIds.slice(i, i + CHUNK);
      const batch = await this.dataSource.getRepository(StockLevel).find({
        where: { productVariantId: In(chunk) },
        relations: ['storage', 'storage.branch'],
      });
      stockLevels.push(...batch);
    }

    const levelsByVariant = new Map<string, StockLevel[]>();
    for (const sl of stockLevels) {
      const list = levelsByVariant.get(sl.productVariantId) ?? [];
      list.push(sl);
      levelsByVariant.set(sl.productVariantId, list);
    }

    const filterLevel = (sl: StockLevel): boolean => {
      if (params?.storageId && sl.storageId !== params.storageId) {
        return false;
      }
      if (params?.branchId && sl.storage?.branchId !== params.branchId) {
        return false;
      }
      return true;
    };

    let placeholderStorage: Storage | null = null;
    if (params?.storageId) {
      placeholderStorage = await this.dataSource
        .getRepository(Storage)
        .findOne({
          where: { id: params.storageId },
          relations: ['branch'],
        });
    }

    const grouped: Record<string, any> = {};
    for (const variant of variants) {
      const vid = variant.id;
      const product: any = variant.product;
      const allLevels = levelsByVariant.get(vid) ?? [];
      const entries = allLevels.filter(filterLevel);

      const row = {
        id: variant.id,
        productId: product?.id || null,
        variantId: variant.id,
        productName: product?.name || '',
        sku: variant.sku || '',
        unitOfMeasure: (() => {
          const u = variant.stockBaseUnit ?? variant.unit;
          if (!u) {
            return '';
          }
          const sym = String(u.symbol || '').trim();
          const name = String(u.name || '').trim();
          if (sym && name && sym.toLowerCase() !== name.toLowerCase()) {
            return `${name} (${sym})`;
          }
          return sym || name;
        })(),
        saleUnitOfMeasure: (() => {
          const u = variant.saleUnit ?? variant.unit;
          if (!u) {
            return '';
          }
          const sym = String(u.symbol || '').trim();
          const name = String(u.name || '').trim();
          if (sym && name && sym.toLowerCase() !== name.toLowerCase()) {
            return `${name} (${sym})`;
          }
          return sym || name;
        })(),
        stockUnitSymbol: compactUnitSymbol(
          (variant as any).stockBaseUnit ?? (variant as any).unit,
        ),
        saleUnitSymbol: compactUnitSymbol(
          (variant as any).saleUnit ?? (variant as any).unit,
        ),
        stockBaseQtyPerCountSaleUnit: parsePositiveBridge(
          (variant as any).stockBaseQtyPerCountSaleUnit,
        ),
        attributeValues: variant.attributeValues || {},
        totalStock: 0,
        availableStock: 0,
        reservedStock: 0,
        availableAfterReservation: 0,
        inventoryValueCost: 0,
        pmp: Number(variant.pmp || 0),
        storageBreakdown: [] as any[],
        movements: [] as any[],
        primaryStorageName: '',
        primaryStorageQuantity: 0,
        isBelowMinimum: false,
      };
      grouped[vid] = row;

      if (
        params?.storageId &&
        entries.length === 0 &&
        placeholderStorage
      ) {
        row.storageBreakdown.push({
          stockLevelId: null,
          storageId: placeholderStorage.id,
          storageName: placeholderStorage.name || '',
          branchName: placeholderStorage.branch?.name || null,
          quantity: 0,
          availableStock: 0,
          committedStock: 0,
          minimumStockOverride: null,
          maximumStockOverride: null,
          reorderPointOverride: null,
          effectiveMinimumStock: Number(variant.minimumStock || 0),
          effectiveMaximumStock: Number(variant.maximumStock || 0),
          effectiveReorderPoint: Number(variant.reorderPoint || 0),
        });
      }

      let anyBelowEffective = false;
      for (const sl of entries) {
        const qty = Number(sl.physicalStock || 0);
        const reservedQty = reservedByVariantStorage.get(`${vid}::${sl.storageId}`) ?? 0;
        row.reservedStock += reservedQty;
        const effMin =
          sl.minimumStock != null
            ? Number(sl.minimumStock)
            : Number(variant.minimumStock || 0);
        if (effMin > 0 && qty < effMin) {
          anyBelowEffective = true;
        }
        row.storageBreakdown.push({
          stockLevelId: sl.id,
          storageId: sl.storageId,
          storageName: sl.storage?.name || '',
          branchName: sl.storage?.branch?.name || null,
          quantity: qty,
          availableStock: Number(sl.availableStock || 0),
          reservedStock: reservedQty,
          availableAfterReservation: Math.max(0, Number(sl.availableStock || 0) - reservedQty),
          committedStock: Number(sl.committedStock || 0),
          minimumStockOverride: sl.minimumStock ?? null,
          maximumStockOverride: sl.maximumStock ?? null,
          reorderPointOverride: sl.reorderPoint ?? null,
          effectiveMinimumStock: effMin,
          effectiveMaximumStock:
            sl.maximumStock != null
              ? Number(sl.maximumStock)
              : Number(variant.maximumStock || 0),
          effectiveReorderPoint:
            sl.reorderPoint != null
              ? Number(sl.reorderPoint)
              : Number(variant.reorderPoint || 0),
        });
        row.totalStock += qty;
        row.availableStock += Number(sl.availableStock || 0);
        row.inventoryValueCost += qty * Number(variant.baseCost || 0);
        if (!row.primaryStorageName) {
          row.primaryStorageName = sl.storage?.name || '';
          row.primaryStorageQuantity = qty;
        }
      }

      row.availableAfterReservation = Math.max(0, Number(row.availableStock || 0) - Number(row.reservedStock || 0));
      row.isBelowMinimum =
        anyBelowEffective ||
        Number(row.totalStock) < Number(variant.minimumStock || 0);
    }

    const rows = variants.map((v) => grouped[v.id]).filter(Boolean);
    for (const r of rows) {
      r.pmpValue = Number(((r.totalStock || 0) * (r.pmp || 0)).toFixed(2));
    }

    const sumPmpValue = rows.reduce((acc, r) => acc + Number(r.pmpValue || 0), 0);

    const sortField = (params?.sortField || 'productName').trim();
    const sortDesc = params?.sort === 'desc';
    const compare = (a: Record<string, any>, b: Record<string, any>): number => {
      let va: string | number | boolean | null | undefined;
      let vb: string | number | boolean | null | undefined;
      switch (sortField) {
        case 'sku':
          va = a.sku;
          vb = b.sku;
          break;
        case 'unitOfMeasure':
          va = a.unitOfMeasure;
          vb = b.unitOfMeasure;
          break;
        case 'saleUnitOfMeasure':
          va = a.saleUnitOfMeasure;
          vb = b.saleUnitOfMeasure;
          break;
        case 'totalStock':
          va = Number(a.totalStock);
          vb = Number(b.totalStock);
          break;
        case 'availableStock':
          va = Number(a.availableStock);
          vb = Number(b.availableStock);
          break;
        case 'pmp':
          va = Number(a.pmp);
          vb = Number(b.pmp);
          break;
        case 'pmpValue':
          va = Number(a.pmpValue);
          vb = Number(b.pmpValue);
          break;
        case 'inventoryValueCost':
          va = Number(a.inventoryValueCost);
          vb = Number(b.inventoryValueCost);
          break;
        case 'isBelowMinimum':
          va = a.isBelowMinimum ? 1 : 0;
          vb = b.isBelowMinimum ? 1 : 0;
          break;
        default:
          va = a.productName;
          vb = b.productName;
      }
      if (va == null && vb == null) {
        return 0;
      }
      if (va == null) {
        return 1;
      }
      if (vb == null) {
        return -1;
      }
      if (typeof va === 'number' && typeof vb === 'number') {
        return va - vb;
      }
      return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' });
    };
    rows.sort((a, b) => {
      const c = compare(a, b);
      return sortDesc ? -c : c;
    });

    const total = rows.length;
    const page = Math.max(1, Number(params?.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(params?.limit) || 25));
    const start = (page - 1) * limit;
    const pageRows = rows.slice(start, start + limit);

    // fetch recent movements per variant (limit 5 each) — solo página actual
    const transactionLineRepo =
      this.dataSource.getRepository('TransactionLine');
    for (const row of pageRows) {
      if (!row.variantId) continue;
      const movs: any[] = await transactionLineRepo
        .createQueryBuilder('tl')
        .innerJoin('tl.transaction', 't')
        .leftJoin('t.storageEntry', 's')
        .leftJoin('t.targetStorageEntry', 'ts')
        .where('tl.productVariantId = :vid', { vid: row.variantId })
        .orderBy('t.createdAt', 'DESC')
        .limit(5)
        .select([
          't.id as transactionId',
          't.documentNumber as documentNumber',
          't.transactionType as transactionType',
          't.createdAt as createdAt',
          'tl.quantity as quantity',
          't.notes as notes',
          's.name as storageName',
          'ts.name as targetStorageName',
        ])
        .getRawMany();
      row.movements = movs.map((m) => ({
        ...m,
        direction: [
          'PURCHASE',
          'TRANSFER_IN',
          'ADJUSTMENT_IN',
          'CASH_SESSION_OPENING',
        ].includes(m.transactionType)
          ? 'IN'
          : 'OUT',
      }));
    }

    return {
      rows: pageRows,
      total,
      sumPmpValue: Number(sumPmpValue.toFixed(2)),
    };
  }

  async adjust(data: {
    variantId: string;
    storageId: string;
    currentQuantity: number;
    targetQuantity: number;
    note?: string;
  }) {
    const { variantId, storageId, currentQuantity, targetQuantity, note } =
      data;
    // The listener already keeps stock levels up‑to‑date whenever a
    // transaction is created. In previous versions we were manually
    // writing the target quantity here, which caused the listener to apply
    // the adjustment a second time and leave the stock in an incorrect
    // state.  Instead we simply create the appropriate adjustment
    // transaction and let the listener perform the actual update.
    const diff = targetQuantity - currentQuantity;
    const qtyAbs = Math.abs(diff);
    if (qtyAbs < 0.000001) {
      return {
        success: true,
        message: 'Sin cambios de stock',
        documentNumbers: [],
      };
    }

    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: variantId },
      relations: ['product', 'unit'],
    });
    if (!variant) {
      throw new NotFoundException(`Variante ${variantId} no encontrada`);
    }
    const product: any = variant.product;

    // Branch from almacén (sirve aunque no exista fila stock_levels para esta variante).
    const storageEntity = await this.dataSource.getRepository(Storage).findOne({
      where: { id: storageId },
      select: ['id', 'branchId'],
    });
    if (!storageEntity) {
      throw new NotFoundException(`Almacén ${storageId} no encontrado`);
    }
    let branchId: string | undefined =
      storageEntity.branchId && String(storageEntity.branchId).length > 0
        ? storageEntity.branchId
        : undefined;

    if (!branchId) {
      const fallbackBranches = await this.dataSource.getRepository(Branch).find({
        where: { deletedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: 1,
      });
      branchId = fallbackBranches[0]?.id;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal del ajuste: el almacén no tiene sucursal y no hay sucursales en el sistema.',
      );
    }

    // pick a default user for internal adjustments (first active user)
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id;
    if (!userId) {
      throw new BadRequestException(
        'No hay usuario activo para registrar el ajuste. Cree o active al menos un usuario en el sistema.',
      );
    }

    const txDto = new CreateTransactionDto();
    txDto.transactionType =
      diff >= 0
        ? TransactionType.ADJUSTMENT_IN
        : TransactionType.ADJUSTMENT_OUT;
    txDto.branchId = branchId || '';
    txDto.userId = userId;
    txDto.storageId = storageId;
    txDto.subtotal = qtyAbs;
    txDto.taxAmount = 0;
    txDto.discountAmount = 0;
    txDto.total = qtyAbs;
    // internal inventory movements are not actual payments
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = qtyAbs;
    txDto.notes = note || undefined;
    txDto.lines = [
      {
        productId: variant.productId || product?.id,
        productVariantId: variantId,
        unitId: variant.unitId,
        productName: product?.name || 'Producto',
        productSku: variant.sku,
        variantName: undefined,
        quantity: qtyAbs,
        unitPrice: 0,
        unitCost: 0,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: 0,
        taxAmount: 0,
        subtotal: qtyAbs,
        total: qtyAbs,
        notes: note,
      } as any,
    ];
    const tx = await this.transactionsService.createTransaction(txDto);

    return {
      success: true,
      message: `Stock ajustado en ${diff}`,
      documentNumbers: [tx.documentNumber],
    };
  }

  async transfer(data: {
    variantId: string;
    sourceStorageId: string;
    targetStorageId: string;
    quantity: number;
    note?: string;
  }) {
    const { variantId, sourceStorageId, targetStorageId, quantity, note } =
      data;

    // Stock: solo vía transacciones + UpdateStock (evita doble movimiento).
    const srcLevel = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId: sourceStorageId },
    });
    const srcQty = Number(srcLevel?.physicalStock ?? 0);
    if (srcQty + 1e-9 < quantity) {
      throw new BadRequestException(
        `Stock insuficiente en origen: hay ${srcQty}, se solicitan ${quantity}.`,
      );
    }

    let branchId: string | undefined;
    const rawSource = await this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .leftJoin('sl.storage', 's')
      .where('sl.storageId = :sid', { sid: sourceStorageId })
      .select('s.branchId', 'branchId')
      .getRawOne();
    branchId = rawSource?.branchId || undefined;
    if (branchId === '') {
      branchId = undefined;
    }
    // if still undefined try target storage
    if (!branchId) {
      const rawTarget = await this.dataSource
        .getRepository(StockLevel)
        .createQueryBuilder('sl')
        .leftJoin('sl.storage', 's')
        .where('sl.storageId = :tid', { tid: targetStorageId })
        .select('s.branchId', 'branchId')
        .getRawOne();
      branchId = rawTarget?.branchId || undefined;
      if (branchId === '') branchId = undefined;
    }

    if (!branchId) {
      throw new BadRequestException(
        'No se pudo determinar la sucursal asociada a los almacenes involucrados.',
      );
    }

    const txOut = new CreateTransactionDto();
    txOut.transactionType = TransactionType.TRANSFER_OUT;
    txOut.branchId = branchId || '';
    // choose a default user (first active) for inventory operations
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    txOut.userId = fallbackUser?.id || '';
    txOut.storageId = sourceStorageId;
    txOut.targetStorageId = targetStorageId;
    txOut.subtotal = quantity;
    txOut.total = quantity;
    txOut.paymentMethod = undefined as any;
    txOut.amountPaid = quantity;
    txOut.notes = note || undefined;
    const out = await this.transactionsService.createTransaction(txOut);

    const txIn = new CreateTransactionDto();
    txIn.transactionType = TransactionType.TRANSFER_IN;
    txIn.branchId = branchId || '';
    txIn.userId = txOut.userId; // same user
    txIn.storageId = targetStorageId;
    txIn.targetStorageId = sourceStorageId;
    txIn.subtotal = quantity;
    txIn.total = quantity;
    txIn.paymentMethod = undefined as any;
    txIn.amountPaid = quantity;
    txIn.notes = note || undefined;
    const inn = await this.transactionsService.createTransaction(txIn);

    return {
      success: true,
      message: 'Transferencia registrada',
      documentNumbers: [out.documentNumber, inn.documentNumber],
    };
  }

  async updateStockLevelThresholds(
    companyId: string,
    body: UpdateStockLevelThresholdsDto,
  ) {
    const storage = await this.dataSource.getRepository(Storage).findOne({
      where: { id: body.storageId },
      select: ['id', 'companyId'],
    });
    if (!storage || storage.companyId !== companyId) {
      throw new ForbiddenException('Almacén no válido para la empresa activa');
    }
    const variant = await this.dataSource.getRepository(ProductVariant).findOne({
      where: { id: body.productVariantId },
      select: ['id', 'companyId'],
    });
    if (!variant || variant.companyId !== companyId) {
      throw new ForbiddenException('Variante no válida para la empresa activa');
    }
    let level = await this.dataSource.getRepository(StockLevel).findOne({
      where: {
        productVariantId: body.productVariantId,
        storageId: body.storageId,
      },
    });
    if (!level) {
      level = this.dataSource.getRepository(StockLevel).create({
        companyId,
        productVariantId: body.productVariantId,
        storageId: body.storageId,
        physicalStock: 0,
        committedStock: 0,
        availableStock: 0,
        incomingStock: 0,
      });
    }
    if (body.minimumStock !== undefined) {
      level.minimumStock = body.minimumStock;
    }
    if (body.maximumStock !== undefined) {
      level.maximumStock = body.maximumStock;
    }
    if (body.reorderPoint !== undefined) {
      level.reorderPoint = body.reorderPoint;
    }
    await this.dataSource.getRepository(StockLevel).save(level);
    return { ok: true, id: level.id };
  }

  /**
   * Salidas alineadas con el payload WebSocket `stock:updated` para hidratar alertas al cargar la app.
   */
  async getThresholdAlerts(
    companyId: string,
    storageId?: string | null,
  ): Promise<StockUpdatedPayload[]> {
    const qb = this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .innerJoinAndSelect('sl.variant', 'variant')
      .where('sl.companyId = :cid', { cid: companyId });
    if (storageId) {
      qb.andWhere('sl.storageId = :sid', { sid: storageId });
    }
    const levels = await qb.getMany();
    const out: StockUpdatedPayload[] = [];
    for (const sl of levels) {
      if (!sl.variant) {
        continue;
      }
      const payload = buildStockUpdatedPayload(
        companyId,
        sl.variant,
        sl,
        sl.lastTransactionId ?? null,
      );
      if (payload.alerts.length > 0) {
        out.push(payload);
      }
    }
    return out;
  }
}
