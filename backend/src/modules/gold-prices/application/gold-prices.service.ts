import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoldPrice } from '../domain/gold-price.entity';
import { CreateGoldPriceDto } from './dto/create-gold-price.dto';
import { UpdateGoldPriceDto } from './dto/update-gold-price.dto';

@Injectable()
export class GoldPricesService {
  constructor(
    @InjectRepository(GoldPrice)
    private readonly goldPriceRepository: Repository<GoldPrice>,
  ) {}

  async findAll() {
    const prices = await this.goldPriceRepository.find({
      order: { date: 'DESC' },
    });

    return {
      success: true,
      data: prices.map((p) => ({
        id: p.id,
        date: p.date.toISOString(),
        valueCLP: Number(p.valueCLP),
        notes: p.notes,
        metal: p.metal,
      })),
    };
  }

  async findOne(id: string) {
    const price = await this.goldPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Precio de oro no encontrado');
    }

    return {
      success: true,
      data: {
        id: price.id,
        date: price.date.toISOString(),
        valueCLP: Number(price.valueCLP),
        notes: price.notes,
        metal: price.metal,
      },
    };
  }

  async create(createDto: CreateGoldPriceDto) {
    const price = this.goldPriceRepository.create({
      date: new Date(createDto.date),
      valueCLP: createDto.valueCLP,
      metal: createDto.metal,
      notes: createDto.notes,
    });

    const saved = await this.goldPriceRepository.save(price);

    return {
      success: true,
      data: {
        id: saved.id,
        date: saved.date.toISOString(),
        valueCLP: Number(saved.valueCLP),
        notes: saved.notes,
        metal: saved.metal,
      },
    };
  }

  async update(id: string, updateDto: UpdateGoldPriceDto) {
    const price = await this.goldPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Precio de oro no encontrado');
    }

    if (updateDto.date) price.date = new Date(updateDto.date);
    if (updateDto.valueCLP !== undefined) price.valueCLP = updateDto.valueCLP;
    if (updateDto.metal) price.metal = updateDto.metal;
    if (updateDto.notes !== undefined) price.notes = updateDto.notes;

    const saved = await this.goldPriceRepository.save(price);

    return {
      success: true,
      data: {
        id: saved.id,
        date: saved.date.toISOString(),
        valueCLP: Number(saved.valueCLP),
        notes: saved.notes,
        metal: saved.metal,
      },
    };
  }

  async remove(id: string) {
    const price = await this.goldPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Precio de oro no encontrado');
    }

    await this.goldPriceRepository.remove(price);

    return {
      success: true,
      message: 'Precio de oro eliminado',
    };
  }
}
