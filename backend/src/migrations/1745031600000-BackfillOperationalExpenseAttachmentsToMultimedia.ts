import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillOperationalExpenseAttachmentsToMultimedia1745031600000
  implements MigrationInterface
{
  name = 'BackfillOperationalExpenseAttachmentsToMultimedia1745031600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE \`tmp_operational_expense_multimedia\` AS
      SELECT
        UUID() AS assetId,
        oe.id AS entityId,
        attachments.attachment AS attachmentPath,
        attachments.sortOrder AS sortOrder
      FROM \`operational_expenses\` oe
      JOIN JSON_TABLE(
        COALESCE(JSON_EXTRACT(oe.metadata, '$.attachments'), JSON_ARRAY()),
        '$[*]' COLUMNS (
          sortOrder FOR ORDINALITY,
          attachment VARCHAR(500) PATH '$'
        )
      ) attachments
      WHERE JSON_CONTAINS_PATH(oe.metadata, 'one', '$.attachments')
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
        SUBSTRING_INDEX(tmp.attachmentPath, '/', -1),
        SUBSTRING_INDEX(tmp.attachmentPath, '/', -1),
        tmp.attachmentPath,
        tmp.attachmentPath,
        CASE
          WHEN LOWER(tmp.attachmentPath) LIKE '%.png' THEN 'image/png'
          WHEN LOWER(tmp.attachmentPath) LIKE '%.jpg' OR LOWER(tmp.attachmentPath) LIKE '%.jpeg' THEN 'image/jpeg'
          WHEN LOWER(tmp.attachmentPath) LIKE '%.webp' THEN 'image/webp'
          WHEN LOWER(tmp.attachmentPath) LIKE '%.pdf' THEN 'application/pdf'
          ELSE 'application/octet-stream'
        END,
        CASE
          WHEN LOWER(tmp.attachmentPath) LIKE '%.pdf' THEN 'document'
          ELSE 'image'
        END,
        'local',
        0,
        NULL,
        'active',
        JSON_OBJECT('migratedFrom', 'operational_expenses.metadata.attachments'),
        NOW(),
        NOW()
      FROM \`tmp_operational_expense_multimedia\` tmp
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
        'operational-expense',
        tmp.entityId,
        'attachment',
        GREATEST(tmp.sortOrder - 1, 0),
        CASE WHEN tmp.sortOrder = 1 THEN 1 ELSE 0 END,
        JSON_OBJECT('migratedFrom', 'operational_expenses.metadata.attachments'),
        NOW(),
        NOW()
      FROM \`tmp_operational_expense_multimedia\` tmp
    `);

    await queryRunner.query(
      'DROP TEMPORARY TABLE \`tmp_operational_expense_multimedia\`',
    );

    await queryRunner.query(`
      UPDATE \`operational_expenses\`
      SET \`metadata\` = CASE
        WHEN JSON_LENGTH(JSON_REMOVE(COALESCE(\`metadata\`, JSON_OBJECT()), '$.attachments')) = 0
          THEN NULL
        ELSE JSON_REMOVE(COALESCE(\`metadata\`, JSON_OBJECT()), '$.attachments')
      END
      WHERE JSON_CONTAINS_PATH(\`metadata\`, 'one', '$.attachments')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE \`operational_expenses\` oe
      LEFT JOIN (
        SELECT
          l.entityId,
          JSON_ARRAYAGG(a.publicUrl ORDER BY l.sortOrder ASC) AS attachments
        FROM \`multimedia_links\` l
        INNER JOIN \`multimedia_assets\` a ON a.id = l.assetId
        WHERE l.entityType = 'operational-expense'
        GROUP BY l.entityId
      ) migrated ON migrated.entityId = oe.id
      SET oe.metadata = CASE
        WHEN migrated.attachments IS NULL THEN oe.metadata
        WHEN oe.metadata IS NULL THEN JSON_OBJECT('attachments', migrated.attachments)
        ELSE JSON_SET(oe.metadata, '$.attachments', migrated.attachments)
      END
    `);
  }
}