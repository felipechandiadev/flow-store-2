import { Injectable, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../domain/transaction.entity';

export class FindTransactionQuery {
  constructor(public readonly id: string) {}
}

@Injectable()
@QueryHandler(FindTransactionQuery)
export class FindTransactionQueryHandler implements IQueryHandler<FindTransactionQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(query: FindTransactionQuery): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: query.id },
      relations: [
        'branch',
        'pointOfSale',
        'cashSession',
        'customer',
        'customer.person',
        'supplier',
        'supplier.person',
        'expenseCategory',
        'resultCenter',
        'shareholder',
        'employee',
        'user',
        'user.person',
        'storage',
        'targetStorage',
        'transactionLines',
        'transactionLines.product',
        'transactionLines.productVariant',
        'transactionLines.unit',
        'transactionLines.tax',
      ],
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${query.id} not found`);
    }

    return transaction;
  }
}
