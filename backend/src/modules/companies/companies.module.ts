import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Company } from './domain/company.entity';
import { CompaniesService } from './application/companies.service';
import { CompaniesController } from './presentation/companies.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), CqrsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
