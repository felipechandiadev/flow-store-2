import { MigrationInterface, QueryRunner, TableRename } from 'typeorm';

export class RenameGoldPricesToMetalPrices1713700000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename table from gold_prices to metal_prices
    await queryRunner.renameTable(
      'gold_prices',
      'metal_prices',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: rename table back to gold_prices
    await queryRunner.renameTable(
      'metal_prices',
      'gold_prices',
    );
  }
}
