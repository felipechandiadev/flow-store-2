import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import {
  ProductVariantsRepositoryPort,
  PRODUCT_VARIANTS_REPOSITORY,
} from './ports/product-variants.repository.port';
import {
  PRICE_LIST_ITEMS_REPOSITORY,
  PriceListItemsRepositoryPort,
} from '@modules/price-list-items/application/ports/price-list-items.repository.port';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { AttributesService } from '@modules/attributes/application/attributes.service';
import { SearchPurchasingVariantsDto } from './dto/search-purchasing-variants.dto';
import { appendPmpHistory } from './helpers/pmp-history';
import {
  foldPurchasingSearchText,
  mysqlFoldLowerColumnExpr,
  PG_PURCHASING_SEARCH_TRANSLATE_FROM,
  PG_PURCHASING_SEARCH_TRANSLATE_TO,
  purchasingSearchLikePattern,
} from './helpers/purchasing-search-text-fold';

@Injectable()
export class ProductVariantsService {
  constructor(
    @Inject(PRODUCT_VARIANTS_REPOSITORY)
    private readonly variantRepository: ProductVariantsRepositoryPort,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    private readonly multimediaService: MultimediaServiceAdapter,
    private readonly attributesService: AttributesService,
    @InjectRepository(ProductVariant)
    private readonly variantOrm: Repository<ProductVariant>,
  ) {}

  async findAll(params?: Record<string, any>) {
    // If adapter exposes query builder, use it; otherwise fallback to port's findAll
    const qb = (this.variantRepository as any).createQueryBuilder
      ? (this.variantRepository as any).createQueryBuilder('v')
      : null;

    if (qb) {
      qb.leftJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.deletedAt IS NULL',
      )
        .leftJoinAndSelect(
          'priceListItem.priceList',
          'priceList.deletedAt IS NULL AND priceList.isActive = true',
        )
        .leftJoinAndSelect('v.product', 'product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('v.unit', 'unit')
        .where('v.deletedAt IS NULL');
      if (params?.productId)
        qb.andWhere('v.productId = :productId', {
          productId: params.productId,
        });
    }

    const variants = qb
      ? await qb.getMany()
      : await this.variantRepository.findAll(params);

    // Group variants by product for the frontend
    const productMap = new Map<string, any>();
    const variantMediaMap = new Map<string, { primaryImageUrl: string | null; mediaAssets: Array<{ id: string; publicUrl: string; mimeType: string; kind: string }> }>();

    await Promise.all(
      variants.map(async (variant) => {
        const assets = await this.multimediaService.listByEntity(
          'product-variant',
          variant.id,
        );
        variantMediaMap.set(variant.id, {
          primaryImageUrl: assets[0]?.publicUrl ?? null,
          mediaAssets: assets.map((asset) => ({
            id: asset.id,
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType,
            kind: asset.kind,
          })),
        });
      }),
    );

    for (const variant of variants) {
      const productId = variant.productId || 'no-product';
      if (!productMap.has(productId)) {
        const product = variant.product;
        productMap.set(productId, {
          id: productId,
          name: product?.name || 'Producto sin nombre',
          brand: product?.brand || null,
          categoryId: product?.categoryId || null,
          categoryName: product?.category?.name || null,
          isActive: product?.isActive ?? true,
          isMultiVariant: false,
          variantCount: 0,
          variants: [],
        });
      }

      const productData = productMap.get(productId);
      productData.variantCount++;

      const priceListItems = (variant.priceListItems || []).map(
        (item: any) => ({
          priceListId: item.priceListId,
          priceListName: item.priceList?.name || 'Lista sin nombre',
          currency: item.priceList?.currency || 'CLP',
          netPrice: Number(item.netPrice),
          grossPrice: Number(item.grossPrice),
          taxIds: item.taxIds || [],
        }),
      );

      productData.variants.push({
        id: variant.id,
        productId: variant.productId,
        sku: variant.sku,
        barcode: variant.barcode,
        basePrice: Number(variant.basePrice),
        baseCost: Number(variant.baseCost),
        pmp: Number(variant.pmp ?? 0),
        unitId: variant.unitId,
        unitOfMeasure: variant.unit?.name || 'Unidad',
        attributeValues: variant.attributeValues || {},
        displayName: this.generateDisplayName(variant),
        trackInventory: variant.trackInventory,
        allowNegativeStock: variant.allowNegativeStock,
        isActive: variant.isActive,
        weight: variant.weight ? Number(variant.weight) : null,
        weightUnit: variant.weightUnit,
        primaryImageUrl:
          variantMediaMap.get(variant.id)?.primaryImageUrl ?? null,
        mediaAssets: variantMediaMap.get(variant.id)?.mediaAssets ?? [],
        priceListItems,
      });
    }

    return Array.from(productMap.values());
  }

