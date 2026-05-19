import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockLevelsRepositoryPort } from '@modules/inventory/application/ports/stock-levels.repository.port';
import {
  StockLevelDto,
  StockLevelWithDetailsDto,
  SearchStockFiltersDto,
  StockMovementDto,
  StockFiltersDto,
} from '@modules/inventory/application/dto/stock-level.dto';
import { StockLevelOrmEntity } from '@modules/stock-levels/infrastructure/orm-mappers/stock-level.orm-entity';
import { StoragesService } from '@modules/storages/application/storages.service';

@Injectable()
export class StockLevelsRepository implements StockLevelsRepositoryPort {
  constructor(
    @InjectRepository(StockLevelOrmEntity)
    private readonly stockLevelRepo: Repository<StockLevelOrmEntity>,
    private readonly dataSource: DataSource,
    private readonly storagesService: StoragesService,
  ) {}

  async findById(id: string): Promise<StockLevelDto | null> {
    const entity = await this.stockLevelRepo.findOne({
      where: { id },
      relations: ['variant', 'storage'],
    });
    return entity ? this.toDto(entity) : null;
  }

  async findByVariantAndStorage(
    variantId: string,
    storageId: string,
  ): Promise<StockLevelDto | null> {
    const entity = await this.stockLevelRepo.findOne({
      where: { productVariantId: variantId, storageId },
      relations: ['variant', 'storage'],
    });
    return entity ? this.toDto(entity) : null;
  }

