import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AppConfigService } from '../../../../config/config.service';
import {
  StorageProviderPort,
  StoredFileResult,
  UploadStoragePayload,
} from '../../application/ports/storage-provider.port';

@Injectable()
export class CloudflareR2Adapter implements StorageProviderPort {
  private readonly client: S3Client;

  constructor(private readonly configService: AppConfigService) {
    const { r2 } = this.configService.storage;

    this.client = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: {
        accessKeyId: r2.accessKeyId ?? '',
        secretAccessKey: r2.secretAccessKey ?? '',
      },
    });
  }

  async upload(payload: UploadStoragePayload): Promise<StoredFileResult> {
    const extension = path.extname(payload.originalName);
    const storedName = `${randomUUID()}${extension}`;
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      throw new Error('R2 bucket name is not configured');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: storedName,
        Body: payload.buffer,
        ContentType: payload.mimeType,
      }),
    );

    return {
      storageKey: storedName,
      storedName,
      publicUrl: this.buildPublicUrl(storedName),
    };
  }

  async delete(storageKey: string): Promise<void> {
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      throw new Error('R2 bucket name is not configured');
    }

    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }),
    );
  }

  async exists(storageKey: string): Promise<boolean> {
    const bucket = this.configService.storage.r2.bucketName;

    if (!bucket) {
      return false;
    }

    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: storageKey }),
      );
      return true;
    } catch {
      return false;
    }
  }

  buildPublicUrl(storageKey: string): string {
    const publicUrl = this.configService.storage.r2.publicUrl;

    if (!publicUrl) {
      throw new Error('R2 public URL is not configured');
    }

    return `${publicUrl.replace(/\/$/, '')}/${storageKey}`;
  }
}