  /**
   * Rejects payloads where the same price list appears more than once per variant.
   */
  private assertUniquePriceListIdsInPayload(items: unknown): void {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }
    const ids = items
      .map((item: any) =>
        typeof item?.priceListId === 'string' ? item.priceListId.trim() : '',
      )
      .filter((id: string) => id.length > 0);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException(
        'No puede repetir la misma lista de precios en más de una fila.',
      );
    }
  }

  private attributeValuesSignature(
    av: Record<string, string> | null | undefined,
  ): string | null {
    if (!av || typeof av !== 'object' || Object.keys(av).length === 0) {
      return null;
    }
    const sortedKeys = Object.keys(av).sort();
    const norm: Record<string, string> = {};
    for (const k of sortedKeys) {
      norm[k] = String((av as any)[k]).trim();
    }
    return JSON.stringify(norm);
  }

  private parseAttributeValuesRow(raw: unknown): Record<string, string> | null {
    if (raw == null) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        const p = JSON.parse(raw);
        if (typeof p === 'object' && p != null && !Array.isArray(p)) {
          return p as Record<string, string>;
        }
        return null;
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return null;
  }

  private async assertUniqueAttributeValuesAmongSiblings(
    productId: string | null | undefined,
    normalized: Record<string, string> | null,
    excludeVariantId?: string,
  ): Promise<void> {
    const sig = this.attributeValuesSignature(normalized);
    if (!sig || !productId) {
      return;
    }
    const siblings = await this.variantRepository.findAll({ productId });
    for (const s of siblings) {
      if (excludeVariantId && (s as any).id === excludeVariantId) {
        continue;
      }
      const av = this.parseAttributeValuesRow((s as any).attributeValues);
      if (this.attributeValuesSignature(av) === sig) {
        throw new BadRequestException(
          'Ya existe una variante de este producto con la misma combinación de atributos.',
        );
      }
    }
  }

  private generateDisplayName(variant: any): string {
    if (
      !variant.attributeValues ||
      Object.keys(variant.attributeValues).length === 0
    ) {
      return 'Variante estándar';
    }

    const parts = Object.entries(variant.attributeValues)
      .map(([_, value]) => `${value}`)
      .filter(Boolean);

    return parts.join(', ') || 'Variante sin nombre';
  }

  async findOne(id: string) {
    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) throw new NotFoundException('Product variant not found');
    const assets = await this.multimediaService.listByEntity(
      'product-variant',
      v.id,
    );
    (v as any).primaryImageUrl = assets[0]?.publicUrl ?? null;
    (v as any).mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));
    return v;
  }

  async create(data: any) {
    const sanitizedData = { ...data };
    const multimediaAssetIds = Array.isArray(sanitizedData.multimediaAssetIds)
      ? [...sanitizedData.multimediaAssetIds]
      : undefined;
    delete sanitizedData.multimediaAssetIds;
    delete (sanitizedData as any).pmpHistory;

    this.assertUniquePriceListIdsInPayload(sanitizedData.priceListItems);

    const normalizedAttrValues =
      await this.attributesService.validateAndNormalizeAttributeValues(
        sanitizedData.attributeValues,
      );
    await this.assertUniqueAttributeValuesAmongSiblings(
      sanitizedData.productId || null,
      normalizedAttrValues,
    );

    const initialPmp = Number(sanitizedData.pmp ?? 0) || 0;
    const variant = {
      productId: sanitizedData.productId || null,
      sku: sanitizedData.sku || '',
      barcode: sanitizedData.barcode || null,
      basePrice: sanitizedData.basePrice ?? 0,
      baseCost: sanitizedData.baseCost ?? 0,
      pmp: initialPmp,
      ...(initialPmp !== 0
        ? {
            pmpHistory: appendPmpHistory(undefined, {
              previousPmp: 0,
              newPmp: initialPmp,
              source: 'initial',
            }),
          }
        : {}),
      unitId: sanitizedData.unitId,
      weight: sanitizedData.weight ?? null,
      weightUnit: sanitizedData.weightUnit ?? 'kg',
      attributeValues: normalizedAttrValues,
      taxIds: sanitizedData.taxIds ?? null,
      trackInventory:
        typeof sanitizedData.trackInventory === 'boolean'
          ? sanitizedData.trackInventory
          : true,
      allowNegativeStock: Boolean(sanitizedData.allowNegativeStock),
      minimumStock: sanitizedData.minimumStock ?? 0,
      maximumStock: sanitizedData.maximumStock ?? 0,
      reorderPoint: sanitizedData.reorderPoint ?? 0,
      isActive:
        typeof sanitizedData.isActive === 'boolean'
          ? sanitizedData.isActive
          : true,
    } as any;

    try {
      const saved = await this.variantRepository.save(variant);

      if (
        sanitizedData.priceListItems &&
        Array.isArray(sanitizedData.priceListItems) &&
        sanitizedData.priceListItems.length > 0
      ) {
        const priceListItems = sanitizedData.priceListItems.map(
          (item: any) =>
            ({
              priceListId: item.priceListId,
              productId: sanitizedData.productId || null,
              productVariantId: saved.id as any,
              netPrice: item.netPrice ?? 0,
              grossPrice: item.grossPrice ?? 0,
              taxIds: item.taxIds ?? null,
            }) as any,
        );

        await Promise.all(
          priceListItems.map((it: any) =>
            this.priceListItemRepository.save(it),
          ),
        );
      }

      await this.syncMediaLinks(saved.id, multimediaAssetIds);
      const enriched = await this.findOne(saved.id);

      return { success: true, variant: enriched };
    } catch (err) {
      return {
        success: false,
        error: err?.message || 'Error creating variant',
      };
    }
  }

  async update(id: string, data: any) {
    const sanitizedData = { ...data };
    const multimediaAssetIds = Array.isArray(sanitizedData.multimediaAssetIds)
      ? [...sanitizedData.multimediaAssetIds]
      : undefined;
    delete sanitizedData.multimediaAssetIds;
    delete (sanitizedData as any).pmpHistory;

    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) throw new NotFoundException('Product variant not found');

    this.assertUniquePriceListIdsInPayload(sanitizedData.priceListItems);

    let normalizedAttrValues: Record<string, string> | null | undefined;
    if (Object.prototype.hasOwnProperty.call(sanitizedData, 'attributeValues')) {
      normalizedAttrValues =
        await this.attributesService.validateAndNormalizeAttributeValues(
          sanitizedData.attributeValues,
        );
      delete sanitizedData.attributeValues;
    }

    const pmpProvided = Object.prototype.hasOwnProperty.call(
      sanitizedData,
      'pmp',
    );
    const prevPmp = Number((v as any).pmp ?? 0) || 0;

    Object.assign(v, sanitizedData);
    if (normalizedAttrValues !== undefined) {
      await this.assertUniqueAttributeValuesAmongSiblings(
        (v as any).productId || null,
        normalizedAttrValues,
        id,
      );
      (v as any).attributeValues = normalizedAttrValues;
    }

    if (pmpProvided) {
      const newPmp = Number((v as any).pmp ?? 0) || 0;
      (v as any).pmpHistory = appendPmpHistory((v as any).pmpHistory, {
        previousPmp: prevPmp,
        newPmp,
        source: 'manual_api',
      });
    }

    const saved = await this.variantRepository.save(v);

    if (
      sanitizedData.priceListItems &&
      Array.isArray(sanitizedData.priceListItems) &&
      sanitizedData.priceListItems.length > 0
    ) {
      await this.priceListItemRepository.deleteByVariantId(saved.id);
      const priceListItems = sanitizedData.priceListItems.map(
        (item: any) =>
          ({
            priceListId: item.priceListId,
            productId: saved.productId || null,
            productVariantId: saved.id,
            netPrice: item.netPrice ?? 0,
            grossPrice: item.grossPrice ?? 0,
            taxIds: item.taxIds ?? null,
          }) as any,
      );
      await Promise.all(
        priceListItems.map((it: any) => this.priceListItemRepository.save(it)),
      );
    }

    await this.syncMediaLinks(saved.id, multimediaAssetIds);

    const enriched = await this.findOne(saved.id);

    return { success: true, variant: enriched };
  }

  /**
   * Búsqueda paginada de variantes para recepciones / órdenes de compra (nombre, SKU, código, categoría).
   */
  async searchForPurchasing(dto: SearchPurchasingVariantsDto) {
    const page = Math.max(1, dto.page ?? 1);
    const rawSize = dto.pageSize ?? 10;
    const pageSize = Math.min(50, Math.max(1, rawSize));
    const q = dto.q?.trim();

    const qb = this.variantOrm
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('v.unit', 'unit')
      .where('v.deletedAt IS NULL')
      .andWhere('product.deletedAt IS NULL');

    if (q) {
      /**
       * Mismo criterio que el grid de productos (`get-all-products.handler`):
       * pliegue en TS + `lower(translate(col))` (Postgres) o `REPLACE` (MySQL) para tildes comunes.
       */
      const likeParam = purchasingSearchLikePattern(foldPurchasingSearchText(q));
      const dbType = this.variantOrm.manager.connection.options.type as string;
      if (dbType === 'postgres') {
        const ff = PG_PURCHASING_SEARCH_TRANSLATE_FROM;
        const ft = PG_PURCHASING_SEARCH_TRANSLATE_TO;
        qb.andWhere(
          `(lower(translate(product.name, :ff, :ft)) LIKE :q
            OR (product.brand IS NOT NULL AND lower(translate(product.brand, :ff, :ft)) LIKE :q)
            OR lower(translate(v.sku, :ff, :ft)) LIKE :q
            OR (v.barcode IS NOT NULL AND lower(translate(v.barcode, :ff, :ft)) LIKE :q)
            OR (category.name IS NOT NULL AND lower(translate(category.name, :ff, :ft)) LIKE :q))`,
          { q: likeParam, ff, ft },
        );
      } else {
        const pName = mysqlFoldLowerColumnExpr('product.name');
        const pBrand = mysqlFoldLowerColumnExpr('product.brand');
        const pSku = mysqlFoldLowerColumnExpr('v.sku');
        const pBarcode = mysqlFoldLowerColumnExpr('v.barcode');
        const pCat = mysqlFoldLowerColumnExpr('category.name');
        qb.andWhere(
          `(${pName} LIKE :q
            OR (product.brand IS NOT NULL AND ${pBrand} LIKE :q)
            OR ${pSku} LIKE :q
            OR (v.barcode IS NOT NULL AND ${pBarcode} LIKE :q)
            OR (category.name IS NOT NULL AND ${pCat} LIKE :q))`,
          { q: likeParam },
        );
      }
    }

    qb.orderBy('product.name', 'ASC').addOrderBy('v.sku', 'ASC');
    qb.skip((page - 1) * pageSize).take(pageSize);
    const [variants, total] = await qb.getManyAndCount();

    const items = variants.map((v) => ({
      id: v.id,
      productId: v.productId ?? '',
      productName: v.product?.name ?? '',
      categoryName: v.product?.category?.name ?? null,
      sku: v.sku,
      barcode: v.barcode ?? null,
      pmp: Number(v.pmp) || 0,
      attributeValues:
        v.attributeValues && typeof v.attributeValues === 'object' && !Array.isArray(v.attributeValues)
          ? (v.attributeValues as Record<string, string>)
          : {},
      unitLabel: v.unit?.symbol || v.unit?.name || null,
      defaultTaxIds: Array.isArray(v.taxIds) ? v.taxIds.map((x) => String(x)) : [],
    }));

    return { items, page, pageSize, total };
  }

  async remove(id: string) {
    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) return { success: false, error: 'Not found' };

    if (typeof (this.variantRepository as any).softRemove === 'function') {
      await (this.variantRepository as any).softRemove(v);
    } else {
      v.deletedAt = new Date();
      await this.variantRepository.save(v);
    }

    return { success: true };
  }

  private async syncMediaLinks(
    variantId: string,
    multimediaAssetIds?: string[],
  ): Promise<void> {
    if (!Array.isArray(multimediaAssetIds)) {
      return;
    }

    const existingAssets = await this.multimediaService.listByEntity(
      'product-variant',
      variantId,
    );

    await Promise.all(
      existingAssets.map((asset) =>
        this.multimediaService.unlink({
          assetId: asset.id,
          entityType: 'product-variant',
          entityId: variantId,
        }),
      ),
    );

    await Promise.all(
      multimediaAssetIds.map((assetId, index) =>
        this.multimediaService.link({
          assetId,
          entityType: 'product-variant',
          entityId: variantId,
          usageType: 'primary-image',
          sortOrder: index,
          isPrimary: index === 0,
        }),
      ),
    );
  }
}
