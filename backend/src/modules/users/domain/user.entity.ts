import 'reflect-metadata';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

@Entity('users')
@Check(
  'users_role_company_chk',
  `(rol = 'ADMIN' AND company_id IS NULL) OR (rol = 'OPERATOR' AND company_id IS NOT NULL)`,
)
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar')
  userName!: string;

  @Column('varchar')
  pass!: string;

  @Column('varchar')
  mail!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.OPERATOR,
  })
  rol!: UserRole;

  /**
   * Empresa a la que pertenece el usuario.
   * - ADMIN: NULL (super-admin global, puede operar sobre cualquier empresa).
   * - OPERATOR: NOT NULL (atado a una sola empresa, ej. cajero).
   * Validado por el CHECK constraint `users_role_company_chk`.
   */
  @Index('idx_users_company_id')
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ManyToOne(() => Person, { nullable: true, onDelete: 'SET NULL' })
  person?: Person;

  @DeleteDateColumn()
  deletedAt?: Date;
}
