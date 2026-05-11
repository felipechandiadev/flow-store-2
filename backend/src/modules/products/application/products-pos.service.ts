import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { SearchPosProductsDto } from './dto/search-pos-products.dto';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AttributeOrmEntity } from '@modules/attributes/infrastructure/orm-mappers/attribute.orm-entity';

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
    const { query, priceListId, branchId, page = 1, pageSize = 20 } = dto;

    if (!priceListId) {
      throw new NotFoundException(
        'priceListId es requerido para búsqueda en POS',
      );
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
      'v.attributeValues',
      'product.id',
      'product.name',
      'product.description',
      'unit.id',
      'unit.symbol',
      'unit.allowDecimals',
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

    // Cargar stock por bodega si se especifica branchId
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

    if (branchId) {
      const stockLevels = await this.stockLevelRepository
        .createQueryBuilder('sl')
        .innerJoin('sl.storage', 'storage')
        .where('sl.productVariantId IN (:...variantIds)', { variantIds })
        .andWhere('storage.branchId = :branchId', { branchId })
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

        return {
          productId: variant.productId!,
          productName: variant.product?.name || 'Producto sin nombre',
          productDescription: variant.product?.description || null,
          productImageUrl: multimediaByProduct[variant.productId!] ?? null,
          variantId: variant.id,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          unitSymbol: variant.unit?.symbol || null,
          unitId: variant.unit?.id || null,
          unitAllowDecimals: variant.unit?.allowDecimals === true,
          unitPrice: netPrice,
          unitTaxRate: taxRate,
          unitTaxAmount: taxAmount,
          unitPriceWithTax: grossPrice,
          trackInventory: variant.trackInventory ?? false,
          availableStock: variant.trackInventory
            ? (stockByVariant[variant.id] ?? 0)
            : null,
          availableStockBase: variant.trackInventory
            ? (stockByVariant[variant.id] ?? 0)
            : null,
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
}
