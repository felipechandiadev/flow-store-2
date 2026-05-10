import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MultimediaAsset } from './multimedia-asset.entity';

@Entity('multimedia_links')
@Index('IDX_multimedia_links_entity', ['entityType', 'entityId'])
export class MultimediaLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_multimedia_links_company_id')
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  assetId!: string;

  @Column({ type: 'varchar', length: 100 })
  entityType!: string;

  @Column({ type: 'uuid' })
  entityId!: string;

  @Column({ type: 'varchar', length: 100 })
  usageType!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => MultimediaAsset, (asset) => asset.links, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'assetId' })
  asset!: MultimediaAsset;
}