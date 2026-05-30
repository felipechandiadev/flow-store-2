import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from '../../config/config.module';
import { EShopTestimonial } from './domain/e-shop-testimonial.entity';
import { EShopHeroSlide } from './domain/e-shop-hero-slide.entity';
import { EShopService } from './application/e-shop.service';
import { EShopPublicController } from './presentation/e-shop-public.controller';
import { EShopAdminController } from './presentation/e-shop-admin.controller';
import { EShopStoreGuard } from './presentation/eshop-store.guard';
import { ProductVariant } from '@modules/product-variants/domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Attribute } from '@modules/attributes/domain/attribute.entity';
import { StockLevel } from '@modules/stock-levels/domain/stock-level.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { User } from '@modules/users/domain/user.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { CompaniesModule } from '@modules/companies/companies.module';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { EShopSchemaBootstrap } from './infrastructure/eshop-schema.bootstrap';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forFeature([
      EShopTestimonial,
      EShopHeroSlide,
      ProductVariant,
      Product,
      Attribute,
      StockLevel,
      Branch,
      User,
      PriceListItem,
      Storage,
    ]),
    CompaniesModule,
    MultimediaModule,
    TransactionsModule,
  ],
  controllers: [EShopPublicController, EShopAdminController],
  providers: [EShopService, EShopStoreGuard, EShopSchemaBootstrap],
  exports: [EShopService],
})
export class EShopModule {}
