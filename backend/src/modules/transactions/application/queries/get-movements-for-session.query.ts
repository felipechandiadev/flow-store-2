import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionType } from '../../domain/transaction.entity';

export interface SessionMovement {
  id: string;
  transactionType: TransactionType;
  documentNumber: string;
  createdAt: Date;
  total: number;
  paymentMethod: string;
  paymentMethodLabel: string | undefined;
  userId: string | null;
  userFullName: string | null;
  userUserName: string | null;
  notes: string | null;
  reason: string | null;
  metadata: any;
  direction: 'IN' | 'OUT' | 'NEUTRAL';
}

export class GetMovementsForSessionQuery {
  constructor(public readonly cashSessionId: string) {}
}

@Injectable()
@QueryHandler(GetMovementsForSessionQuery)
export class GetMovementsForSessionQueryHandler implements IQueryHandler<GetMovementsForSessionQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(
    query: GetMovementsForSessionQuery,
  ): Promise<SessionMovement[]> {
    const txs = await this.transactionRepository.find({
      where: { cashSessionId: query.cashSessionId },
      relations: ['user', 'user.person'],
      order: { createdAt: 'ASC' },
    });

    return txs.map((tx) => {
      const userFullName = tx.user?.person
        ? `${tx.user.person.firstName} ${tx.user.person.lastName}`
        : null;
      const userUserName = tx.user?.userName || null;

      return {
        id: tx.id,
        transactionType: tx.transactionType,
        documentNumber: tx.documentNumber,
        createdAt: tx.createdAt,
        total: Number(tx.total || 0),
        paymentMethod: tx.paymentMethod,
        paymentMethodLabel: undefined, // frontend can translate
        userId: tx.userId || null,
        userFullName,
        userUserName,
        notes: tx.notes || null,
        reason: tx.metadata?.reason || null,
        metadata: tx.metadata || null,
        direction: this.computeDirection(tx),
      };
    });
  }

  private computeDirection(tx: Transaction): 'IN' | 'OUT' | 'NEUTRAL' {
    switch (tx.transactionType) {
      case TransactionType.CASH_SESSION_OPENING:
        return 'NEUTRAL';
      case TransactionType.SALE:
      case TransactionType.CASH_SESSION_DEPOSIT:
      case TransactionType.PAYMENT_IN:
        return 'IN';
      case TransactionType.CASH_SESSION_WITHDRAWAL:
      case TransactionType.OPERATING_EXPENSE:
      case TransactionType.PAYMENT_OUT:
      case TransactionType.CASH_DEPOSIT:
        return 'OUT';
      default:
        return 'NEUTRAL';
    }
  }
}
