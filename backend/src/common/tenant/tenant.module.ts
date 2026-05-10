import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/domain/user.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { TenantGuard } from './tenant.guard';
import { TenantInterceptor } from './tenant.interceptor';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([User, Company])],
  providers: [
    TenantGuard,
    TenantInterceptor,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
  exports: [TenantGuard, TenantInterceptor],
})
export class TenantModule {}
