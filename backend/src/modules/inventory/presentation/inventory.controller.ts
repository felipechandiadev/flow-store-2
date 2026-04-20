import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { InventoryService } from '../application/inventory.service';
import {
  CreateAdjustmentDto,
  CreateTransferDto,
} from '../application/dto/stock-level.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('filters')
  async getFilters() {
    return this.inventoryService.getFilters();
  }

  @Get()
  async getInventory(
    @Query() params: { search?: string; branchId?: string; storageId?: string },
  ) {
    return this.inventoryService.search(params);
  }

  @Post('adjust')
  async adjust(@Body() data: CreateAdjustmentDto) {
    return this.inventoryService.adjust(data);
  }

  @Post('transfer')
  async transfer(@Body() data: CreateTransferDto) {
    return this.inventoryService.transfer(data);
  }
}
