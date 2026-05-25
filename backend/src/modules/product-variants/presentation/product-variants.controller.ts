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
import { ProductVariantsService } from '../application/product-variants.service';
import { CreateProductVariantDto } from '../application/dto/create-product-variant.dto';
import { UpdateProductVariantDto } from '../application/dto/update-product-variant.dto';
import { ListProductVariantsDto } from '../application/dto/list-product-variants.dto';
import { SearchPurchasingVariantsDto } from '../application/dto/search-purchasing-variants.dto';
import { VariantPurchaseInsightsQueryDto } from '../application/dto/variant-purchase-insights.dto';

@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Get()
  async findAll(@Query() query: ListProductVariantsDto) {
    return this.variantsService.findAll(query);
  }

  @Get('purchasing-search')
  async searchPurchasing(@Query() query: SearchPurchasingVariantsDto) {
    return this.variantsService.searchForPurchasing(query);
  }

  @Get('scan/by-code')
  async lookupByCode(
    @Query('value') value: string,
    @Query('by') by: 'barcode' | 'sku',
  ) {
    return this.variantsService.lookupByCode(value, by);
  }

  @Get(':id/purchase-insights')
  async purchaseInsights(
    @Param('id') id: string,
    @Query() query: VariantPurchaseInsightsQueryDto,
  ) {
    return this.variantsService.getPurchaseInsights(id, query.limit);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.variantsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateProductVariantDto) {
    return this.variantsService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdateProductVariantDto) {
    return this.variantsService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
