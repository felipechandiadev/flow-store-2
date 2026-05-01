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
import { Company } from '@modules/companies/domain/company.entity';
import { ResultCenter } from '@modules/result-centers/domain/result-center.entity';
import { ExpenseCategoryOperationalGroup } from './expense-category-operational-group.enum';

@Entity('expense_categories')
export class ExpenseCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  /** Opcional en alta; si falta, el servicio asigna un código único (prefijo EC + UUID). */
  @Column({ type: 'varchar', length: 50, unique: true, nullable: true })
  code?: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({
    name: 'operational_expense_group',
    type: 'enum',
    enum: ExpenseCategoryOperationalGroup,
    default: ExpenseCategoryOperationalGroup.PERDIDAS_AJUSTES_OPERATIVOS,
  })
  operationalExpenseGroup!: ExpenseCategoryOperationalGroup;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  requiresApproval!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  approvalThreshold!: string;

  @Column({ type: 'uuid', nullable: true })
  defaultResultCenterId?: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'json', nullable: true })
  examples?: string[] | null;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt?: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @ManyToOne(() => ResultCenter, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'defaultResultCenterId' })
  defaultResultCenter?: ResultCenter | null;
}
