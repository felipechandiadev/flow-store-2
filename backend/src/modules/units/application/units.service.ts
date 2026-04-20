import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Unit } from '../domain/unit.entity';

@Injectable()
export class UnitsService {
  constructor(
    @InjectRepository(Unit)
    private readonly unitRepository: Repository<Unit>,
  ) {}

  async getAllUnits(status?: string) {
    try {
      const query = this.unitRepository.createQueryBuilder('unit');

      // Filter by status if provided
      if (status === 'active') {
        query.where('unit.active = :active', { active: true });
      } else if (status === 'inactive') {
        query.where('unit.active = :active', { active: false });
      }
      // If status is 'all' or not provided, return all units including soft deleted

      const units = await query.orderBy('unit.symbol', 'ASC').getMany();

      return units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        dimension: unit.dimension,
        conversionFactor: unit.conversionFactor,
        allowDecimals: unit.allowDecimals,
        isBase: unit.isBase,
        active: unit.active,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
      }));
    } catch (error) {
      console.error('Error fetching units:', error);
      return [];
    }
  }

  async getUnitById(id: string) {
    try {
      const unit = await this.unitRepository.findOne({
        where: { id },
      });

      if (!unit) {
        return null;
      }

      return {
        id: unit.id,
        name: unit.name,
        symbol: unit.symbol,
        dimension: unit.dimension,
        conversionFactor: unit.conversionFactor,
        allowDecimals: unit.allowDecimals,
        isBase: unit.isBase,
        active: unit.active,
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
      };
    } catch (error) {
      console.error('Error fetching unit:', error);
      return null;
    }
  }

  async createUnit(data: {
    name: string;
    symbol: string;
    dimension: string;
    conversionFactor: number;
    allowDecimals?: boolean;
    isBase?: boolean;
  }) {
    try {
      const unit = this.unitRepository.create({
        name: data.name,
        symbol: data.symbol,
        dimension: data.dimension as any,
        conversionFactor: data.conversionFactor,
        allowDecimals: data.allowDecimals ?? true,
        isBase: data.isBase ?? false,
        active: true,
      });

      const savedUnit = await this.unitRepository.save(unit);

      return {
        id: savedUnit.id,
        name: savedUnit.name,
        symbol: savedUnit.symbol,
        dimension: savedUnit.dimension,
        conversionFactor: savedUnit.conversionFactor,
        allowDecimals: savedUnit.allowDecimals,
        isBase: savedUnit.isBase,
        active: savedUnit.active,
        createdAt: savedUnit.createdAt,
        updatedAt: savedUnit.updatedAt,
      };
    } catch (error) {
      console.error('Error creating unit:', error);
      throw error;
    }
  }

  async updateUnit(
    id: string,
    data: Partial<{
      name: string;
      dimension: string;
      conversionFactor: number;
      allowDecimals: boolean;
      active: boolean;
    }>,
  ) {
    try {
      const updateData: any = { ...data };

      // Ensure dimension is properly typed if provided
      if (updateData.dimension) {
        updateData.dimension = updateData.dimension;
      }

      await this.unitRepository.update(id, updateData);

      return this.getUnitById(id);
    } catch (error) {
      console.error('Error updating unit:', error);
      throw error;
    }
  }

  async deleteUnit(id: string) {
    try {
      await this.unitRepository.softDelete(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting unit:', error);
      throw error;
    }
  }
}
