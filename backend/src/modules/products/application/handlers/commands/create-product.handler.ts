import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateProductCommand } from '../../commands/create-product.command';
import { ProductCreatedEvent } from '../../../domain/events/product-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductType } from '../../../domain/product.entity';

@CommandHandler(CreateProductCommand)
export class CreateProductCommandHandler implements ICommandHandler<
  CreateProductCommand,
  Product
> {
  private readonly logger = new Logger(CreateProductCommandHandler.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateProductCommand): Promise<Product> {
    this.logger.debug(`Creating product: ${command.name}`);

    const product = this.productRepository.create({
      id: command.productId,
      name: command.name,
      categoryId: command.categoryId,
      brand: command.brand,
      description: command.description,
      isActive: command.isActive,
      productType: command.productType ?? ProductType.PHYSICAL,
    });

    const saved = await this.productRepository.save(product);

    const event = new ProductCreatedEvent(
      saved.id,
      saved.name,
      saved.categoryId,
      saved.brand,
    );
    event.aggregateVersion = 1;
    event.correlationId = saved.id;

    this.eventBus.publish(event);
    this.logger.debug(`Product ${saved.id} created successfully`);

    // Convert ORM entity to domain entity
    return new Product({
      id: saved.id,
      name: saved.name,
      categoryId: saved.categoryId,
      brand: saved.brand,
      description: saved.description,
      isActive: saved.isActive,
      productType: saved.productType,
      taxIds: saved.taxIds,
      resultCenterId: saved.resultCenterId ?? null,
      baseUnitId: saved.baseUnitId,
      metadata: saved.metadata,
      changeHistory: saved.changeHistory,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      deletedAt: saved.deletedAt,
    });
  }
}
