import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { PriceListItemOrmEntity } from './infrastructure/orm-mappers/price-list-item.orm-entity';
import { PriceListItemsServiceAdapter } from './application/price-list-items.service.adapter';
import { PriceListItemsController } from './presentation/price-list-items.controller';
import { GetAllPriceListItemsQueryHandler } from './application/handlers/queries/get-all-price-list-items.handler';
import { GetPriceListItemByIdQueryHandler } from './application/handlers/queries/get-price-list-item-by-id.handler';
import { TypeOrmPriceListItemsRepository } from './infrastructure/repositories/typeorm-price-list-items.repository';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([PriceListItemOrmEntity])],
  controllers: [PriceListItemsController],
  providers: [
    PriceListItemsServiceAdapter,
    {
      provide: 'PriceListItemsRepositoryPort',
      useClass: TypeOrmPriceListItemsRepository,
    },
    GetAllPriceListItemsQueryHandler,
    GetPriceListItemByIdQueryHandler,
  ],
  exports: [PriceListItemsServiceAdapter, 'PriceListItemsRepositoryPort'],
})
export class PriceListItemsModule {}
