import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from '../config/typeorm.config';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';
import { Company } from '@modules/companies/domain/company.entity';

/**
 * Misma conexión y entidades que el API: el esquema lo define TypeORM vía
 * `DB_SYNCHRONIZE` (ver `typeorm.config.ts`). Este módulo solo aporta repositorios para el script de seed.
 */
@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: typeOrmConfig,
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([User, Person, Company]),
  ],
})
export class MinimalSeedModule {}
