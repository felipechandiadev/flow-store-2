import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../ports/multimedia.repository.port';
import { MultimediaStorageRegistry } from './multimedia-storage.registry';

@Injectable()
export class MultimediaAssetPurgeService {
  private readonly logger = new Logger(MultimediaAssetPurgeService.name);

  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    private readonly storageRegistry: MultimediaStorageRegistry,
  ) {}

  /**
   * Elimina el binario en local/R2 y hace soft-delete del registro en BD.
   */
  async purgeAsset(asset: MultimediaAsset): Promise<void> {
    const storage = this.storageRegistry.forProvider(asset.storageProvider);
    try {
      await storage.delete(asset.storageKey);
    } catch (err) {
      this.logger.warn(
        `No se pudo borrar el archivo «${asset.storageKey}» (${asset.storageProvider}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    await this.repository.deleteAsset(asset.id);
    this.logger.debug(`Multimedia asset purged: id=${asset.id}`);
  }

  async purgeAssetById(assetId: string): Promise<void> {
    const asset = await this.repository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException('Multimedia asset not found');
    }
    await this.purgeAsset(asset);
  }
}