  async findByVariantId(variantId: string): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.find({
      where: { productVariantId: variantId },
      relations: ['variant', 'storage'],
    });
    return entities.map((e) => this.toDto(e));
  }

  async findByStorageId(storageId: string): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.find({
      where: { storageId },
      relations: ['variant', 'storage'],
    });
    return entities.map((e) => this.toDto(e));
  }

  async search(
    filters: SearchStockFiltersDto,
  ): Promise<{ rows: StockLevelWithDetailsDto[]; total: number }> {
    const qb = this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .leftJoinAndSelect('storage.branch', 'branch');

    if (filters.storageId) {
      qb.andWhere('sl.storageId = :storageId', {
        storageId: filters.storageId,
      });
    }
    if (filters.branchId) {
      qb.andWhere('storage.branchId = :branchId', {
        branchId: filters.branchId,
      });
    }
    if (filters.search) {
      const s = `%${filters.search}%`;
      qb.andWhere('(product.name LIKE :s OR variant.sku LIKE :s)', { s });
    }

    // Get total before pagination
    const total = await qb.getCount();

    // Apply pagination
    if (filters.limit) {
      qb.limit(filters.limit);
    }
    if (filters.offset) {
      qb.offset(filters.offset);
    }

    const entities = await qb.getMany();

    // Group by variant ID for aggregations
    const grouped: Record<string, StockLevelWithDetailsDto> = {};

    for (const entity of entities) {
      const variant: any = entity.variant;
      const product: any = variant?.product;
      const vid = variant?.id || 'unknown';

      if (!grouped[vid]) {
        grouped[vid] = {
          id: '',
          productVariantId: vid,
          storageId: '',
          physicalStock: 0,
          committedStock: 0,
          availableStock: 0,
          incomingStock: 0,
          pmp: null,
          lastTransactionId: null,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          variantSku: variant?.sku,
          variantName: variant?.name,
          productName: product?.name,
          storageName: '',
          branchName: '',
          unitOfMeasure: variant?.unit?.name,
          minimumStock: variant?.minimumStock,
          baseCost: variant?.baseCost,
          totalValue: 0,
          isBelowMinimum: false,
        };
      }

      const row = grouped[vid];
      const qty = Number(entity.physicalStock || 0);
      const baseCost = Number(variant?.baseCost || 0);

      row.physicalStock += qty;
      row.availableStock += Number(entity.availableStock || 0);
      const variantPmp =
        variant?.pmp != null && Number.isFinite(Number(variant.pmp))
          ? Number(variant.pmp)
          : null;
      row.pmp = variantPmp;
      row.totalValue =
        variantPmp != null ? row.physicalStock * variantPmp : null;
      row.storageName = entity.storage?.name || '';
      row.branchName = entity.storage?.branch?.name || '';

      if (qty < (variant?.minimumStock || 0)) {
        row.isBelowMinimum = true;
      }
    }

    const rows = Object.values(grouped);
    return { rows, total };
  }

  async getTotalStockByVariant(variantId: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .select('SUM(sl.physicalStock)', 'total')
      .where('sl.productVariantId = :vid', { vid: variantId })
      .getRawOne();
    return Number(result?.total || 0);
  }

  async getAvailableStockByVariant(variantId: string): Promise<number> {
    const result = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .select('SUM(sl.availableStock)', 'total')
      .where('sl.productVariantId = :vid', { vid: variantId })
      .getRawOne();
    return Number(result?.total || 0);
  }

  async getMovementHistory(
    variantId: string,
    storageId: string,
    limit: number = 5,
  ): Promise<StockMovementDto[]> {
    const movements = await this.dataSource
      .getRepository('TransactionLine')
      .createQueryBuilder('tl')
      .innerJoin('tl.transaction', 't')
      .leftJoin('t.storageEntry', 's')
      .leftJoin('t.targetStorageEntry', 'ts')
      .where('tl.productVariantId = :vid', { vid: variantId })
      .andWhere('(t.storageId = :sid OR t.targetStorageId = :sid)', {
        sid: storageId,
      })
      .orderBy('t.createdAt', 'DESC')
      .limit(limit)
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

    return movements.map((m) => ({
      transactionId: m.transactionId,
      documentNumber: m.documentNumber,
      transactionType: m.transactionType,
      createdAt: m.createdAt,
      quantity: Number(m.quantity),
      notes: m.notes,
      storageName: m.storageName || '',
      targetStorageName: m.targetStorageName || undefined,
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

  async getLowStockItems(
    minimumThreshold: number,
    storageId?: string,
  ): Promise<StockLevelWithDetailsDto[]> {
    const qb = this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .where('sl.physicalStock < :threshold', { threshold: minimumThreshold });

    if (storageId) {
      qb.andWhere('sl.storageId = :sid', { sid: storageId });
    }

    const entities = await qb.getMany();
    return entities.map((e) => this.toDto(e) as StockLevelWithDetailsDto);
  }

  async getStockByBranch(
    branchId: string,
  ): Promise<StockLevelWithDetailsDto[]> {
    const entities = await this.dataSource
      .getRepository(StockLevelOrmEntity)
      .createQueryBuilder('sl')
      .leftJoinAndSelect('sl.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.unit', 'unit')
      .leftJoinAndSelect('sl.storage', 'storage')
      .leftJoinAndSelect('storage.branch', 'branch')
      .where('storage.branchId = :bid', { bid: branchId })
      .getMany();

    return entities.map((e) => this.toDto(e) as StockLevelWithDetailsDto);
  }

  async getFilters(): Promise<StockFiltersDto> {
    const storages = await this.storagesService.getAllStorages(false);
    return {
      storages,
      branches: [],
      categories: [],
      units: [],
      attributes: [],
    };
  }

  async save(stockLevel: StockLevelDto): Promise<StockLevelDto> {
    const entity = await this.stockLevelRepo.save(stockLevel as any);
    return this.toDto(entity);
  }

  async saveMany(stockLevels: StockLevelDto[]): Promise<StockLevelDto[]> {
    const entities = await this.stockLevelRepo.save(stockLevels as any);
    return entities.map((e) => this.toDto(e));
  }

  async delete(id: string): Promise<void> {
    await this.stockLevelRepo.delete({ id });
  }

  private toDto(entity: StockLevelOrmEntity): StockLevelDto {
    return {
      id: entity.id,
      productVariantId: entity.productVariantId,
      storageId: entity.storageId,
      physicalStock: Number(entity.physicalStock),
      committedStock: Number(entity.committedStock),
      availableStock: Number(entity.availableStock),
      incomingStock: Number(entity.incomingStock),
      pmp: 0, // PMP comes from variant, not from StockLevel
      lastTransactionId: entity.lastTransactionId ?? null,
      lastUpdated: entity.lastUpdated,
      updatedAt: entity.updatedAt,
      deletedAt: null, // No soft delete on StockLevel
    };
  }
}
