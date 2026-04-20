import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Tax, TaxType } from '../domain/tax.entity';

@Injectable()
export class TaxesService {
  constructor(
    @InjectRepository(Tax)
    private readonly taxRepository: Repository<Tax>,
  ) {}

  async getAllTaxes(includeInactive: boolean, isActive?: boolean) {
    const query = this.taxRepository.createQueryBuilder('tax');

    if (typeof isActive === 'boolean') {
      query.where('tax.isActive = :isActive', { isActive });
    } else if (!includeInactive) {
      query.where('tax.isActive = :isActive', { isActive: true });
    }

    const taxes = await query.orderBy('tax.name', 'ASC').getMany();
    return taxes.map((tax) => this.mapTax(tax));
  }

  async getTaxById(id: string) {
    const tax = await this.taxRepository.findOne({ where: { id } });
    if (!tax) {
      return null;
    }
    return this.mapTax(tax);
  }

  async createTax(data: {
    companyId: string;
    name: string;
    code: string;
    taxType?: TaxType | string;
    rate: number;
    description?: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }) {
    const tax = this.taxRepository.create({
      companyId: data.companyId,
      name: data.name,
      code: data.code,
      taxType: (data.taxType as TaxType) ?? TaxType.IVA,
      rate: data.rate,
      description: data.description ?? undefined,
      isDefault: !!data.isDefault,
      isActive: data.isActive !== false,
    } as DeepPartial<Tax>);

    const saved = await this.taxRepository.save(tax);
    const created = await this.getTaxById(saved.id);

    return { success: true, tax: created };
  }

  async updateTax(
    id: string,
    data: Partial<{
      name: string;
      code: string;
      taxType: TaxType | string;
      rate: number;
      description: string | null;
      isDefault: boolean;
      isActive: boolean;
    }>,
  ) {
    const updateData: any = { ...data };
    if (updateData.taxType) {
      updateData.taxType = updateData.taxType as TaxType;
    }

    await this.taxRepository.update(id, updateData);
    const updated = await this.getTaxById(id);

    if (!updated) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }

    return { success: true, tax: updated };
  }

  async deleteTax(id: string) {
    const result = await this.taxRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, message: 'Tax not found', statusCode: 404 };
    }
    return { success: true };
  }

  private mapTax(tax: Tax) {
    return {
      id: tax.id,
      companyId: tax.companyId,
      name: tax.name,
      code: tax.code,
      taxType: tax.taxType,
      rate: Number(tax.rate),
      description: tax.description ?? null,
      isDefault: tax.isDefault,
      isActive: tax.isActive,
      createdAt: tax.createdAt,
      updatedAt: tax.updatedAt,
    };
  }
}
