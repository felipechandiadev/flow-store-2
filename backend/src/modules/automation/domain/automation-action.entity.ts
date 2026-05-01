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
import { AutomationRule } from './automation-rule.entity';
import { AutomationActionType } from './automation-action-type.enum';

@Entity('automation_actions')
@Index(['ruleId', 'sortOrder'], { unique: true })
export class AutomationAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ruleId!: string;

  @Column({ type: 'enum', enum: AutomationActionType })
  type!: AutomationActionType;

  /** JSON params dependientes del tipo de acción */
  @Column({ type: 'json', nullable: true })
  params?: Record<string, any> | null;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => AutomationRule, (r) => r.actions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule!: AutomationRule;
}

