import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteMultimediaCommand } from '../../commands/delete-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import {
  STORAGE_PROVIDER,
  StorageProviderPort,
} from '../../ports/storage-provider.port';

@CommandHandler(DeleteMultimediaCommand)
export class DeleteMultimediaCommandHandler
  implements ICommandHandler<DeleteMultimediaCommand, { success: true }>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProviderPort,
  ) {}

  async execute(
    command: DeleteMultimediaCommand,
  ): Promise<{ success: true }> {
    const asset = await this.repository.findAssetById(command.assetId);

    if (!asset) {
      throw new Error('Multimedia asset not found');
    }

    const linkCount = await this.repository.countLinksForAsset(command.assetId);

    if (linkCount > 1) {
      throw new Error('Cannot delete a multimedia asset linked to multiple entities');
    }

    await this.storageProvider.delete(asset.storageKey);
    await this.repository.deleteAsset(command.assetId);

    return { success: true };
  }
}