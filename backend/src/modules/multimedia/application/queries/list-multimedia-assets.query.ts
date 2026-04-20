import { BaseQuery } from '@shared/cqrs';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';

export class ListMultimediaAssetsQuery extends BaseQuery<MultimediaAsset[]> {
  constructor(
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly usageType?: string,
  ) {
    super();
  }
}