import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetMultimediaAssetQuery } from '../../queries/get-multimedia-asset.query';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';

@QueryHandler(GetMultimediaAssetQuery)
export class GetMultimediaAssetQueryHandler
  implements IQueryHandler<GetMultimediaAssetQuery, MultimediaAsset | null>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  execute(query: GetMultimediaAssetQuery): Promise<MultimediaAsset | null> {
    return this.repository.findAssetById(query.assetId);
  }
}