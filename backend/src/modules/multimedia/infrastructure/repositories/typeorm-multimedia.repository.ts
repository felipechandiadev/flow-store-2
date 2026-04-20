import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateMultimediaAssetPayload,
  CreateMultimediaLinkPayload,
  MultimediaRepositoryPort,
} from '../../application/ports/multimedia.repository.port';
import { MultimediaAsset } from '../../domain/multimedia-asset.entity';
import { MultimediaLink } from '../../domain/multimedia-link.entity';

@Injectable()
export class TypeOrmMultimediaRepository implements MultimediaRepositoryPort {
  constructor(
    @InjectRepository(MultimediaAsset)
    private readonly assetRepository: Repository<MultimediaAsset>,
    @InjectRepository(MultimediaLink)
    private readonly linkRepository: Repository<MultimediaLink>,
  ) {}

  async createAsset(
    payload: CreateMultimediaAssetPayload,
  ): Promise<MultimediaAsset> {
    const entity = this.assetRepository.create({
      ...payload,
      status: 'active',
    });

    return this.assetRepository.save(entity);
  }

  findAssetById(id: string): Promise<MultimediaAsset | null> {
    return this.assetRepository.findOne({ where: { id } });
  }

  findAssetByStorageKey(storageKey: string): Promise<MultimediaAsset | null> {
    return this.assetRepository.findOne({ where: { storageKey } });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.assetRepository.softDelete(id);
  }

  async createLink(
    payload: CreateMultimediaLinkPayload,
  ): Promise<MultimediaLink> {
    const entity = this.linkRepository.create({
      ...payload,
      sortOrder: payload.sortOrder ?? 0,
      isPrimary: payload.isPrimary ?? false,
    });

    return this.linkRepository.save(entity);
  }

  async removeLink(params: {
    assetId: string;
    entityType: string;
    entityId: string;
    usageType?: string;
  }): Promise<void> {
    const where: Record<string, unknown> = {
      assetId: params.assetId,
      entityType: params.entityType,
      entityId: params.entityId,
    };

    if (params.usageType) {
      where.usageType = params.usageType;
    }

    await this.linkRepository.delete(where);
  }

  async listAssetsByEntity(params: {
    entityType: string;
    entityId: string;
    usageType?: string;
  }): Promise<MultimediaAsset[]> {
    const query = this.assetRepository
      .createQueryBuilder('asset')
      .innerJoin(MultimediaLink, 'link', 'link.assetId = asset.id')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId })
      .orderBy('link.isPrimary', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');

    if (params.usageType) {
      query.andWhere('link.usageType = :usageType', {
        usageType: params.usageType,
      });
    }

    return query.getMany();
  }

  countLinksForAsset(assetId: string): Promise<number> {
    return this.linkRepository.count({ where: { assetId } });
  }
}