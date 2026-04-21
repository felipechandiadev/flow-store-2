import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetalPrice } from '../domain/metal-price.entity';
import { CreateMetalPriceDto } from './dto/create-metal-price.dto';
import { UpdateMetalPriceDto } from './dto/update-metal-price.dto';

@Injectable()
export class MetalPricesService {
  constructor(
    @InjectRepository(MetalPrice)
    private readonly metalPriceRepository: Repository<MetalPrice>,
  ) {}

  async findAll() {
    const prices = await this.metalPriceRepository.find({
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
    const price = await this.metalPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Metal price not found');
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

  async create(createDto: CreateMetalPriceDto) {
    const price = this.metalPriceRepository.create({
      date: new Date(createDto.date),
      valueCLP: createDto.valueCLP,
      metal: createDto.metal,
      notes: createDto.notes,
    });

    const saved = await this.metalPriceRepository.save(price);

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

  async update(id: string, updateDto: UpdateMetalPriceDto) {
    const price = await this.metalPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Metal price not found');
    }

    if (updateDto.date) price.date = new Date(updateDto.date);
    if (updateDto.valueCLP !== undefined) price.valueCLP = updateDto.valueCLP;
    if (updateDto.metal) price.metal = updateDto.metal;
    if (updateDto.notes !== undefined) price.notes = updateDto.notes;

    const saved = await this.metalPriceRepository.save(price);

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
    const price = await this.metalPriceRepository.findOne({ where: { id } });

    if (!price) {
      throw new NotFoundException('Metal price not found');
    }

    await this.metalPriceRepository.remove(price);

    return {
      success: true,
      message: 'Metal price deleted',
    };
  }
}
