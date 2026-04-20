import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not } from 'typeorm';
import { CustomerOrmEntity } from './orm-mappers/customer.orm-entity';
import { Customer } from '@modules/customers/domain/customer.entity';
import { Person } from '@modules/persons/domain/person.entity';
import {
  Transaction,
  TransactionType,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { CustomersRepositoryPort } from '@modules/customers/application/ports/customers.repository.port';

@Injectable()
export class CustomersRepository implements CustomersRepositoryPort {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly repo: Repository<CustomerOrmEntity>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  private toDomain(e: CustomerOrmEntity): Customer {
    return Object.assign(new Customer(), {
      id: e.id,
      personId: e.personId,
      creditLimit: Number(e.creditLimit),
      currentBalance: Number(e.currentBalance),
      paymentDayOfMonth: e.paymentDayOfMonth,
      isActive: e.isActive,
      notes: e.notes,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      deletedAt: e.deletedAt,
      person: e.person as any,
    });
  }

  private toOrm(d: Customer): CustomerOrmEntity {
    const e = new CustomerOrmEntity();
    e.id = d.id;
    e.personId = d.personId;
    e.creditLimit = d.creditLimit as any;
    e.currentBalance = d.currentBalance as any;
    e.paymentDayOfMonth = d.paymentDayOfMonth;
    e.isActive = d.isActive;
    e.notes = d.notes;
    return e;
  }

  async save(customer: Customer): Promise<Customer> {
    const orm = this.toOrm(customer);
    const saved = await this.repo.save(orm as any);
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Customer | null> {
    const found = await this.repo.findOne({
      where: { id },
      relations: ['person'],
    });
    return found ? this.toDomain(found) : null;
  }

  async findByIdWithPerson(id: string): Promise<Customer | null> {
    return this.findById(id); // Already includes person relation
  }

  async findAll(filter?: Record<string, any>): Promise<Customer[]> {
    const where: any = {};
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;

    const found = await this.repo.find({
      where,
      relations: ['person'],
      order: { createdAt: 'DESC' },
    });
    return found.map((f) => this.toDomain(f));
  }

  async findAllWithPagination(
    filter?: Record<string, any>,
    page?: number,
    pageSize?: number,
  ): Promise<{ customers: Customer[]; total: number }> {
    const { searchQuery = '' } = filter || {};
    const pageNum = page || 1;
    const size = pageSize || 10;

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.person', 'person')
      .where('1=1');

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = `%${searchQuery.trim()}%`;
      qb.andWhere(
        '(person.firstName LIKE :q OR person.lastName LIKE :q OR person.businessName LIKE :q OR person.documentNumber LIKE :q)',
        { q },
      );
    }

    qb.orderBy('c.createdAt', 'DESC')
      .skip((pageNum - 1) * size)
      .take(size);

    const [customers, total] = await qb.getManyAndCount();

    return { customers: customers.map((c) => this.toDomain(c)), total };
  }

  async findByPersonId(personId: string): Promise<Customer | null> {
    const found = await this.repo.findOne({
      where: { personId },
      withDeleted: true,
    });
    return found ? this.toDomain(found) : null;
  }

  async findByDocumentNumber(documentNumber: string): Promise<Customer | null> {
    const person = await this.personRepository.findOne({
      where: { documentNumber },
      withDeleted: true,
    });

    if (!person) return null;

    return this.findByPersonId(person.id);
  }

  async update(id: string, updateData: Partial<Customer>): Promise<Customer> {
    await this.repo.update(id, updateData as any);
    const updated = await this.repo.findOne({
      where: { id },
    });
    if (!updated) throw new Error('Customer not found after update');
    return this.toDomain(updated);
  }

  async softDelete(id: string): Promise<void> {
    const customer = await this.repo.findOne({
      where: { id },
    });

    if (customer) {
      customer.isActive = false;
      await this.repo.save(customer);
    }
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getTransactions(customerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getPendingPayments(customerId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { customerId, paymentStatus: Not(PaymentStatus.PAID) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getPurchases(
    customerId: string,
    status?: string,
  ): Promise<Transaction[]> {
    const where: any = {
      customerId,
      transactionType: TransactionType.PURCHASE,
    };
    if (status) where.status = status;

    return this.transactionRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async calculateAvailableCredit(customerId: string): Promise<{
    creditLimit: number;
    usedCredit: number;
    availableCredit: number;
  }> {
    const customer = await this.repo.findOne({
      where: { id: customerId },
    });

    if (!customer) return { creditLimit: 0, usedCredit: 0, availableCredit: 0 };

    const creditLimit = Number(customer.creditLimit || 0);
    const usedCredit = Number(customer.currentBalance || 0);
    const availableCredit = Math.max(0, creditLimit - usedCredit);

    return { creditLimit, usedCredit, availableCredit };
  }
}
