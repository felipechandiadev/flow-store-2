import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillProductMultimediaAndDropImagePath1745024400000
  implements MigrationInterface
{
  name = 'BackfillProductMultimediaAndDropImagePath1745024400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE \`tmp_product_multimedia\` AS
      SELECT
        UUID() AS assetId,
        p.id AS entityId,
        p.imagePath AS imagePath
      FROM \`products\` p
      WHERE p.imagePath IS NOT NULL AND p.imagePath <> ''
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
        JSON_OBJECT('migratedFrom', 'products.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_product_multimedia\` tmp
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
        'product',
        tmp.entityId,
        'primary-image',
        0,
        1,
        JSON_OBJECT('migratedFrom', 'products.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_product_multimedia\` tmp
    `);

    await queryRunner.query('DROP TEMPORARY TABLE \`tmp_product_multimedia\`');

    await queryRunner.query(`
      CREATE TEMPORARY TABLE \`tmp_product_variant_multimedia\` AS
      SELECT
        UUID() AS assetId,
        v.id AS entityId,
        v.imagePath AS imagePath
      FROM \`product_variants\` v
      WHERE v.imagePath IS NOT NULL AND v.imagePath <> ''
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
        JSON_OBJECT('migratedFrom', 'product_variants.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_product_variant_multimedia\` tmp
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
        'product-variant',
        tmp.entityId,
        'primary-image',
        0,
        1,
        JSON_OBJECT('migratedFrom', 'product_variants.imagePath'),
        NOW(),
        NOW()
      FROM \`tmp_product_variant_multimedia\` tmp
    `);

    await queryRunner.query(
      'DROP TEMPORARY TABLE \`tmp_product_variant_multimedia\`',
    );

    await queryRunner.query(
      'ALTER TABLE \`products\` DROP COLUMN \`imagePath\`',
    );
    await queryRunner.query(
      'ALTER TABLE \`product_variants\` DROP COLUMN \`imagePath\`',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE \`products\` ADD COLUMN \`imagePath\` VARCHAR(500) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE \`product_variants\` ADD COLUMN \`imagePath\` VARCHAR(500) NULL',
    );

    await queryRunner.query(`
      UPDATE \`products\` p
      LEFT JOIN (
        SELECT l.entityId, MIN(a.publicUrl) AS publicUrl
        FROM \`multimedia_links\` l
        INNER JOIN \`multimedia_assets\` a ON a.id = l.assetId
        WHERE l.entityType = 'product'
        GROUP BY l.entityId
      ) migrated ON migrated.entityId = p.id
      SET p.imagePath = migrated.publicUrl
    `);

    await queryRunner.query(`
      UPDATE \`product_variants\` v
      LEFT JOIN (
        SELECT l.entityId, MIN(a.publicUrl) AS publicUrl
        FROM \`multimedia_links\` l
        INNER JOIN \`multimedia_assets\` a ON a.id = l.assetId
        WHERE l.entityType = 'product-variant'
        GROUP BY l.entityId
      ) migrated ON migrated.entityId = v.id
      SET v.imagePath = migrated.publicUrl
    `);
  }
}