import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ListMultimediaAssetsQuery } from '../../queries/list-multimedia-assets.query';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';

@QueryHandler(ListMultimediaAssetsQuery)
export class ListMultimediaAssetsQueryHandler
  implements IQueryHandler<ListMultimediaAssetsQuery, MultimediaAsset[]>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  execute(query: ListMultimediaAssetsQuery): Promise<MultimediaAsset[]> {
    return this.repository.listAssetsByEntity({
      entityType: query.entityType,
      entityId: query.entityId,
      usageType: query.usageType,
    });
  }
}