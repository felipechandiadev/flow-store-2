import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddParentTransactionId1740248276000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add parentTransactionId column to transactions table
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'parentTransactionId',
        type: 'char',
        length: '36',
        isNullable: true,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'FK_transactions_parentTransactionId',
        columnNames: ['parentTransactionId'],
        referencedTableName: 'transactions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key first
    await queryRunner.dropForeignKey(
      'transactions',
      'FK_transactions_parentTransactionId',
    );

    // Drop column
    await queryRunner.dropColumn('transactions', 'parentTransactionId');
  }
}
