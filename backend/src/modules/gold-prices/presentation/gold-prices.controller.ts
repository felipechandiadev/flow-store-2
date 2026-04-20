import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { GoldPricesService } from '../application/gold-prices.service';
import { CreateGoldPriceDto } from '../application/dto/create-gold-price.dto';
import { UpdateGoldPriceDto } from '../application/dto/update-gold-price.dto';

@Controller('gold-prices')
export class GoldPricesController {
  constructor(private readonly goldPricesService: GoldPricesService) {}

  @Get()
  async findAll() {
    return this.goldPricesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.goldPricesService.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreateGoldPriceDto) {
    return this.goldPricesService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateGoldPriceDto) {
    return this.goldPricesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.goldPricesService.remove(id);
  }
}
