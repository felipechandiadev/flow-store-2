import 'reflect-metadata';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Contador atómico por sucursal + tipo de transacción + año calendario
 * para folios `SIGLA-YY-00001`.
 */
@Entity('document_sequences')
@Unique('UQ_document_sequences_scope', ['branchId', 'transactionType', 'year'])
export class DocumentSequence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  branchId!: string;

  @Column({ type: 'varchar', length: 64 })
  transactionType!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'int', default: 0 })
  lastNumber!: number;
}
