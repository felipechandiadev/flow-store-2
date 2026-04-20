import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Storage } from './domain/storage.entity';
import { StoragesService } from './application/storages.service';
import { StoragesServiceAdapter } from './application/storages.service.adapter';
import { StoragesController } from './presentation/storages.controller';
import { GetAllStoragesQueryHandler } from './application/handlers/queries/get-all-storages.handler';

@Module({
  imports: [TypeOrmModule.forFeature([Storage]), CqrsModule],
  controllers: [StoragesController],
  providers: [StoragesService, StoragesServiceAdapter, GetAllStoragesQueryHandler],
  exports: [StoragesService, StoragesServiceAdapter],
})
export class StoragesModule {}
