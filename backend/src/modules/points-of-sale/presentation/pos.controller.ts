import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PosService } from '../application/pos.service';

@Controller('points-of-sale')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get()
  async findAll(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true' || includeInactive === '1';
    return this.posService.findAll(include);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const pointOfSale = await this.posService.getPointOfSaleById(id);
    if (!pointOfSale) {
      return {
        success: false,
        message: 'Punto de venta no encontrado',
        statusCode: 404,
      };
    }
    return { success: true, pointOfSale };
  }

  @Post()
  async createPointOfSale(
    @Body()
    data: {
      name: string;
      branchId?: string | null;
      deviceId?: string | null;
      isActive?: boolean;
      priceLists?: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId?: string | null;
    },
  ) {
    return this.posService.createPointOfSale(data);
  }

  @Put(':id')
  async updatePointOfSale(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      name: string;
      branchId: string | null;
      deviceId: string | null;
      isActive: boolean;
      priceLists: Array<{ id: string; name: string; isActive: boolean }>;
      defaultPriceListId: string | null;
    }>,
  ) {
    return this.posService.updatePointOfSale(id, data);
  }

  @Get(':id/price-lists')
  async getPriceLists(@Param('id') id: string) {
    return this.posService.getPriceLists(id);
  }

  @Delete(':id')
  async deletePointOfSale(@Param('id') id: string) {
    return this.posService.deletePointOfSale(id);
  }
}
