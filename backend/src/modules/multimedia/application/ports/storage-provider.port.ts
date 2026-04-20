export interface UploadStoragePayload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  metadata?: Record<string, unknown>;
}

export interface StoredFileResult {
  storageKey: string;
  storedName: string;
  publicUrl: string;
  checksum?: string;
}

export interface StorageProviderPort {
  upload(payload: UploadStoragePayload): Promise<StoredFileResult>;
  delete(storageKey: string): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  buildPublicUrl(storageKey: string): string;
}

export const STORAGE_PROVIDER = 'StorageProviderPort';