import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInstallmentsTable1708595200000 implements MigrationInterface {
  name = 'CreateInstallmentsTable1708595200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create installments table
    await queryRunner.query(`
            CREATE TABLE \`installments\` (
                \`id\` VARCHAR(36) NOT NULL DEFAULT (UUID()),
                \`saleTransactionId\` VARCHAR(36) NOT NULL,
                \`installmentNumber\` INT NOT NULL,
                \`totalInstallments\` INT NOT NULL,
                \`amount\` DECIMAL(15,2) NOT NULL,
                \`dueDate\` DATE NOT NULL,
                \`amountPaid\` DECIMAL(15,2) NOT NULL DEFAULT 0,
                \`status\` ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
                \`paymentTransactionId\` VARCHAR(36) NULL,
                \`metadata\` JSON NULL,
                \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        `);

    // Create indexes
    await queryRunner.query(`
            CREATE INDEX \`IDX_installments_sale_number\` 
            ON \`installments\` (\`saleTransactionId\`, \`installmentNumber\`)
        `);

    await queryRunner.query(`
            CREATE INDEX \`IDX_installments_dueDate\` 
            ON \`installments\` (\`dueDate\`)
        `);

    await queryRunner.query(`
            CREATE INDEX \`IDX_installments_status\` 
            ON \`installments\` (\`status\`)
        `);

    // Create foreign keys
    // Note: Foreign keys temporarily disabled due to column type compatibility issues
    // TODO: Fix foreign key constraints after schema normalization
    /*
        await queryRunner.query(`
            ALTER TABLE \`installments\`
            ADD CONSTRAINT \`FK_installments_sale_transaction\`
            FOREIGN KEY (\`saleTransactionId\`) REFERENCES \`transactions\`(\`id\`) 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE \`installments\`
            ADD CONSTRAINT \`FK_installments_payment_transaction\`
            FOREIGN KEY (\`paymentTransactionId\`) REFERENCES \`transactions\`(\`id\`) 
            ON DELETE SET NULL ON UPDATE NO ACTION
        `);
        */
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
            ALTER TABLE \`installments\` 
            DROP FOREIGN KEY \`FK_installments_payment_transaction\`
        `);

    await queryRunner.query(`
            ALTER TABLE \`installments\` 
            DROP FOREIGN KEY \`FK_installments_sale_transaction\`
        `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX \`IDX_installments_status\` ON \`installments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_installments_dueDate\` ON \`installments\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_installments_sale_number\` ON \`installments\``,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE \`installments\``);
  }
}
