import { NotFoundException } from '@nestjs/common';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';
import { ProductVariantsRepositoryPort } from '@modules/product-variants/application/ports/product-variants.repository.port';
import { PriceListItemsRepositoryPort } from '@modules/price-list-items/application/ports/price-list-items.repository.port';

describe('ProductVariantsService', () => {
  let service: ProductVariantsService;
  let variantRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findAll: jest.Mock;
  };
  let priceListItemRepository: {
    save: jest.Mock;
    findByVariantId: jest.Mock;
    deleteByVariantId: jest.Mock;
  };
  let multimediaService: {
    listByEntity: jest.Mock;
    unlink: jest.Mock;
    link: jest.Mock;
  };

  beforeEach(() => {
    variantRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };
    priceListItemRepository = {
      save: jest.fn(),
      findByVariantId: jest.fn(),
      deleteByVariantId: jest.fn(),
    };
    multimediaService = {
      listByEntity: jest.fn(),
      unlink: jest.fn(),
      link: jest.fn(),
    };

    service = new ProductVariantsService(
      variantRepository as unknown as ProductVariantsRepositoryPort,
      priceListItemRepository as unknown as PriceListItemsRepositoryPort,
      multimediaService as unknown as MultimediaServiceAdapter,
    );
  });

  it('should create variant, persist price list items, and link multimedia assets', async () => {
    variantRepository.save.mockResolvedValueOnce({ id: 'variant-1' });
    priceListItemRepository.save.mockResolvedValue({ id: 'pli-1' });
    variantRepository.findById.mockResolvedValueOnce({
      id: 'variant-1',
      productId: 'product-1',
      priceListItems: [],
    });
    multimediaService.listByEntity
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'asset-1',
          publicUrl: '/multimedia/files/asset-1',
          mimeType: 'image/png',
          kind: 'image',
        },
      ]);
    multimediaService.link.mockResolvedValue(undefined);

    const result = await service.create({
      productId: 'product-1',
      sku: 'SKU-1',
      basePrice: 100,
      unitId: 'unit-1',
      priceListItems: [
        {
          priceListId: 'price-list-1',
          netPrice: 90,
          grossPrice: 100,
        },
      ],
      multimediaAssetIds: ['asset-1'],
    });

    expect(variantRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        sku: 'SKU-1',
        basePrice: 100,
        unitId: 'unit-1',
      }),
    );
    expect(priceListItemRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        priceListId: 'price-list-1',
        productVariantId: 'variant-1',
      }),
    );
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-1',
      entityType: 'product-variant',
      entityId: 'variant-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
    expect(result).toMatchObject({
      success: true,
      variant: {
        id: 'variant-1',
        primaryImageUrl: '/multimedia/files/asset-1',
        mediaAssets: [
          {
            id: 'asset-1',
            publicUrl: '/multimedia/files/asset-1',
            mimeType: 'image/png',
            kind: 'image',
          },
        ],
      },
    });
  });

  it('should update variant and replace linked multimedia assets', async () => {
    variantRepository.findById
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-1',
      })
      .mockResolvedValueOnce({
        id: 'variant-1',
        productId: 'product-1',
        sku: 'SKU-2',
      });
    variantRepository.save.mockResolvedValueOnce({
      id: 'variant-1',
      productId: 'product-1',
      sku: 'SKU-2',
    });
    priceListItemRepository.deleteByVariantId.mockResolvedValue(undefined);
    priceListItemRepository.save.mockResolvedValue({ id: 'pli-9' });
    multimediaService.listByEntity
      .mockResolvedValueOnce([{ id: 'old-asset' }])
      .mockResolvedValueOnce([
        {
          id: 'asset-9',
          publicUrl: '/multimedia/files/asset-9',
          mimeType: 'image/jpeg',
          kind: 'image',
        },
      ]);
    multimediaService.unlink.mockResolvedValue(undefined);
    multimediaService.link.mockResolvedValue(undefined);

    const result = await service.update('variant-1', {
      sku: 'SKU-2',
      priceListItems: [
        {
          priceListId: 'price-list-9',
          netPrice: 180,
          grossPrice: 200,
        },
      ],
      multimediaAssetIds: ['asset-9'],
    });

    expect(priceListItemRepository.deleteByVariantId).toHaveBeenCalledWith('variant-1');
    expect(multimediaService.unlink).toHaveBeenCalledWith({
      assetId: 'old-asset',
      entityType: 'product-variant',
      entityId: 'variant-1',
    });
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-9',
      entityType: 'product-variant',
      entityId: 'variant-1',
      usageType: 'primary-image',
      sortOrder: 0,
      isPrimary: true,
    });
    expect(result).toMatchObject({
      success: true,
      variant: {
        id: 'variant-1',
        primaryImageUrl: '/multimedia/files/asset-9',
      },
    });
  });

  it('should throw when updating a missing variant', async () => {
    variantRepository.findById.mockResolvedValueOnce(null);

    await expect(service.update('missing', { sku: 'SKU-X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});