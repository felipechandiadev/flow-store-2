import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { Attribute } from '../domain/attribute.entity';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
  ) {}

  async getAllAttributes(includeInactive: boolean) {
    const query = this.attributeRepository.createQueryBuilder('attribute');

    if (!includeInactive) {
      query.where('attribute.isActive = :isActive', { isActive: true });
    }

    const attributes = await query
      .orderBy('attribute.displayOrder', 'ASC')
      .addOrderBy('attribute.name', 'ASC')
      .getMany();
    return attributes.map((attribute) => this.mapAttribute(attribute));
  }

  async getAttributeById(id: string) {
    const attribute = await this.attributeRepository.findOne({ where: { id } });
    if (!attribute) {
      return null;
    }
    return this.mapAttribute(attribute);
  }

  async createAttribute(data: {
    name: string;
    description?: string | null;
    options: string[];
  }) {
    const attribute = this.attributeRepository.create({
      name: data.name,
      description: data.description ?? undefined,
      options: data.options,
      isActive: true,
    } as DeepPartial<Attribute>);

    const saved = await this.attributeRepository.save(attribute);
    const created = await this.getAttributeById(saved.id);

    return { success: true, attribute: created };
  }

  async updateAttribute(
    id: string,
    data: Partial<{
      name: string;
      description: string | null;
      options: string[];
      isActive: boolean;
    }>,
  ) {
    await this.attributeRepository.update(id, data as any);
    const updated = await this.getAttributeById(id);

    if (!updated) {
      return {
        success: false,
        message: 'Attribute not found',
        statusCode: 404,
      };
    }

    return { success: true, attribute: updated };
  }

  async deleteAttribute(id: string) {
    const result = await this.attributeRepository.softDelete(id);
    if (!result.affected) {
      return {
        success: false,
        message: 'Attribute not found',
        statusCode: 404,
      };
    }
    return { success: true };
  }

  private mapAttribute(attribute: Attribute) {
    return {
      id: attribute.id,
      name: attribute.name,
      description: attribute.description ?? null,
      options: attribute.options ?? [],
      displayOrder: attribute.displayOrder,
      isActive: attribute.isActive,
      createdAt: attribute.createdAt,
      updatedAt: attribute.updatedAt,
    };
  }
}
