import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SearchProductsQuery } from '../../queries/search-products.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@modules/products/domain/product.entity';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';

export interface SearchProductsResult {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  isActive?: boolean;
  variants: Array<{
    id: string;
    productId?: string;
    sku?: string;
    unitOfMeasure?: string;
    priceListItems: Array<{
      priceListId: string;
      priceListName: string;
      currency: string;
      netPrice: number;
      grossPrice: number;
      taxIds?: string[];
    }>;
  }>;
  variantCount: number;
}

@QueryHandler(SearchProductsQuery)
export class SearchProductsQueryHandler implements IQueryHandler<
  SearchProductsQuery,
  SearchProductsResult[]
> {
  private readonly logger = new Logger(SearchProductsQueryHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async execute(query: SearchProductsQuery): Promise<SearchProductsResult[]> {
    this.logger.debug(
      `Searching products with query="${query.query}", page=${query.page}, pageSize=${query.pageSize}`,
    );

    // Basic search implementation: return matching products with their variants
    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .where('p.deletedAt IS NULL');

    if (query.query) {
      qb.andWhere('(p.name LIKE :q OR p.brand LIKE :q)', {
        q: `%${query.query}%`,
      });
    }

    const products = await qb.getMany();

    if (!products || products.length === 0) return [];

    // Load variants for the found products and attach price list items
    const productIds = products.map((p) => p.id);
    const variants = await this.variantRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect(
        'v.priceListItems',
        'priceListItem',
        'priceListItem.deletedAt IS NULL',
      )
      .leftJoinAndSelect(
        'priceListItem.priceList',
        'priceList',
        'priceList.deletedAt IS NULL AND priceList.isActive = true',
      )
      .leftJoinAndSelect('v.unit', 'unit')
      .where('v.deletedAt IS NULL')
      .andWhere('v.productId IN (:...productIds)', { productIds })
      .getMany();

    const variantsByProduct: Record<string, any[]> = {};
    for (const v of variants) {
      if (!variantsByProduct[v.productId || ''])
        variantsByProduct[v.productId || ''] = [];
      const priceListItems = (v.priceListItems || []).map((item: any) => ({
        priceListId: item.priceListId,
        priceListName: item.priceList?.name || 'Lista sin nombre',
        currency: item.priceList?.currency || 'CLP',
        netPrice: Number(item.netPrice),
        grossPrice: Number(item.grossPrice),
        taxIds: item.taxIds || [],
      }));
      variantsByProduct[v.productId || ''].push({
        ...v,
        unitOfMeasure: v.unit?.name || 'Unidad',
        priceListItems,
      });
    }

    const enriched = products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      description: p.description,
      categoryId: p.categoryId ?? null,
      categoryName: p.category?.name ?? null,
      isActive: p.isActive,
      variants: variantsByProduct[p.id] ?? [],
      variantCount: (variantsByProduct[p.id] ?? []).length,
    }));

    return enriched;
  }
}
