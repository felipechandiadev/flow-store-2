import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { User } from '@modules/users/domain/user.entity';
import { Person } from '@modules/persons/domain/person.entity';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService): TypeOrmModuleOptions => ({
        type: configService.database.type as any,
        host: configService.database.host,
        port: configService.database.port,
        username: configService.database.username,
        password: configService.database.password,
        database: configService.database.database,
        entities: [User, Person] as any,
        synchronize: false,
        logging: configService.database.logging,
        ...(configService.database.ssl && {
          ssl: {
            rejectUnauthorized: false,
          },
        }),
        extra: {
          connectionLimit: configService.database.maxConnections,
          acquireTimeout: configService.database.connectionTimeout,
          timeout: configService.database.connectionTimeout,
        } as any,
      }),
      inject: [AppConfigService],
    }),
    TypeOrmModule.forFeature([User, Person]),
  ],
})
export class MinimalSeedModule {}

