import { Injectable, NotFoundException, Inject } from '@nestjs/common';
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

@Injectable()
export class ProductVariantsService {
  constructor(
    @Inject(PRODUCT_VARIANTS_REPOSITORY)
    private readonly variantRepository: ProductVariantsRepositoryPort,
    @Inject(PRICE_LIST_ITEMS_REPOSITORY)
    private readonly priceListItemRepository: PriceListItemsRepositoryPort,
    private readonly multimediaService: MultimediaServiceAdapter,
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

    const variant = {
      productId: sanitizedData.productId || null,
      sku: sanitizedData.sku || '',
      barcode: sanitizedData.barcode || null,
      basePrice: sanitizedData.basePrice ?? 0,
      baseCost: sanitizedData.baseCost ?? 0,
      pmp: sanitizedData.pmp ?? 0,
      unitId: sanitizedData.unitId,
      weight: sanitizedData.weight ?? null,
      weightUnit: sanitizedData.weightUnit ?? 'kg',
      attributeValues: sanitizedData.attributeValues ?? null,
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

    const v =
      typeof (this.variantRepository as any).findById === 'function'
        ? await (this.variantRepository as any).findById(id)
        : null;
    if (!v) throw new NotFoundException('Product variant not found');

    Object.assign(v, sanitizedData);
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
