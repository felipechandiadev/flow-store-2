import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UnlinkMultimediaCommand } from '../../commands/unlink-multimedia.command';
import {
  MULTIMEDIA_REPOSITORY,
  MultimediaRepositoryPort,
} from '../../ports/multimedia.repository.port';

@CommandHandler(UnlinkMultimediaCommand)
export class UnlinkMultimediaCommandHandler
  implements ICommandHandler<UnlinkMultimediaCommand, { success: true }>
{
  constructor(
    @Inject(MULTIMEDIA_REPOSITORY)
    private readonly repository: MultimediaRepositoryPort,
  ) {}

  async execute(
    command: UnlinkMultimediaCommand,
  ): Promise<{ success: true }> {
    await this.repository.removeLink({
      assetId: command.assetId,
      entityType: command.entityType,
      entityId: command.entityId,
      usageType: command.usageType,
    });

    return { success: true };
  }
}