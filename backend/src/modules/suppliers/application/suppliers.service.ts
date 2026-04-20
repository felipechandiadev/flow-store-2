import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { SuppliersRepository } from '../infrastructure/suppliers.repository';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from '../domain/supplier.entity';

@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(private readonly repository: SuppliersRepository) {}

  async findAll(params?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    supplierType?: string;
  }): Promise<{ data: Supplier[]; total: number }> {
    const { limit = 50, offset = 0, isActive, supplierType } = params || {};

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (supplierType) where.supplierType = supplierType;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: ['person'],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.repository.findOne(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier ${id} not found`);
    }
    return supplier;
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    this.logger.log(`Creating supplier for person ${dto.personId}`);
    return this.repository.create(dto);
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findOne(id);
    this.logger.log(`Updating supplier ${id}`);
    return this.repository.update(id, dto);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);
    this.logger.log(`Removing supplier ${id}`);
    await this.repository.remove(id);
  }
}
