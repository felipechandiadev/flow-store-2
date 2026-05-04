// ProductVariant ORM entity mapper (detailed definition below)
import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { ProductOrmEntity as Product } from '@modules/products/infrastructure/orm-mappers/product.orm-entity';
import { UnitOrmEntity as Unit } from '@modules/units/infrastructure/orm-mappers/unit.orm-entity';
import { PriceListItemOrmEntity as PriceListItem } from '@modules/price-list-items/infrastructure/orm-mappers/price-list-item.orm-entity';
import type { PmpHistoryEntry } from '@modules/product-variants/domain/pmp-history.types';

@Entity('product_variants')
export class ProductVariantOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  productId?: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  sku!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode?: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  basePrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  baseCost!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  pmp!: number;

  @Column({ type: 'json', nullable: true })
  pmpHistory?: PmpHistoryEntry[] | null;

  @Column({ type: 'uuid', name: 'unit_id' })
  unitId!: string;

  @ManyToOne(() => Unit, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight?: number;

  @Column({ type: 'varchar', length: 16, name: 'weight_unit', default: 'kg' })
  weightUnit!: string;

  @Column({ type: 'json', nullable: true })
  attributeValues?: Record<string, string>;

  @Column({ type: 'json', nullable: true })
  taxIds?: string[];

  @Column({ type: 'boolean', default: true })
  trackInventory!: boolean;

  @Column({ type: 'boolean', default: false })
  allowNegativeStock!: boolean;

  @Column({ type: 'int', default: 0 })
  minimumStock!: number;

  @Column({ type: 'int', default: 0 })
  maximumStock!: number;

  @Column({ type: 'int', default: 0 })
  reorderPoint!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product?: Product;

  @OneToMany(
    () => PriceListItem,
    (priceListItem) => priceListItem.productVariant,
  )
  priceListItems?: PriceListItem[];
}
