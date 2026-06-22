import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  EShopFulfillmentMethod,
  type EShopFulfillmentMethodType,
} from '../domain/e-shop-fulfillment-method.entity';
import type { EShopFulfillmentMethodSnapshot } from '@modules/transactions/domain/transaction-eshop-order.metadata';

export type FulfillmentMethodPublicRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: EShopFulfillmentMethodType;
  price: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  requiresAddress: boolean;
  requiresPhone: boolean;
  instructions: string | null;
};

@Injectable()
export class EShopFulfillmentMethodsService {
  constructor(
    @InjectRepository(EShopFulfillmentMethod)
    private readonly repo: Repository<EShopFulfillmentMethod>,
  ) {}

  async listActive(companyId: string): Promise<FulfillmentMethodPublicRow[]> {
    const rows = await this.repo.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((r) => this.toPublicRow(r, 0));
  }

  async listActiveWithPricing(
    companyId: string,
    subtotal: number,
    globalFreeThreshold: number | null,
  ): Promise<FulfillmentMethodPublicRow[]> {
    const rows = await this.repo.find({
      where: { companyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return rows.map((r) =>
      this.toPublicRow(
        r,
        this.calculateShippingCost(r, subtotal, globalFreeThreshold),
      ),
    );
  }

  async listAdmin(companyId: string): Promise<EShopFulfillmentMethod[]> {
    return this.repo.find({
      where: { companyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findActiveById(
    companyId: string,
    id: string,
  ): Promise<EShopFulfillmentMethod | null> {
    return this.repo.findOne({
      where: { companyId, id, isActive: true },
    });
  }

  async findById(companyId: string, id: string): Promise<EShopFulfillmentMethod | null> {
    return this.repo.findOne({ where: { companyId, id } });
  }

  async create(
    companyId: string,
    data: Partial<EShopFulfillmentMethod>,
  ): Promise<EShopFulfillmentMethod> {
    const maxSort = await this.repo
      .createQueryBuilder('m')
      .select('COALESCE(MAX(m.sortOrder), -1)', 'max')
      .where('m.companyId = :companyId', { companyId })
      .getRawOne<{ max: string }>();
    const row = this.repo.create({
      companyId,
      code: data.code!.trim(),
      name: data.name!.trim(),
      description: data.description?.trim() || null,
      type: data.type!,
      priceFlat: data.priceFlat ?? null,
      freeShippingThreshold: data.freeShippingThreshold ?? null,
      estimatedDaysMin: data.estimatedDaysMin ?? null,
      estimatedDaysMax: data.estimatedDaysMax ?? null,
      requiresAddress: data.requiresAddress === true,
      requiresPhone: data.requiresPhone === true,
      instructions: data.instructions?.trim() || null,
      pickupBranchId: data.pickupBranchId ?? null,
      isActive: data.isActive !== false,
      sortOrder: data.sortOrder ?? Number(maxSort?.max ?? -1) + 1,
    });
    return this.repo.save(row);
  }

  async update(
    companyId: string,
    id: string,
    data: Partial<EShopFulfillmentMethod>,
  ): Promise<EShopFulfillmentMethod> {
    const row = await this.findById(companyId, id);
    if (!row) throw new Error('Método de entrega no encontrado');
    if (data.code != null) row.code = data.code.trim();
    if (data.name != null) row.name = data.name.trim();
    if (data.description !== undefined) row.description = data.description?.trim() || null;
    if (data.type != null) row.type = data.type;
    if (data.priceFlat !== undefined) row.priceFlat = data.priceFlat;
    if (data.freeShippingThreshold !== undefined) {
      row.freeShippingThreshold = data.freeShippingThreshold;
    }
    if (data.estimatedDaysMin !== undefined) row.estimatedDaysMin = data.estimatedDaysMin;
    if (data.estimatedDaysMax !== undefined) row.estimatedDaysMax = data.estimatedDaysMax;
    if (data.requiresAddress !== undefined) row.requiresAddress = data.requiresAddress;
    if (data.requiresPhone !== undefined) row.requiresPhone = data.requiresPhone;
    if (data.instructions !== undefined) row.instructions = data.instructions?.trim() || null;
    if (data.pickupBranchId !== undefined) row.pickupBranchId = data.pickupBranchId;
    if (data.isActive !== undefined) row.isActive = data.isActive;
    if (data.sortOrder !== undefined) row.sortOrder = data.sortOrder;
    return this.repo.save(row);
  }

  async remove(companyId: string, id: string): Promise<void> {
    await this.repo.delete({ companyId, id });
  }

  async reorder(companyId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.repo.update({ companyId, id: orderedIds[i] }, { sortOrder: i });
    }
  }

  async ensureDefaults(companyId: string): Promise<void> {
    const existing = await this.repo.count({ where: { companyId } });
    if (existing > 0) return;
    await this.create(companyId, {
      code: 'pickup',
      name: 'Retiro en tienda',
      description: 'Retira tu pedido en nuestra boutique',
      type: 'PICKUP',
      requiresAddress: false,
      requiresPhone: false,
      instructions: 'Te avisaremos cuando tu pedido esté listo para retiro.',
      isActive: true,
      sortOrder: 0,
    } as EShopFulfillmentMethod);
    await this.create(companyId, {
      code: 'coordinate',
      name: 'Envío a coordinar',
      description: 'Coordinamos el envío contigo tras confirmar el pedido',
      type: 'MANUAL_QUOTE',
      requiresAddress: true,
      requiresPhone: true,
      instructions: 'Nos contactaremos para acordar dirección y costo de envío.',
      isActive: true,
      sortOrder: 1,
    } as EShopFulfillmentMethod);
  }

  calculateShippingCost(
    method: EShopFulfillmentMethod,
    subtotal: number,
    globalFreeThreshold: number | null,
  ): number {
    switch (method.type) {
      case 'PICKUP':
      case 'MANUAL_QUOTE':
        return 0;
      case 'FLAT_RATE':
        return Math.max(0, Number(method.priceFlat) || 0);
      case 'FREE_OVER_THRESHOLD': {
        const threshold =
          method.freeShippingThreshold != null
            ? Number(method.freeShippingThreshold)
            : globalFreeThreshold != null
              ? Number(globalFreeThreshold)
              : null;
        if (threshold != null && threshold > 0 && subtotal >= threshold) {
          return 0;
        }
        return Math.max(0, Number(method.priceFlat) || 0);
      }
      default:
        return 0;
    }
  }

  toSnapshot(
    method: EShopFulfillmentMethod,
    price: number,
  ): EShopFulfillmentMethodSnapshot {
    return {
      id: method.id,
      code: method.code,
      name: method.name,
      type: method.type,
      price,
      instructions: method.instructions ?? null,
    };
  }

  private toPublicRow(
    method: EShopFulfillmentMethod,
    price: number,
  ): FulfillmentMethodPublicRow {
    return {
      id: method.id,
      code: method.code,
      name: method.name,
      description: method.description ?? null,
      type: method.type,
      price,
      estimatedDaysMin: method.estimatedDaysMin ?? null,
      estimatedDaysMax: method.estimatedDaysMax ?? null,
      requiresAddress: method.requiresAddress,
      requiresPhone: method.requiresPhone,
      instructions: method.instructions ?? null,
    };
  }
}
