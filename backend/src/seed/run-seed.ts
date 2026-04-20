#!/usr/bin/env ts-node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const seedService = app.get(SeedService);

  try {
    await seedService.seedFlowStore();
    console.log('\n✅ Seed ejecutado exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error ejecutando seed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
