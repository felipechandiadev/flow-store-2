import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { ProductVariant } from './domain/product-variant.entity';
import { Product } from '@modules/products/domain/product.entity';
import { Unit } from '@modules/units/domain/unit.entity';
import { PriceListItem } from '@modules/price-list-items/domain/price-list-item.entity';
import { ProductVariantsService } from './application/product-variants.service';
import { ProductVariantsController } from './presentation/product-variants.controller';
import { TypeOrmProductVariantsRepository } from './infrastructure/repositories/typeorm-product-variants.repository';
import { PRODUCT_VARIANTS_REPOSITORY } from './application/ports/product-variants.repository.port';
import { MultimediaModule } from '@modules/multimedia/multimedia.module';
import { PriceListItemsModule } from '@modules/price-list-items/price-list-items.module';
import { AttributesModule } from '@modules/attributes/attributes.module';
import { VariantQuantityConversionService } from './application/variant-quantity-conversion.service';
import { ProductVariantShippingSchemaBootstrap } from './application/product-variant-shipping-schema.bootstrap';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductVariant, PriceListItem, Unit, Product]),
    CqrsModule,
    MultimediaModule,
    PriceListItemsModule,
    AttributesModule,
  ],
  providers: [
    ProductVariantShippingSchemaBootstrap,
    ProductVariantsService,
    VariantQuantityConversionService,
    {
      provide: PRODUCT_VARIANTS_REPOSITORY,
      useClass: TypeOrmProductVariantsRepository,
    },
  ],
  controllers: [ProductVariantsController],
  exports: [ProductVariantsService, VariantQuantityConversionService],
})
export class ProductVariantsModule {}
