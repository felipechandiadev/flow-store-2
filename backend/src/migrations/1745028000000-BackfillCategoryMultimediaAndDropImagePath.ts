import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillCategoryMultimediaAndDropImagePath1745028000000
  implements MigrationInterface
{
  name = 'BackfillCategoryMultimediaAndDropImagePath1745028000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE \`tmp_category_multimedia\` AS
      SELECT
        UUID() AS assetId,
        c.id AS entityId,
        c.imagePath AS imagePath
      FROM \`categories\` c
      WHERE c.imagePath IS NOT NULL AND c.imagePath <> ''
    `);

    await queryRunner.query(`
      INSERT INTO \`multimedia_assets\` (
        \`id\`,
        \`originalName\`,
        \`storedName\`,
        \`storageKey\`,
        \`publicUrl\`,
        \`mimeType\`,
        \`kind\`,
        \`storageProvider\`,
        \`size\`,
        \`checksum\`,
        \`status\`,
        \`metadata\`,
        \`createdAt\`,
        \`updatedAt\`
      )
      SELECT
        tmp.assetId,
        SUBSTRING_INDEX(tmp.imagePath, '/', -1),
        SUBSTRING_INDEX(tmp.imagePath, '/', -1),
        tmp.imagePath,
        tmp.imagePath,
        CASE
          WHEN LOWER(tmp.imagePath) LIKE '%.png' THEN 'image/png'
          WHEN LOWER(tmp.imagePath) LIKE '%.jpg' OR LOWER(tmp.imagePath) LIKE '%.jpeg' THEN 'image/jpeg'
          WHEN LOWER(tmp.imagePath) LIKE '%.webp' THEN 'image/webp'
          WHEN LOWER(tmp.imagePath) LIKE '%.pdf' THEN 'application/pdf'
          ELSE 'application/octet-stream'
        END,
        CASE
          WHEN LOWER(tmp.imagePath) LIKE '%.pdf' THEN 'document'
          ELSE 'image'
        END,
        'local',
        0,
        NULL,
        'active',
        JSON_OBJECT('migratedFrom', 'categories.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_category_multimedia\` tmp
    `);

    await queryRunner.query(`
      INSERT INTO \`multimedia_links\` (
        \`id\`,
        \`assetId\`,
        \`entityType\`,
        \`entityId\`,
        \`usageType\`,
        \`sortOrder\`,
        \`isPrimary\`,
        \`metadata\`,
        \`createdAt\`,
        \`updatedAt\`
      )
      SELECT
        UUID(),
        tmp.assetId,
        'category',
        tmp.entityId,
        'primary-image',
        0,
        1,
        JSON_OBJECT('migratedFrom', 'categories.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_category_multimedia\` tmp
    `);

    await queryRunner.query('DROP TEMPORARY TABLE \`tmp_category_multimedia\`');
    await queryRunner.query(
      'ALTER TABLE \`categories\` DROP COLUMN \`imagePath\`',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE \`categories\` ADD COLUMN \`imagePath\` VARCHAR(500) NULL',
    );

    await queryRunner.query(`
      UPDATE \`categories\` c
      LEFT JOIN (
        SELECT l.entityId, MIN(a.publicUrl) AS publicUrl
        FROM \`multimedia_links\` l
        INNER JOIN \`multimedia_assets\` a ON a.id = l.assetId
        WHERE l.entityType = 'category'
        GROUP BY l.entityId
      ) migrated ON migrated.entityId = c.id
      SET c.imagePath = migrated.publicUrl
    `);
  }
}