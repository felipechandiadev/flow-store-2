import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../../domain/transaction.entity';
import { TransactionLine } from '../../../transaction-lines/domain/transaction-line.entity';
import { Product } from '../../../products/domain/product.entity';
import { ProductVariant } from '../../../product-variants/domain/product-variant.entity';
import { Storage } from '../../../storages/domain/storage.entity';
import { Branch } from '../../../branches/domain/branch.entity';
import { User } from '../../../users/domain/user.entity';
import { Customer } from '../../../customers/domain/customer.entity';
import { TransactionRepositoryPort } from '../../application/ports/transaction.repository.port';
import { EventBus } from '@nestjs/cqrs';
import { InventoryReservationCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryReservationDto } from '../dto/inventory.dto';

export class CreateInventoryReservationCommand {
  constructor(
    public readonly dto: CreateInventoryReservationDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryReservationCommand)
export class CreateInventoryReservationUseCase implements ICommandHandler<CreateInventoryReservationCommand> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionLine)
    private readonly transactionLineRepository: Repository<TransactionLine>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Storage)
    private readonly storageRepository: Repository<Storage>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @Inject('TransactionRepositoryPort')
    private readonly transactionRepositoryPort: TransactionRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateInventoryReservationCommand): Promise<string> {
    const { dto, userId } = command;

    // Validate branch exists
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    // Validate storage exists and belongs to branch
    const storage = await this.storageRepository.findOne({
      where: { id: dto.storageId, branch: { id: dto.branchId } },
    });
    if (!storage) {
      throw new NotFoundException(
        `Storage with ID ${dto.storageId} not found in branch ${dto.branchId}`,
      );
    }

    // Validate customer exists
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Validate variant if provided
    let variant: any = null;
    if (dto.variantId) {
      variant = await this.productVariantRepository.findOne({
        where: { id: dto.variantId, product: { id: dto.productId } },
      });
      if (!variant) {
        throw new NotFoundException(
          `Variant with ID ${dto.variantId} not found for product ${dto.productId}`,
        );
      }
    }

    // Validate user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check available stock (this would need integration with inventory service)
    // For now, we'll assume the reservation is valid

    // Generate document number
    const documentNumber = `IR-${Date.now()}`;

    // Create inventory reservation transaction
    const transaction = this.transactionRepository.create({
      documentNumber,
      transactionType: TransactionType.INVENTORY_RESERVATION,
      status: TransactionStatus.COMPLETED,
      branchId: dto.branchId,
      storageId: dto.storageId,
      customerId: dto.customerId,
      userId: userId,
      total: 0, // Reservations don't have monetary value
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Create transaction line for the reservation
    const transactionLine = this.transactionLineRepository.create({
      transactionId: savedTransaction.id,
      productId: dto.productId,
      productVariantId: dto.variantId,
      productName: product.name,
      variantName: variant?.name,
      quantity: dto.quantity,
      unitPrice: 0, // No monetary value
      total: 0,
      notes: `Reserved for customer ${(customer as any).person?.firstName || 'Unknown'} ${(customer as any).person?.lastName || ''}${dto.expiresAt ? ` - Expires: ${dto.expiresAt}` : ''}${dto.notes ? ` - ${dto.notes}` : ''}`,
    });

    await this.transactionLineRepository.save(transactionLine);

    // Publish domain event
    this.eventBus.publish(
      new InventoryReservationCreatedEvent(
        savedTransaction.id,
        dto.productId,
        dto.variantId,
        dto.quantity,
        dto.customerId,
        dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      ),
    );

    return savedTransaction.id;
  }
}
