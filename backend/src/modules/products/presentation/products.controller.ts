import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { ProductsService } from '../application/products.service';
import { ProductsPosService } from '../application/products-pos.service';
import { ProductsServiceAdapter } from '../application/products.service.adapter';
import { SearchProductsDto } from '../application/dto/search-products.dto';
import { SearchPosProductsDto } from '../application/dto/search-pos-products.dto';
import { CreateProductDto } from '../application/dto/create-product.dto';
import { UpdateProductDto } from '../application/dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(
    // Prefer adapter (CQRS) as primary service
    private readonly productsService: ProductsServiceAdapter,
    private readonly productsPosService: ProductsPosService,
  ) {}

  @Get()
  async findAll(@Query() query: SearchProductsDto) {
    return this.productsService.search({
      query: query.query || '',
      page: query.page || 1,
      pageSize: query.pageSize || 10,
      priceListId: query.priceListId,
    });
  }

  @Get('search')
  async search(@Query() searchDto: SearchProductsDto) {
    return this.productsService.search(searchDto);
  }

  /**
   * Endpoint optimizado para búsqueda en POS
   * Requiere priceListId y opcionalmente branchId para stock
   */
  @Get('pos/search')
  async searchForPos(@Query() searchDto: SearchPosProductsDto) {
    const data = await this.productsPosService.searchForPos(searchDto);
    return {
      success: true,
      ...data,
    };
  }

  /**
   * Stock de una variante en la sala de venta del POS o en un almacén explícito.
   * Query: `pointOfSaleId` y/o `storageId` (al menos uno debe resolver un almacén).
   */
  @Get('pos/variants/:variantId/stock-by-storage')
  async getPosVariantStock(
    @Param('variantId') variantId: string,
    @Query('pointOfSaleId') pointOfSaleId?: string,
    @Query('storageId') storageId?: string,
  ) {
    const data = await this.productsPosService.getVariantStockForPos({
      variantId,
      pointOfSaleId,
      storageId,
    });
    return data;
  }

  @Get(':id/stocks')
  async stocks(@Param('id') id: string) {
    return this.productsService.getStocks(id);
  }

  @Post()
  async create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
