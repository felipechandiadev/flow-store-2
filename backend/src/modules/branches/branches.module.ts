import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Branch } from './domain/branch.entity';
import { BranchesService } from './application/branches.service';
import { BranchesController } from './presentation/branches.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Branch]), CqrsModule],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
