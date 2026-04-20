import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../../config/config.service';
import { MultimediaController } from './presentation/multimedia.controller';
import { MultimediaServiceAdapter } from './application/services/multimedia.service.adapter';
import { MultimediaAsset } from './domain/multimedia-asset.entity';
import { MultimediaLink } from './domain/multimedia-link.entity';
import {
  MULTIMEDIA_REPOSITORY,
} from './application/ports/multimedia.repository.port';
import { STORAGE_PROVIDER } from './application/ports/storage-provider.port';
import { TypeOrmMultimediaRepository } from './infrastructure/repositories/typeorm-multimedia.repository';
import { LocalStorageAdapter } from './infrastructure/adapters/local-storage.adapter';
import { CloudflareR2Adapter } from './infrastructure/adapters/cloudflare-r2.adapter';
import { UploadMultimediaCommandHandler } from './application/handlers/commands/upload-multimedia.handler';
import { DeleteMultimediaCommandHandler } from './application/handlers/commands/delete-multimedia.handler';
import { LinkMultimediaCommandHandler } from './application/handlers/commands/link-multimedia.handler';
import { UnlinkMultimediaCommandHandler } from './application/handlers/commands/unlink-multimedia.handler';
import { GetMultimediaAssetQueryHandler } from './application/handlers/queries/get-multimedia-asset.handler';
import { ListMultimediaAssetsQueryHandler } from './application/handlers/queries/list-multimedia-assets.handler';

@Module({
  imports: [TypeOrmModule.forFeature([MultimediaAsset, MultimediaLink]), CqrsModule],
  controllers: [MultimediaController],
  providers: [
    MultimediaServiceAdapter,
    UploadMultimediaCommandHandler,
    DeleteMultimediaCommandHandler,
    LinkMultimediaCommandHandler,
    UnlinkMultimediaCommandHandler,
    GetMultimediaAssetQueryHandler,
    ListMultimediaAssetsQueryHandler,
    {
      provide: MULTIMEDIA_REPOSITORY,
      useClass: TypeOrmMultimediaRepository,
    },
    {
      provide: STORAGE_PROVIDER,
      useFactory: (configService: AppConfigService) => {
        if (configService.storage.strategy === 'cloudflare') {
          return new CloudflareR2Adapter(configService);
        }

        return new LocalStorageAdapter(configService);
      },
      inject: [AppConfigService],
    },
  ],
  exports: [MultimediaServiceAdapter],
})
export class MultimediaModule {}