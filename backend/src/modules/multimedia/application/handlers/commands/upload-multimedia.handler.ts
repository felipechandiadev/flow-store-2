import {
  CommandHandler,
  EventBus,
  ICommandHandler,
} from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { UploadMultimediaCommand } from '../../commands/upload-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';
import {
  STORAGE_PROVIDER,
  StorageProviderPort,
} from '../../ports/storage-provider.port';
import { AppConfigService } from '../../../../../config/config.service';
import { MultimediaAsset } from '../../../domain/multimedia-asset.entity';

@CommandHandler(UploadMultimediaCommand)
export class UploadMultimediaCommandHandler
  implements ICommandHandler<UploadMultimediaCommand, MultimediaAsset>
{
  private readonly logger = new Logger(UploadMultimediaCommandHandler.name);

  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProviderPort,
    private readonly configService: AppConfigService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UploadMultimediaCommand): Promise<MultimediaAsset> {
    const { file } = command;
    const { maxFileSize, allowedMimeTypes, strategy } = this.configService.storage;

    if (file.size > maxFileSize) {
      throw new Error('File exceeds maximum allowed size');
    }

    if (!allowedMimeTypes.includes(file.mimeType)) {
      throw new Error('File MIME type is not allowed');
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const uploadResult = await this.storageProvider.upload({
      buffer: file.buffer,
      originalName: file.originalName,
      mimeType: file.mimeType,
      metadata: command.metadata,
    });

    const asset = await this.repository.createAsset({
      originalName: file.originalName,
      storedName: uploadResult.storedName,
      storageKey: uploadResult.storageKey,
      publicUrl: uploadResult.publicUrl,
      mimeType: file.mimeType,
      kind: file.mimeType.startsWith('image/') ? 'image' : 'document',
      storageProvider: strategy,
      size: file.size,
      checksum: uploadResult.checksum ?? checksum,
      metadata: command.metadata ?? null,
    });

    if (command.entityType && command.entityId) {
      await this.repository.createLink({
        assetId: asset.id,
        entityType: command.entityType,
        entityId: command.entityId,
        usageType: command.usageType,
        isPrimary: command.isPrimary,
        metadata: command.metadata ?? null,
      });
    }

    this.logger.debug(`Uploaded multimedia asset ${asset.id}`);
    this.eventBus.publish({
      type: 'multimedia.uploaded',
      assetId: asset.id,
      entityType: command.entityType,
      entityId: command.entityId,
    });

    return asset;
  }
}