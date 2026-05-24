import { Injectable, NotFoundException, Inject, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { SearchPosProductsDto } from './dto/search-pos-products.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AttributeOrmEntity } from '@modules/attributes/infrastructure/orm-mappers/attribute.orm-entity';
import { posDisplayStockInSaleUnits } from '@modules/product-variants/application/variant-count-bridge.util';

export type PosProductSearchResult = {
  productId: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  variantId: string;
  sku: string | null;
  barcode: string | null;
  unitSymbol: string | null;
  unitId: string | null;
  unitAllowDecimals: boolean;
  unitPrice: number;
  unitTaxRate: number;
  unitTaxAmount: number;
  unitPriceWithTax: number;
  trackInventory: boolean;
  availableStock: number | null;
  availableStockBase: number | null;
  attributes: Array<{
    attributeId: string;
    attributeName: string;
    attributeValue: string;
  }>;
  metadata: Record<string, unknown> | null;
};

@Injectable()
export class ProductsPosService {
  constructor(
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    @InjectRepository(StockLevel)
    private readonly stockLevelRepository: Repository<StockLevel>,
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Búsqueda optimizada de productos para POS
   * - Filtra por lista de precios específica
   * - Retorna solo productos con precio en esa lista
   * - Incluye stock disponible por bodega (branch)
   */
  async searchForPos(dto: SearchPosProductsDto) {
    const { query, priceListId, branchId, page = 1, pageSize = 20, pointOfSaleId } =
      dto;

    if (!priceListId) {
      throw new NotFoundException(
        'priceListId es requerido para búsqueda en POS',
      );
    }

    let resolvedBranchId = branchId;
    let storageIdsForStock: string[] | null = null;
    if (pointOfSaleId) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: pointOfSaleId, deletedAt: IsNull() },
      });
      if (!pos) {
        throw new NotFoundException(`Punto de venta ${pointOfSaleId} no encontrado`);
      }
      if (branchId && pos.branchId && pos.branchId !== branchId) {
        throw new BadRequestException(
          'branchId no coincide con la sucursal del punto de venta indicado',
        );
      }
      resolvedBranchId = pos.branchId ?? branchId;
      if (pos.storageId) {
        storageIdsForStock = [pos.storageId];
      }
    }

    // Construir query base
    const qb = this.variantRepository
      .createQueryBuilder('v')
      .innerJoin('v.product', 'product')
      .innerJoin(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.priceListId = :priceListId AND priceListItem.deletedAt IS NULL',
        { priceListId },
      )
      .leftJoin('v.unit', 'unit')
      .leftJoin('v.saleUnit', 'saleUnit')
      .leftJoin('v.stockBaseUnit', 'stockBaseUnit')
      .where('v.deletedAt IS NULL')
      .andWhere('v.isActive = :isActive', { isActive: true })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.isActive = :isActive', { isActive: true });

    // Filtrar por búsqueda de texto (nombre, SKU, barcode)
    if (query && query.trim()) {
      // Búsqueda case-insensitive y accent-insensitive (sin depender de extensiones DB).
      // Nota: cubre diacríticos latinos comunes usados en ES/CL. Para collation/unaccent
      // completa podría usarse una extensión (p. ej. Postgres `unaccent`), pero esto
      // entrega el comportamiento esperado en la UI del POS.
      const accentFrom = 'ÁÀÂÄÃáàâäãÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñ';
      const accentTo = 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNn';
      qb.andWhere(
        `(
          LOWER(TRANSLATE(product.name, '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
          OR LOWER(TRANSLATE(COALESCE(v.sku, ''), '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
          OR LOWER(TRANSLATE(COALESCE(v.barcode, ''), '${accentFrom}', '${accentTo}')) LIKE LOWER(TRANSLATE(:q, '${accentFrom}', '${accentTo}'))
        )`,
        { q: `%${query.trim()}%` },
      );
    }

    // Seleccionar campos necesarios
    qb.select([
      'v.id',
      'v.productId',
      'v.sku',
      'v.barcode',
      'v.trackInventory',
      'v.stockBaseUnitId',
      'v.saleUnitId',
      'v.stockBaseQtyPerCountSaleUnit',
      'v.attributeValues',
      'product.id',
      'product.companyId',
      'product.name',
      'product.description',
      'unit.id',
      'unit.symbol',
      'unit.allowDecimals',
      'saleUnit.id',
      'saleUnit.symbol',
      'saleUnit.dimension',
      'saleUnit.allowDecimals',
      'stockBaseUnit.id',
      'stockBaseUnit.symbol',
      'stockBaseUnit.dimension',
      'priceListItem.id',
      'priceListItem.netPrice',
      'priceListItem.grossPrice',
      'priceListItem.taxIds',
    ]);

    // Paginación
    const skip = (page - 1) * pageSize;
    qb.skip(skip).take(pageSize);

    // Ejecutar query
    const [variants, total] = await qb.getManyAndCount();

    if (!variants || variants.length === 0) {
      return {
        query: query || '',
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        products: [],
      };
    }

    // Cargar stock: almacén del POS (sala de venta) o suma por sucursal si solo viene branchId
    const variantIds = variants.map((v) => v.id);
    const productIds = Array.from(
      new Set(variants.map((variant) => variant.productId).filter(Boolean)),
    ) as string[];
    const attributeIds = Array.from(
      new Set(
        variants.flatMap((variant) =>
          variant?.attributeValues && typeof variant.attributeValues === 'object'
            ? Object.keys(variant.attributeValues as Record<string, string>)
            : [],
        ),
      ),
    ).filter(Boolean) as string[];
    let stockByVariant: Record<string, number> = {};
    const multimediaByProduct: Record<string, string | null> = {};
    const attributeNameById: Record<string, string> = {};

    if (storageIdsForStock && storageIdsForStock.length === 1) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('sl.storageId = :storageId', { storageId: storageIdsForStock[0] })
        .select('sl.productVariantId', 'variantId')
        .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
        .groupBy('sl.productVariantId')
        .getRawMany();

      stockByVariant = stockLevels.reduce(
        (acc, row) => {
          acc[row.variantId] = Number(row.stock || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
    } else if (resolvedBranchId) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .innerJoin('sl.storage', 'storage')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('storage.branchId = :branchId', { branchId: resolvedBranchId })
        .andWhere('storage.deletedAt IS NULL')
        .select('sl.productVariantId', 'variantId')
        .addSelect('COALESCE(SUM(sl.availableStock), 0)', 'stock')
        .groupBy('sl.productVariantId')
        .getRawMany();

      stockByVariant = stockLevels.reduce(
        (acc, row) => {
          acc[row.variantId] = Number(row.stock || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    await Promise.all(
      productIds.map(async (productId) => {
        const assets = await this.multimediaService.listByEntity('product', productId);
        multimediaByProduct[productId] = assets[0]?.publicUrl ?? null;
      }),
    );

    if (attributeIds.length > 0) {
      try {
        const rows = await this.dataSource
          .getRepository(AttributeOrmEntity)
          .createQueryBuilder('a')
          .where('a.id IN (:...ids)', { ids: attributeIds })
          .andWhere('a.deletedAt IS NULL')
          .select(['a.id', 'a.name'])
          .getMany();
        for (const a of rows) {
          attributeNameById[a.id] = a.name;
        }
      } catch {
        // ignore, fallback to empty names below
      }
    }

    const companyId = variants.find((v) => v.product?.companyId)?.product?.companyId;
    let unitsById: Map<string, Unit> | undefined;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    // Mapear resultados al formato esperado por el POS
    const products: PosProductSearchResult[] = variants
      .filter((variant) => variant.productId) // Filtrar variantes sin productId
      .map((variant) => {
        const priceItem = variant.priceListItems?.[0];
        const netPrice = priceItem ? Number(priceItem.netPrice) : 0;
        let grossPrice = priceItem ? Number(priceItem.grossPrice) : 0;

        // HOTFIX: Detect and correct obviously invalid prices
        // If grossPrice is unreasonably higher than netPrice (e.g., 20x), assume it was multiplied by a factor
        if (netPrice > 0 && grossPrice > 0) {
          const ratio = grossPrice / netPrice;
          // If ratio > 5, assume grossPrice was mis-calculated and should not exceed 1.5x netPrice (150% with heavy tax)
          if (ratio > 5) {
            console.warn(
              `⚠️ [ProductsPosSvc] Price correction needed for variant ${variant.sku}: ` +
                `netPrice=${netPrice}, grossPrice=${grossPrice} (ratio=${ratio.toFixed(2)}). ` +
                `Assuming grossPrice was incorrectly multiplied.`,
            );
            // Divide grossPrice by 10 if it looks like it was multiplied by 10 or more
            if (ratio >= 19) {
              // Likely multiplied by 20
              grossPrice = grossPrice / 20;
            } else if (ratio >= 10) {
              // Likely multiplied by 10
              grossPrice = grossPrice / 10;
            }
            console.log(
              `✅ [ProductsPosSvc] Corrected grossPrice to ${grossPrice}`,
            );
          }
        }

        const taxAmount = grossPrice - netPrice;
        // Calculate and clamp taxRate to valid range (0-100)
        const calculatedTaxRate =
          netPrice > 0 ? (taxAmount / netPrice) * 100 : 0;
        const taxRate = Math.max(0, Math.min(100, calculatedTaxRate));

        // Atributos: `product_variants.attributeValues` es JSON objeto `{ [attributeId]: value }`.
        // El POS necesita una lista con nombre+valor para mostrar "Producto · Talla · Color".
        const attributes: Array<{
          attributeId: string;
          attributeName: string;
          attributeValue: string;
        }> = [];
        if (variant.attributeValues && typeof variant.attributeValues === 'object') {
          const dict = variant.attributeValues as Record<string, unknown>;
          for (const [attributeId, rawValue] of Object.entries(dict)) {
            const attributeValue = rawValue != null ? String(rawValue).trim() : '';
            if (!attributeId || !attributeValue) continue;
            attributes.push({
              attributeId,
              attributeName: attributeNameById[attributeId] ?? '',
              attributeValue,
            });
          }
        }

        const track = variant.trackInventory ?? false;
        const stockBaseQty = stockByVariant[variant.id] ?? 0;
        const availableStockBase = track ? stockBaseQty : null;
        const availableStock = track
          ? posDisplayStockInSaleUnits({
              physicalStockInBase: stockBaseQty,
              stockBaseUnitId: variant.stockBaseUnitId,
              saleUnitId: variant.saleUnitId,
              stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
              saleDimension: (variant as any).saleUnit?.dimension ?? null,
              stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
              unitsById,
            })
          : null;

        return {
          productId: variant.productId!,
          productName: variant.product?.name || 'Producto sin nombre',
          productDescription: variant.product?.description || null,
          productImageUrl: multimediaByProduct[variant.productId!] ?? null,
          variantId: variant.id,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          unitSymbol: (variant as any).saleUnit?.symbol ?? null,
          unitId: (variant as any).saleUnitId ?? null,
          unitAllowDecimals: (variant as any).saleUnit?.allowDecimals === true,
          unitPrice: netPrice,
          unitTaxRate: taxRate,
          unitTaxAmount: taxAmount,
          unitPriceWithTax: grossPrice,
          trackInventory: track,
          availableStock,
          availableStockBase,
          attributes,
          metadata: null,
        };
      });

    return {
      query: query || '',
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page < Math.ceil(total / pageSize),
        hasPreviousPage: page > 1,
      },
      products,
    };
  }

  /**
   * Stock disponible de una variante en la sala de venta del POS (`pointOfSaleId`)
   * o en un `storageId` explícito.
   */
  async getVariantStockForPos(args: {
    variantId: string;
    pointOfSaleId?: string;
    storageId?: string;
  }) {
    const variantId = args.variantId?.trim();
    if (!variantId) {
      throw new BadRequestException('variantId es requerido');
    }
    let storageId = args.storageId?.trim() || undefined;
    let storageName: string | null = null;
    if (!storageId && args.pointOfSaleId?.trim()) {
      const pos = await this.dataSource.getRepository(PointOfSale).findOne({
        where: { id: args.pointOfSaleId.trim(), deletedAt: IsNull() },
        relations: { storage: true },
      });
      if (!pos) {
        throw new NotFoundException('Punto de venta no encontrado');
      }
      storageId = pos.storageId ?? undefined;
      storageName = pos.storage?.name ?? null;
    }
    if (!storageId) {
      throw new BadRequestException(
        'Indique storageId o un pointOfSaleId con sala de venta (storage) configurada',
      );
    }
    if (!storageName) {
      const st = await this.dataSource.getRepository(Storage).findOne({
        where: { id: storageId, deletedAt: IsNull() },
        select: ['id', 'name'],
      });
      storageName = st?.name ?? null;
    }

    const variant = await this.variantRepository.findOne({
      where: { id: variantId, deletedAt: IsNull() },
      relations: ['product', 'unit', 'saleUnit', 'stockBaseUnit'],
    });
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    const sl = await this.stockLevelRepository.findOne({
      where: { productVariantId: variantId, storageId },
    });
    const stockBaseQty = Number(sl?.availableStock ?? 0);
    const track = variant.trackInventory ?? false;
    const availableStockBase = track ? stockBaseQty : null;
    let unitsById: Map<string, Unit> | undefined;
    const companyId = variant.product?.companyId;
    if (companyId) {
      const unitRows = await this.unitRepository.find({
        where: { companyId, deletedAt: IsNull() },
      });
      unitsById = new Map(unitRows.map((u) => [u.id, u]));
    }

    const availableStock = track
      ? posDisplayStockInSaleUnits({
          physicalStockInBase: stockBaseQty,
          stockBaseUnitId: variant.stockBaseUnitId,
          saleUnitId: variant.saleUnitId,
          stockBaseDimension: (variant as any).stockBaseUnit?.dimension ?? null,
          saleDimension: (variant as any).saleUnit?.dimension ?? null,
          stockBaseQtyPerCountSaleUnit: (variant as any).stockBaseQtyPerCountSaleUnit,
          unitsById,
        })
      : null;

    return {
      success: true as const,
      variantId: variant.id,
      sku: variant.sku ?? null,
      storageId,
      storageName,
      trackInventory: track,
      availableStock,
      availableStockBase,
    };
  }
}
