import { Injectable } from '@nestjs/common';
import { QueryHandler, IQueryHandler, IQuery } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '@modules/transactions/domain/transaction.entity';

export class GetActiveInventoryReservationsQuery implements IQuery {
  constructor(
    public readonly branchId?: string,
    public readonly storageId?: string,
    public readonly productId?: string,
    public readonly customerId?: string,
  ) {}
}

export interface InventoryReservationSummary {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  customerId: string;
  customerName: string;
  storageId: string;
  storageName: string;
  branchId: string;
  branchName: string;
  createdAt: Date;
  expiresAt?: Date;
  orderReference?: string;
  notes?: string;
  isExpired: boolean;
}

@Injectable()
@QueryHandler(GetActiveInventoryReservationsQuery)
export class GetActiveInventoryReservationsQueryHandler implements IQueryHandler<GetActiveInventoryReservationsQuery> {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async execute(
    query: GetActiveInventoryReservationsQuery,
  ): Promise<InventoryReservationSummary[]> {
    const { branchId, storageId, productId, customerId } = query;

    const qb = this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.id',
        't.reference',
        't.notes',
        't.createdAt',
        'p.id',
        'p.name',
        'pv.id',
        'pv.name',
        'c.id',
        'c.firstName',
        'c.lastName',
        's.id',
        's.name',
        'b.id',
        'b.name',
        'tl.quantity',
      ])
      .innerJoin('t.lines', 'tl')
      .innerJoin('tl.product', 'p')
      .leftJoin('tl.variant', 'pv')
      .innerJoin('t.customer', 'c')
      .innerJoin('t.storage', 's')
      .innerJoin('t.branch', 'b')
      .where('t.type = :type', { type: 'INVENTORY_RESERVATION' })
      .andWhere('t.status = :status', { status: 'COMPLETED' });

    if (branchId) {
      qb.andWhere('b.id = :branchId', { branchId });
    }

    if (storageId) {
      qb.andWhere('s.id = :storageId', { storageId });
    }

    if (productId) {
      qb.andWhere('p.id = :productId', { productId });
    }

    if (customerId) {
      qb.andWhere('c.id = :customerId', { customerId });
    }

    const results = await qb.getRawMany();

    const now = new Date();
    return results.map((result) => {
      // Extract expiration date from notes if present
      let expiresAt: Date | undefined;
      const notesMatch = result.t_notes?.match(/Expires: ([^-\n]+)/);
      if (notesMatch) {
        expiresAt = new Date(notesMatch[1]);
      }

      return {
        id: result.t_id,
        productId: result.p_id,
        productName: result.p_name,
        variantId: result.pv_id,
        variantName: result.pv_name,
        quantity: result.tl_quantity,
        customerId: result.c_id,
        customerName: `${result.c_firstName} ${result.c_lastName}`,
        storageId: result.s_id,
        storageName: result.s_name,
        branchId: result.b_id,
        branchName: result.b_name,
        createdAt: result.t_createdAt,
        expiresAt,
        orderReference: result.t_reference,
        notes: result.t_notes,
        isExpired: expiresAt ? expiresAt < now : false,
      };
    });
  }
}
