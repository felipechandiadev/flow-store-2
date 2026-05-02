import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import { MultimediaLink } from '../../domain/multimedia-link.entity';

export interface CreateMultimediaAssetPayload {
  originalName: string;
  storedName: string;
  storageKey: string;
  publicUrl: string;
  mimeType: string;
  kind: 'image' | 'document' | 'other';
  storageProvider: 'local' | 'cloudflare';
  size: number;
  checksum?: string;
  metadata?: Record<string, unknown> | null;
}

export interface CreateMultimediaLinkPayload {
  assetId: string;
  entityType: string;
  entityId: string;
  usageType: string;
  sortOrder?: number;
  isPrimary?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface MultimediaRepositoryPort {
  createAsset(payload: CreateMultimediaAssetPayload): Promise<MultimediaAsset>;
  findAssetById(id: string): Promise<MultimediaAsset | null>;
  findAssetByStorageKey(storageKey: string): Promise<MultimediaAsset | null>;
  deleteAsset(id: string): Promise<void>;
  createLink(payload: CreateMultimediaLinkPayload): Promise<MultimediaLink>;
  removeLink(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
  }): Promise<void>;
  listAssetsByEntity(params: {
    entityType: string;
    entityId: string;
    usageType?: string;
  }): Promise<Array<MultimediaAsset & { isPrimary: boolean }>>;
  /** Dentro del mismo `usageType`, solo un link puede ser principal. */
  setPrimaryAssetForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
  }): Promise<void>;
  /**
   * Misma orden que `listAssetsByEntity` por entidad: isPrimary DESC, sortOrder, createdAt.
   * Claves = entityId; solo incluye ids con al menos un asset.
   */
  listAssetsByEntityIds(params: {
    entityType: string;
    entityIds: string[];
    usageType?: string;
  }): Promise<Record<string, MultimediaAsset[]>>;
  countLinksForAsset(assetId: string): Promise<number>;
}

export const MULTIMEDIA_REPOSITORY = 'MultimediaRepositoryPort';