import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository, IsNull } from 'typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';

@Injectable()
export class PosService {
  constructor(
    @InjectRepository(PointOfSale)
    private posRepository: Repository<PointOfSale>,
  ) {}

  async findAll(includeInactive: boolean) {
    const query = this.posRepository
      .createQueryBuilder('pos')
      .leftJoinAndSelect('pos.branch', 'branch')
      .where('pos.deletedAt IS NULL')
      .orderBy('pos.name', 'ASC');

    if (!includeInactive) {
      query.andWhere('pos.isActive = :isActive', { isActive: true });
    }

    const pointsOfSale = await query.getMany();

    return {
      success: true,
      pointsOfSale: pointsOfSale.map((pos) => this.mapPointOfSale(pos)),
    };
  }

  async getPointOfSaleById(id: string) {
    const pos = await this.posRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: { branch: true },
    });
    if (!pos) {
      return null;
    }
    return this.mapPointOfSale(pos);
  }

  async createPointOfSale(data: {
    name: string;
    branchId?: string | null;
    deviceId?: string | null;
    isActive?: boolean;
    priceLists?: Array<{ id: string; name: string; isActive: boolean }>;
    defaultPriceListId?: string | null;
  }) {
    if (!data.name || !data.name.trim()) {
      return { success: false, error: 'El nombre es requerido' };
    }

    const priceLists = Array.isArray(data.priceLists) ? data.priceLists : [];
    const defaultPriceListId =
      data.defaultPriceListId ??
      (priceLists.length > 0 ? priceLists[0].id : undefined);

    const pos = this.posRepository.create({
      name: data.name.trim(),
      branchId: data.branchId ?? undefined,
      deviceId: data.deviceId ?? undefined,
      isActive: data.isActive !== false,
      priceLists,
      defaultPriceListId,
    } as DeepPartial<PointOfSale>);

    const saved = await this.posRepository.save(pos);
    const created = await this.getPointOfSaleById(saved.id);

    return { success: true, pointOfSale: created };
  }

  async updatePointOfSale(
    id: string,
    data: Partial<{
      name: string;
      branchId: string | null;
      deviceId: string | null;
      isActive: boolean;
      priceLists: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId: string | null;
    }>,
  ) {
    const pos = await this.posRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!pos) {
      return { success: false, error: 'Punto de venta no encontrado' };
    }

    const updateData: Partial<PointOfSale> = {};
    if (typeof data.name === 'string') {
      updateData.name = data.name.trim();
    }
    if (data.branchId !== undefined) {
      updateData.branchId = data.branchId ?? undefined;
    }
    if (data.deviceId !== undefined) {
      updateData.deviceId = data.deviceId ?? undefined;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.priceLists !== undefined) {
      updateData.priceLists = data.priceLists;
    }
    if (data.defaultPriceListId !== undefined) {
      updateData.defaultPriceListId = data.defaultPriceListId ?? undefined;
    }

    await this.posRepository.update(id, updateData);
    const updated = await this.getPointOfSaleById(id);

    return { success: true, pointOfSale: updated };
  }

  async getPriceLists(id: string) {
    const pos = await this.posRepository.findOne({ where: { id } });
    if (!pos) {
      return {
        success: false,
        message: 'Punto de venta no encontrado',
        priceLists: [],
      };
    }
    return {
      success: true,
      priceLists: pos.priceLists ?? [],
    };
  }

  async deletePointOfSale(id: string) {
    const result = await this.posRepository.softDelete(id);
    if (!result.affected) {
      return { success: false, error: 'Punto de venta no encontrado' };
    }
    return { success: true };
  }

  private mapPointOfSale(pos: PointOfSale) {
    return {
      id: pos.id,
      name: pos.name,
      branchId: pos.branchId,
      branch: pos.branch
        ? {
            id: pos.branch.id,
            name: pos.branch.name,
          }
        : undefined,
      priceLists: pos.priceLists ?? [],
      deviceId: pos.deviceId,
      isActive: pos.isActive,
      defaultPriceListId: pos.defaultPriceListId ?? null,
      createdAt: pos.createdAt,
      updatedAt: pos.updatedAt,
    };
  }
}
