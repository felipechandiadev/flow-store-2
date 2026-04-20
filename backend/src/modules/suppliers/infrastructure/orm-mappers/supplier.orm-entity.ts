import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PersonOrmEntity } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';
export enum SupplierType {
  MANUFACTURER = 'MANUFACTURER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  WHOLESALER = 'WHOLESALER',
  LOCAL = 'LOCAL',
}

@Entity('suppliers')
export class SupplierOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  personId!: string;

  @Column({ type: 'varchar', length: 32, default: SupplierType.LOCAL })
  supplierType!: SupplierType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alias?: string;

  @Column({ type: 'int', default: 0 })
  defaultPaymentTermDays!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => PersonOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'personId' })
  person?: PersonOrmEntity;
}
