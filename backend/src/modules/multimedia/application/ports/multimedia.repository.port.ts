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
  attributeId?: string | null;
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
    attributeId?: string | null;
  }): Promise<void>;
  listAssetsByEntity(params: {
    entityType: string;
    entityId: string;
    usageType?: string;
    attributeId?: string | null;
  }): Promise<
    Array<
      MultimediaAsset & {
        isPrimary: boolean;
        sortOrder: number;
        linkId: string;
      }
    >
  >;
  reorderLinksForEntity(params: {
    entityType: string;
    entityId: string;
    assetIds: string[];
    usageType?: string;
    attributeId?: string | null;
  }): Promise<void>;
  /** Dentro del mismo ámbito (usageType + attributeId), solo un link puede ser principal. */
  setPrimaryAssetForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    attributeId?: string | null;
  }): Promise<void>;
  /**
   * Misma orden que `listAssetsByEntity` por entidad: isPrimary DESC, sortOrder, createdAt.
   * Claves = entityId; solo incluye ids con al menos un asset.
   */
  listAssetsByEntityIds(params: {
    entityType: string;
    entityIds: string[];
    usageType?: string;
    attributeId?: string | null;
    /** `general` (default): solo galería sin atributo; `all`: incluye multimedia por atributo. */
    attributeScope?: 'general' | 'all';
  }): Promise<Record<string, MultimediaAsset[]>>;
  countLinksForAsset(assetId: string): Promise<number>;
  removeAllLinksForAsset(assetId: string): Promise<void>;
}

export const MULTIMEDIA_REPOSITORY = 'MultimediaRepositoryPort';