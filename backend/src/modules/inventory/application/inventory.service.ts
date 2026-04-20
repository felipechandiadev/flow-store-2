import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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
  }) {
    const qb = this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage');

    if (params?.storageId) {
      qb.andWhere('sl.storageId = :storageId', { storageId: params.storageId });
    }
    if (params?.branchId) {
      qb.andWhere('storage.branchId = :branchId', {
        branchId: params.branchId,
      });
    }
    if (params?.search) {
      const s = `%${params.search}%`;
      qb.andWhere('(product.name LIKE :s OR variant.sku LIKE :s)', { s });
    }

    const entries = await qb.getMany();

    // group by variant id
    const grouped: Record<string, any> = {};
    for (const sl of entries) {
      const variant: any = sl.variant;
      const product: any = variant?.product;
      const vid = variant?.id || 'unknown';
      if (!grouped[vid]) {
        grouped[vid] = {
          productId: product?.id || null,
          variantId: variant?.id || null,
          productName: product?.name || '',
          sku: variant?.sku || '',
          unitOfMeasure: variant?.unit?.name || '',
          attributeValues: variant?.attributeValues || {},
          totalStock: 0,
          availableStock: 0,
          inventoryValueCost: 0,
          // new property: current PMP (Precio Medio Ponderado)
          pmp: Number(variant?.pmp || 0),
          storageBreakdown: [] as any[],
          movements: [] as any[],
          primaryStorageName: '',
          primaryStorageQuantity: 0,
          isBelowMinimum: false,
        };
      }
      const row = grouped[vid];
      const qty = Number(sl.physicalStock || 0);
      row.storageBreakdown.push({
        storageId: sl.storageId,
        storageName: sl.storage?.name || '',
        branchName: sl.storage?.branch?.name || null,
        quantity: qty,
      });
      row.totalStock += qty;
      row.availableStock += Number(sl.availableStock || 0);
      row.inventoryValueCost += qty * Number(variant?.baseCost || 0);
      // no change to PMP here; pmp already stored on row
      if (!row.primaryStorageName) {
        row.primaryStorageName = sl.storage?.name || '';
        row.primaryStorageQuantity = qty;
      }
      if (variant && qty < (variant.minimumStock || 0)) {
        row.isBelowMinimum = true;
      }
    }

    const rows = Object.values(grouped);
    // compute PMP value column (stock * pmp) for each row
    for (const r of rows) {
      r.pmpValue = Number(((r.totalStock || 0) * (r.pmp || 0)).toFixed(2));
    }
    const total = rows.length;

    // fetch recent movements per variant (limit 5 each)
    const transactionLineRepo =
      this.dataSource.getRepository('TransactionLine');
    const transactionRepo = this.dataSource.getRepository('Transaction');
    for (const row of rows) {
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
      // compute direction based on type
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

    return { rows, total };
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

    // determine branchId from the provided storage; similar logic to
    // transfer() but simplified since only one storage is involved.
    let branchId: string | undefined;
    const raw = await this.dataSource
      .getRepository(StockLevel)
      .createQueryBuilder('sl')
      .leftJoin('sl.storage', 's')
      .where('sl.storageId = :sid', { sid: storageId })
      .select('s.branchId', 'branchId')
      .getRawOne();
    branchId = raw?.branchId || undefined;
    if (branchId === '') branchId = undefined;

    // fallback to any existing branch if lookup failed
    if (!branchId) {
      const anyBranch = await this.dataSource.getRepository(Branch).findOne({});
      branchId = anyBranch?.id;
    }

    // pick a default user for internal adjustments (first active user)
    const fallbackUser = await this.userRepository.findOne({
      where: { deletedAt: null as any },
    });
    const userId = fallbackUser?.id || '';

    const txDto = new CreateTransactionDto();
    txDto.transactionType =
      diff >= 0
        ? TransactionType.ADJUSTMENT_IN
        : TransactionType.ADJUSTMENT_OUT;
    txDto.branchId = branchId || '';
    txDto.userId = userId;
    txDto.storageId = storageId;
    txDto.subtotal = Math.abs(diff);
    txDto.total = Math.abs(diff);
    // internal inventory movements are not actual payments
    txDto.paymentMethod = PaymentMethod.INTERNAL_CREDIT;
    txDto.amountPaid = Math.abs(diff);
    txDto.notes = note || undefined;
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

    // decrement source
    const src = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId: sourceStorageId },
    });
    if (!src) {
      throw new NotFoundException('Stock no encontrado en almacén origen');
    }
    src.physicalStock = Number(src.physicalStock || 0) - quantity;
    await this.dataSource.getRepository(StockLevel).save(src as any);

    // increment target
    let tgt = await this.dataSource.getRepository(StockLevel).findOne({
      where: { productVariantId: variantId, storageId: targetStorageId },
    });
    if (!tgt) {
      tgt = this.dataSource.getRepository(StockLevel).create({
        productVariantId: variantId,
        storageId: targetStorageId,
        physicalStock: quantity,
      } as any as StockLevel);
    } else {
      tgt.physicalStock = Number(tgt.physicalStock || 0) + quantity;
    }
    await this.dataSource.getRepository(StockLevel).save(tgt as any);

    // create transactions
    // determine branchId from source storage (must be non-empty)
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
}
