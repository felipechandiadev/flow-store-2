import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductVariant } from './domain/product-variant.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { ProductVariantsService } from './application/product-variants.service';
import { ProductVariantsController } from './presentation/product-variants.controller';
import { TypeOrmProductVariantsRepository } from './infrastructure/repositories/typeorm-product-variants.repository';
import { PRODUCT_VARIANTS_REPOSITORY } from './application/ports/product-variants.repository.port';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductVariant, PriceListItem]),
    CqrsModule,
    MultimediaModule,
  ],
  providers: [
    ProductVariantsService,
    {
      provide: PRODUCT_VARIANTS_REPOSITORY,
      useClass: TypeOrmProductVariantsRepository,
    },
  ],
  controllers: [ProductVariantsController],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
