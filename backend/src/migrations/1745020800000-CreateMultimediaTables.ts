import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMultimediaTables1745020800000
  implements MigrationInterface
{
  name = 'CreateMultimediaTables1745020800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \
      \`multimedia_assets\` (\
        \`id\` VARCHAR(36) NOT NULL,\
        \`originalName\` VARCHAR(255) NOT NULL,\
        \`storedName\` VARCHAR(255) NOT NULL,\
        \`storageKey\` VARCHAR(500) NOT NULL,\
        \`publicUrl\` VARCHAR(500) NOT NULL,\
        \`mimeType\` VARCHAR(100) NOT NULL,\
        \`kind\` VARCHAR(20) NOT NULL DEFAULT 'other',\
        \`storageProvider\` VARCHAR(20) NOT NULL DEFAULT 'local',\
        \`size\` BIGINT NOT NULL,\
        \`checksum\` VARCHAR(128) NULL,\
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'active',\
        \`metadata\` JSON NULL,\
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\
        \`deletedAt\` DATETIME(6) NULL,\
        PRIMARY KEY (\`id\`)\
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \
      \`multimedia_links\` (\
        \`id\` VARCHAR(36) NOT NULL,\
        \`assetId\` VARCHAR(36) NOT NULL,\
        \`entityType\` VARCHAR(100) NOT NULL,\
        \`entityId\` VARCHAR(36) NOT NULL,\
        \`usageType\` VARCHAR(100) NOT NULL,\
        \`sortOrder\` INT NOT NULL DEFAULT 0,\
        \`isPrimary\` TINYINT NOT NULL DEFAULT 0,\
        \`metadata\` JSON NULL,\
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),\
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\
        PRIMARY KEY (\`id\`),\
        CONSTRAINT \`FK_multimedia_links_asset\` FOREIGN KEY (\`assetId\`) REFERENCES \`multimedia_assets\` (\`id\`) ON DELETE CASCADE\
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_multimedia_links_entity\`
      ON \`multimedia_links\` (\`entityType\`, \`entityId\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_multimedia_links_usage\`
      ON \`multimedia_links\` (\`usageType\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_multimedia_assets_provider\`
      ON \`multimedia_assets\` (\`storageProvider\`)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX \`IDX_multimedia_assets_provider\` ON \`multimedia_assets\`',
    );
    await queryRunner.query(
      'DROP INDEX \`IDX_multimedia_links_usage\` ON \`multimedia_links\`',
    );
    await queryRunner.query(
      'DROP INDEX \`IDX_multimedia_links_entity\` ON \`multimedia_links\`',
    );
    await queryRunner.query(
      'ALTER TABLE \`multimedia_links\` DROP FOREIGN KEY \`FK_multimedia_links_asset\`',
    );
    await queryRunner.query('DROP TABLE \`multimedia_links\`');
    await queryRunner.query('DROP TABLE \`multimedia_assets\`');
  }
}