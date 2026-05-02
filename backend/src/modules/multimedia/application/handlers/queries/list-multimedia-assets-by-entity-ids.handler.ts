import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';
import { ListMultimediaAssetsByEntityIdsQuery } from '../../queries/list-multimedia-assets-by-entity-ids.query';

@QueryHandler(ListMultimediaAssetsByEntityIdsQuery)
export class ListMultimediaAssetsByEntityIdsQueryHandler
  implements
    IQueryHandler<
      ListMultimediaAssetsByEntityIdsQuery,
      Record<string, MultimediaAsset[]>
    >
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  execute(
    query: ListMultimediaAssetsByEntityIdsQuery,
  ): Promise<Record<string, MultimediaAsset[]>> {
    return this.repository.listAssetsByEntityIds({
      entityType: query.entityType,
      entityIds: query.entityIds,
      usageType: query.usageType,
    });
  }
}
