import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { AppConfigService } from '../../../../config/config.service';
import {
  StorageProviderPort,
  StoredFileResult,
  UploadStoragePayload,
} from '../../application/ports/storage-provider.port';

@Injectable()
export class LocalStorageAdapter implements StorageProviderPort {
  constructor(private readonly configService: AppConfigService) {}

  async upload(payload: UploadStoragePayload): Promise<StoredFileResult> {
    const extension = path.extname(payload.originalName);
    const storedName = `${randomUUID()}${extension}`;
    const targetDir = path.resolve(this.configService.storage.local.path);
    const targetPath = path.join(targetDir, storedName);

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetPath, payload.buffer);

    return {
      storageKey: storedName,
      storedName,
      publicUrl: this.buildPublicUrl(storedName),
    };
  }

  async delete(storageKey: string): Promise<void> {
    const targetPath = path.join(
      path.resolve(this.configService.storage.local.path),
      storageKey,
    );

    await fs.rm(targetPath, { force: true });
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      await fs.access(
        path.join(path.resolve(this.configService.storage.local.path), storageKey),
      );
      return true;
    } catch {
      return false;
    }
  }

  buildPublicUrl(storageKey: string): string {
    const basePath = this.configService.storage.publicBasePath.replace(/\/$/, '');
    return `${basePath}/${storageKey}`;
  }
}