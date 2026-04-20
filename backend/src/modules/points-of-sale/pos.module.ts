import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PointOfSale } from '@modules/points-of-sale/domain/point-of-sale.entity';
import { PosController } from './presentation/pos.controller';
import { PosService } from './application/pos.service';

@Module({
  imports: [TypeOrmModule.forFeature([PointOfSale])],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
