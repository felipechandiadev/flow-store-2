import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoldPrice } from '@modules/gold-prices/domain/gold-price.entity';
import { MetalType } from '@modules/gold-prices/domain/metal.enum';

export interface GoldPriceDTO {
  id?: string;
  date: string;
  valueCLP: number;
  notes?: string;
  metal: string;
}

@Injectable()
export class GoldPriceService {
  constructor(
    @InjectRepository(GoldPrice)
    private readonly goldPriceRepository: Repository<GoldPrice>,
  ) {}

  async getGoldPrices(): Promise<GoldPriceDTO[]> {
    try {
      const prices = await this.goldPriceRepository.find({
        order: { date: 'DESC' },
      });
      const result = prices.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        valueCLP: Number(p.valueCLP),
        notes: p.notes,
        metal: p.metal,
      }));
      console.log('GoldPriceService - getGoldPrices result:', result);
      return result;
    } catch (err) {
      console.error('GoldPriceService - Error getting prices:', err);
      return [];
    }
  }

  async saveGoldPrice(
    data: GoldPriceDTO,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let entity: GoldPrice;
      if (data.id) {
        const found = await this.goldPriceRepository.findOneBy({ id: data.id });
        if (!found) return { success: false, error: 'Registro no encontrado' };
        entity = found;
      } else {
        entity = this.goldPriceRepository.create();
      }
      entity.date = new Date(data.date);
      entity.valueCLP = data.valueCLP;
      entity.notes = data.notes;
      entity.metal = data.metal;
      await this.goldPriceRepository.save(entity);
      return { success: true };
    } catch (err) {
      console.error('GoldPriceService - Error saving price:', err);
      return { success: false, error: String(err) };
    }
  }
}
