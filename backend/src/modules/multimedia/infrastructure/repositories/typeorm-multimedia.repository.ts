import { Injectable, NotFoundException } from '@nestjs/common';
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
  }): Promise<Array<MultimediaAsset & { isPrimary: boolean }>> {
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.asset', 'asset')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId = :entityId', { entityId: params.entityId })
      .andWhere('asset.deletedAt IS NULL')
      .orderBy('link.isPrimary', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');

    if (params.usageType) {
      qb.andWhere('link.usageType = :usageType', {
        usageType: params.usageType,
      });
    }

    const links = await qb.getMany();

    return links.map((link) => {
      const asset = link.asset;
      return Object.assign(asset, { isPrimary: link.isPrimary }) as MultimediaAsset & {
        isPrimary: boolean;
      };
    });
  }

  async setPrimaryAssetForEntity(params: {
    assetId: string;
    entityType: string;
    entityId: string;
  }): Promise<void> {
    const link = await this.linkRepository.findOne({
      where: {
        assetId: params.assetId,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });

    if (!link) {
      throw new NotFoundException('Enlace de multimedia no encontrado');
    }

    const { usageType } = link;

    await this.linkRepository.manager.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .update(MultimediaLink)
        .set({ isPrimary: false })
        .where('entityType = :et', { et: params.entityType })
        .andWhere('entityId = :eid', { eid: params.entityId })
        .andWhere('usageType = :ut', { ut: usageType })
        .execute();

      await em
        .createQueryBuilder()
        .update(MultimediaLink)
        .set({ isPrimary: true })
        .where('id = :id', { id: link.id })
        .execute();
    });
  }

  async listAssetsByEntityIds(params: {
    entityType: string;
    entityIds: string[];
    usageType?: string;
  }): Promise<Record<string, MultimediaAsset[]>> {
    const unique = [...new Set(params.entityIds.filter((id) => Boolean(id?.trim())))];
    if (unique.length === 0) {
      return {};
    }
    const qb = this.linkRepository
      .createQueryBuilder('link')
      .innerJoinAndSelect('link.asset', 'asset')
      .where('link.entityType = :entityType', { entityType: params.entityType })
      .andWhere('link.entityId IN (:...entityIds)', { entityIds: unique })
      .andWhere('asset.deletedAt IS NULL')
      .orderBy('link.entityId', 'ASC')
      .addOrderBy('link.isPrimary', 'DESC')
      .addOrderBy('link.sortOrder', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC');
    if (params.usageType) {
      qb.andWhere('link.usageType = :usageType', {
        usageType: params.usageType,
      });
    }
    const links = await qb.getMany();
    const byEntity: Record<string, MultimediaAsset[]> = {};
    for (const link of links) {
      const eid = link.entityId;
      const asset = link.asset;
      if (!asset) {
        continue;
      }
      if (!byEntity[eid]) {
        byEntity[eid] = [];
      }
      byEntity[eid].push(asset);
    }
    return byEntity;
  }

  countLinksForAsset(assetId: string): Promise<number> {
    return this.linkRepository.count({ where: { assetId } });
  }
}