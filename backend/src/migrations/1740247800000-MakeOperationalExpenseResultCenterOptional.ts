import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeOperationalExpenseResultCenterOptional1740247800000 implements MigrationInterface {
  name = 'MakeOperationalExpenseResultCenterOptional1740247800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists
    const hasTable = await queryRunner.hasTable('operational_expenses');
    if (!hasTable) {
      console.log(
        '[Migration] Table operational_expenses does not exist, skipping migration',
      );
      return;
    }

    // Drop the foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` DROP FOREIGN KEY \`FK_1101c24f34234bc3f890acdab51\``,
    );

    // Make resultCenterId nullable
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` MODIFY COLUMN \`resultCenterId\` char(36) NULL`,
    );

    // Re-add the foreign key constraint with ON DELETE SET NULL
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` ADD CONSTRAINT \`FK_1101c24f34234bc3f890acdab51\` 
             FOREIGN KEY (\`resultCenterId\`) REFERENCES \`result_centers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    console.log(
      '[Migration] Made resultCenterId nullable in operational_expenses table',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if the table exists
    const hasTable = await queryRunner.hasTable('operational_expenses');
    if (!hasTable) {
      console.log(
        '[Migration] Table operational_expenses does not exist, skipping migration rollback',
      );
      return;
    }

    // Drop the foreign key constraint first
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` DROP FOREIGN KEY \`FK_1101c24f34234bc3f890acdab51\``,
    );

    // Make resultCenterId NOT NULL again
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` MODIFY COLUMN \`resultCenterId\` char(36) NOT NULL`,
    );

    // Re-add the foreign key constraint with ON DELETE RESTRICT
    await queryRunner.query(
      `ALTER TABLE \`operational_expenses\` ADD CONSTRAINT \`FK_1101c24f34234bc3f890acdab51\` 
             FOREIGN KEY (\`resultCenterId\`) REFERENCES \`result_centers\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    console.log(
      '[Migration] Made resultCenterId NOT NULL in operational_expenses table',
    );
  }
}
