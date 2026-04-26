import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { PersonBankAccount } from '@modules/persons/infrastructure/orm-mappers/person.orm-entity';

export type CompanyBankAccount = PersonBankAccount;

@Entity('companies')
export class CompanyOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'razon_social', type: 'varchar', length: 255 })
  razonSocial!: string;

  @Column({ name: 'nombre_fantasia', type: 'varchar', length: 255, nullable: true })
  nombreFantasia?: string | null;

  @Column({ name: 'business_activity', type: 'varchar', length: 255, nullable: true })
  businessActivity?: string | null;

  @Column({ name: 'rut', type: 'varchar', length: 14, unique: true })
  rut!: string;

  @Column({ type: 'varchar', length: 10, default: 'CLP' })
  defaultCurrency!: string;

  @Column({ type: 'date', nullable: true })
  fiscalYearStart?: Date;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  settings?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  bankAccounts?: CompanyBankAccount[] | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}
