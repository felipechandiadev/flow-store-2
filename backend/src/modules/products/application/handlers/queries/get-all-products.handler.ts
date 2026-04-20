import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetAllProductsQuery } from '../../queries/get-all-products.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductOrmEntity } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { Product } from '../../../domain/product.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

interface ProductsResponse {
  items: Product[];
  total: number;
  limit: number;
  offset: number;
}

@QueryHandler(GetAllProductsQuery)
export class GetAllProductsQueryHandler implements IQueryHandler<
  GetAllProductsQuery,
  ProductsResponse
> {
  private readonly logger = new Logger(GetAllProductsQueryHandler.name);

  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly productRepository: Repository<ProductOrmEntity>,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async execute(query: GetAllProductsQuery): Promise<ProductsResponse> {
    this.logger.debug(
      `Fetching products with limit=${query.limit}, offset=${query.offset}, search=${query.search}`,
    );

    const qb = this.productRepository
      .createQueryBuilder('product')
      .where('product.deletedAt IS NULL');

    if (query.search && query.search.trim().length > 0) {
      const q = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(product.name) LIKE :q OR LOWER(product.brand) LIKE :q OR LOWER(product.description) LIKE :q)',
        { q },
      );
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy('product.name', 'ASC')
      .limit(query.limit)
      .offset(query.offset)
      .getMany();

    // Convert ORM entities to domain entities
    const domainItems = await Promise.all(
      items.map(async (e) => {
        const assets = await this.multimediaService.listByEntity('product', e.id);

        return new Product({
          id: e.id,
          name: e.name,
          categoryId: e.categoryId,
          brand: e.brand,
          description: e.description,
          isActive: e.isActive,
          productType: e.productType,
          taxIds: e.taxIds,
          primaryImageUrl: assets[0]?.publicUrl ?? null,
          mediaAssets: assets.map((asset) => ({
            id: asset.id,
            publicUrl: asset.publicUrl,
            mimeType: asset.mimeType,
            kind: asset.kind,
          })),
          resultCenterId: e.resultCenterId ?? null,
          baseUnitId: e.baseUnitId,
          metadata: e.metadata,
          changeHistory: e.changeHistory,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          deletedAt: e.deletedAt,
        });
      }),
    );

    return {
      items: domainItems,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }
}
