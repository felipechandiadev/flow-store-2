import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SkipTenant } from '@common/tenant';
import { EShopService } from '../application/e-shop.service';
import { EShopStoreGuard } from './eshop-store.guard';
import { EShopStore } from './eshop-store.decorator';
import type { EShopStoreContext } from '../application/eshop-store.context';

@Controller('e-shop')
@SkipTenant()
@UseGuards(EShopStoreGuard)
export class EShopPublicController {
  constructor(private readonly eShopService: EShopService) {}

  @Get('storefront')
  getStorefront(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.getStorefront(store);
  }

  @Get('products')
  listProducts(
    @EShopStore() store: EShopStoreContext,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.eShopService.listProducts(store, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('catalog-products/:productId')
  getCatalogProduct(
    @EShopStore() store: EShopStoreContext,
    @Param('productId') productId: string,
  ) {
    return this.eShopService.getCatalogProduct(store, productId);
  }

  @Get('products/featured')
  listFeatured(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listFeatured(store);
  }

  @Get('products/:id')
  getProduct(@EShopStore() store: EShopStoreContext, @Param('id') id: string) {
    return this.eShopService.getProduct(store, id);
  }

  @Get('branches')
  listBranches(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listBranches(store);
  }

  @Get('hero-slides')
  listHeroSlides(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listHeroSlides(store);
  }

  @Get('testimonials')
  listTestimonials(@EShopStore() store: EShopStoreContext) {
    return this.eShopService.listTestimonials(store);
  }

  @Post('checkout')
  checkout(
    @EShopStore() store: EShopStoreContext,
    @Body()
    body: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      address?: string;
      lines: Array<{ productVariantId: string; quantity: number }>;
      notes?: string;
    },
  ) {
    return this.eShopService.createCheckoutSale(store, body);
  }
}
