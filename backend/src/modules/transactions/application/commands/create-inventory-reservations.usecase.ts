import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
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
import { InventoryReservationCreatedEvent } from '../../domain/events/inventory-events';
import { CreateInventoryReservationsDto } from '../dto/inventory.dto';

export class CreateInventoryReservationsCommand {
  constructor(
    public readonly dto: CreateInventoryReservationsDto,
    public readonly userId: string,
  ) {}
}

@Injectable()
@CommandHandler(CreateInventoryReservationsCommand)
export class CreateInventoryReservationsUseCase
  implements ICommandHandler<CreateInventoryReservationsCommand>
{
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
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: CreateInventoryReservationsCommand): Promise<string> {
    const { dto, userId } = command;

    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${dto.branchId} not found`);
    }

    const storage = await this.storageRepository.findOne({
      where: { id: dto.storageId, branch: { id: dto.branchId } },
    });
    if (!storage) {
      throw new NotFoundException(
        `Storage with ID ${dto.storageId} not found in branch ${dto.branchId}`,
      );
    }

    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const documentNumber = `IR-${Date.now()}`;

    const savedTransaction = (await this.transactionRepository.save({
      documentNumber,
      transactionType: TransactionType.INVENTORY_RESERVATION,
      status: TransactionStatus.COMPLETED,
      branchId: dto.branchId,
      storageId: dto.storageId,
      customerId: dto.customerId,
      userId: userId,
      total: 0,
      externalReference: dto.orderReference || null,
      notes: dto.notes || null,
      metadata: {
        expiresAt: dto.expiresAt ?? null,
      } as any,
    } as any)) as unknown as Transaction;

    const lines: TransactionLine[] = [];
    for (let i = 0; i < (dto.lines ?? []).length; i++) {
      const l = dto.lines[i];
      const product = await this.productRepository.findOne({
        where: { id: l.productId },
      });
      if (!product) {
        throw new NotFoundException(
          `Product with ID ${l.productId} not found`,
        );
      }

      let variant: any = null;
      if (l.variantId) {
        variant = await this.productVariantRepository.findOne({
          where: { id: l.variantId, product: { id: l.productId } },
        });
        if (!variant) {
          throw new NotFoundException(
            `Variant with ID ${l.variantId} not found for product ${l.productId}`,
          );
        }
      }

      const line = this.transactionLineRepository.create({
        transactionId: savedTransaction.id,
        productId: l.productId,
        productVariantId: l.variantId,
        productName: product.name,
        variantName: variant?.name,
        quantity: l.quantity,
        unitPrice: 0,
        subtotal: 0,
        total: 0,
        notes: dto.orderReference ? `Reserved for ${dto.orderReference}` : 'Reserved',
        lineNumber: i + 1,
      } as any) as unknown as TransactionLine;
      lines.push(line);
    }

    if (lines.length) {
      for (const l of lines) {
        await this.transactionLineRepository.save(l as any);
      }
    }

    // Emit one event per line for compatibility
    for (const tl of lines) {
      this.eventBus.publish(
        new InventoryReservationCreatedEvent(
          savedTransaction.id,
          tl.productId as any,
          tl.productVariantId as any,
          Number(tl.quantity ?? 0),
          dto.customerId,
          dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        ),
      );
    }

    return savedTransaction.id;
  }
}

