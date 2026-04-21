import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { MetalPricesService } from '../application/metal-prices.service';
import { CreateMetalPriceDto } from '../application/dto/create-metal-price.dto';
import { UpdateMetalPriceDto } from '../application/dto/update-metal-price.dto';

@Controller('metal-prices')
export class MetalPricesController {
  constructor(private readonly metalPricesService: MetalPricesService) {}

  @Get()
  async findAll() {
    return this.metalPricesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.metalPricesService.findOne(id);
  }

  @Post()
  async create(@Body() createDto: CreateMetalPriceDto) {
    return this.metalPricesService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateMetalPriceDto) {
    return this.metalPricesService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.metalPricesService.remove(id);
  }
}
