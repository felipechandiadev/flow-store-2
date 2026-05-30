import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentCompany } from '@common/tenant';
import { EShopService } from '../application/e-shop.service';
import { CreateHeroSlideDto } from '../application/dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from '../application/dto/update-hero-slide.dto';

@Controller('e-shop/admin')
export class EShopAdminController {
  constructor(private readonly eShopService: EShopService) {}

  @Get('testimonials')
  listTestimonials(@CurrentCompany() companyId: string) {
    return this.eShopService.listTestimonialsAdmin(companyId);
  }

  @Post('testimonials')
  createTestimonial(
    @CurrentCompany() companyId: string,
    @Body()
    body: {
      clientName: string;
      rating: number;
      message: string;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.eShopService.createTestimonial(companyId, body);
  }

  @Patch('testimonials/:id')
  updateTestimonial(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      clientName: string;
      rating: number;
      message: string;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.eShopService.updateTestimonial(companyId, id, body);
  }

  @Delete('testimonials/:id')
  deleteTestimonial(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.eShopService.deleteTestimonial(companyId, id);
  }

  @Get('hero-slider-settings')
  getHeroSliderSettings(@CurrentCompany() companyId: string) {
    return this.eShopService.getHeroSliderSettingsAdmin(companyId);
  }

  @Put('hero-slider-settings')
  updateHeroSliderSettings(
    @CurrentCompany() companyId: string,
    @Body() body: { autoplaySeconds: number },
  ) {
    return this.eShopService.updateHeroSliderAutoplaySeconds(
      companyId,
      body.autoplaySeconds,
    );
  }

  @Get('hero-slides')
  listHeroSlides(@CurrentCompany() companyId: string) {
    return this.eShopService.listHeroSlidesAdmin(companyId);
  }

  @Post('hero-slides')
  createHeroSlide(
    @CurrentCompany() companyId: string,
    @Body() body: CreateHeroSlideDto,
  ) {
    return this.eShopService.createHeroSlide(companyId, body);
  }

  @Put('hero-slides/order')
  reorderHeroSlides(
    @CurrentCompany() companyId: string,
    @Body() body: { orderedIds: string[] },
  ) {
    return this.eShopService.reorderHeroSlides(
      companyId,
      body.orderedIds ?? [],
    );
  }

  @Patch('hero-slides/:id')
  updateHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
    @Body() body: UpdateHeroSlideDto,
  ) {
    return this.eShopService.updateHeroSlide(companyId, id, body);
  }

  @Delete('hero-slides/:id')
  deleteHeroSlide(
    @CurrentCompany() companyId: string,
    @Param('id') id: string,
  ) {
    return this.eShopService.deleteHeroSlide(companyId, id);
  }

  @Get('featured-products')
  listFeaturedProducts(@CurrentCompany() companyId: string) {
    return this.eShopService.listFeaturedProductsAdmin(companyId);
  }

  @Put('featured-product-ids')
  replaceFeaturedProducts(
    @CurrentCompany() companyId: string,
    @Body() body: { productIds: string[] },
  ) {
    return this.eShopService.replaceFeaturedProductIds(
      companyId,
      body.productIds ?? [],
    );
  }

  @Get('catalog-products/:productId/preview')
  getCatalogProductPreview(
    @CurrentCompany() companyId: string,
    @Param('productId') productId: string,
  ) {
    return this.eShopService.getCatalogProductPreview(companyId, productId);
  }
}
