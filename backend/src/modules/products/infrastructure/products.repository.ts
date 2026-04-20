import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductOrmEntity } from './orm-mappers/product.orm-entity';
import { Product } from '@modules/products/domain/product.entity';
import {
  ProductsRepositoryPort,
  PRODUCTS_REPOSITORY,
} from '@modules/products/application/ports/products.repository.port';

@Injectable()
export class ProductsRepository implements ProductsRepositoryPort {
  constructor(
    @InjectRepository(ProductOrmEntity)
    private readonly repo: Repository<ProductOrmEntity>,
  ) {}

  private toDomain(e: ProductOrmEntity): Product {
    return new Product({
      id: e.id,
      categoryId: e.categoryId,
      name: e.name,
      description: e.description,
      brand: e.brand,
      productType: e.productType,
      taxIds: e.taxIds,
      isActive: e.isActive,
      resultCenterId: e.resultCenterId ?? null,
      baseUnitId: e.baseUnitId,
      metadata: e.metadata,
      changeHistory: e.changeHistory,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt,
    });
  }

  private toOrm(d: Product): ProductOrmEntity {
    const e = new ProductOrmEntity();
    e.id = d.id;
    e.categoryId = d.categoryId;
    e.name = d.name;
    e.description = d.description;
    e.brand = d.brand;
    e.productType = d.productType;
    e.taxIds = d.taxIds;
    e.isActive = d.isActive;
    e.resultCenterId = d.resultCenterId ?? null;
    e.baseUnitId = d.baseUnitId;
    e.metadata = d.metadata;
    e.changeHistory = d.changeHistory as any;
    return e;
  }

  async save(product: Product): Promise<Product> {
    const orm = this.toOrm(product);
    const saved = await this.repo.save(orm as any);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Product | null> {
    const found = await this.repo.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findAll(filter?: Record<string, any>): Promise<Product[]> {
    const found = await this.repo.find({ where: filter ?? {} });
    return found.map((f) => this.toDomain(f));
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
