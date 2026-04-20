import { DataSource } from 'typeorm';
import { join } from 'path';
import { readFileSync } from 'fs';
import { AccountingRule } from '@modules/accounting-rules/domain/accounting-rule.entity';

async function main() {
  // load connection from ormconfig or environment variables
  const dataSource = new DataSource({
    type: 'mysql',
    // these values should mirror the development config
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'flowstore',
    entities: [AccountingRule],
    synchronize: false,
  });

  await dataSource.initialize();

  const ruleRepo = dataSource.getRepository(AccountingRule);
  const dbRules = await ruleRepo.find();

  const jsonPath = join(__dirname, 'data', 'accounting-rules.json');
  const jsonText = readFileSync(jsonPath, 'utf8');
  const seedRules: any[] = JSON.parse(jsonText);

  // create a simple lookup based on (transactionType,paymentMethod)
  const byKey = new Map<string, any>();
  seedRules.forEach((r) => {
    const key = `${r.transactionType}::${r.paymentMethod || ''}`;
    byKey.set(key, r);
  });

  console.log('=== Reglas definidas en seed JSON ===');
  seedRules.forEach((r) =>
    console.log(r.ref, r.transactionType, r.paymentMethod || ''),
  );

  console.log('\n=== Reglas que hay en la base de datos ===');
  dbRules.forEach((r) =>
    console.log('(no ref)', r.transactionType, r.paymentMethod || ''),
  );

  console.log('\n=== Comparación ===');
  dbRules.forEach((r) => {
    const key = `${r.transactionType}::${r.paymentMethod || ''}`;
    const seed = byKey.get(key);
    if (!seed) {
      console.log(`DB extra: ${r.transactionType} ${r.paymentMethod || ''}`);
    } else {
      const diffs: string[] = [];
      ['debitAccountId', 'creditAccountId', 'priority', 'isActive'].forEach(
        (k) => {
          if ((r as any)[k] != seed[k]) {
            diffs.push(`${k}: db='${(r as any)[k]}' json='${seed[k]}'`);
          }
        },
      );
      if (diffs.length) {
        console.log(`Mismatch ${seed.ref} -> ${diffs.join(', ')}`);
      }
    }
  });

  seedRules.forEach((r) => {
    const key = `${r.transactionType}::${r.paymentMethod || ''}`;
    const found = dbRules.find(
      (d) => `${d.transactionType}::${d.paymentMethod || ''}` === key,
    );
    if (!found) {
      console.log(`Missing in DB: ${r.ref}`);
    }
  });

  await dataSource.destroy();
}

main().catch((err) => {
  console.error('Error during comparison', err);
  process.exit(1);
});
