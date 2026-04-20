import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { Shareholder } from './domain/shareholder.entity';
import { ShareholdersService } from './application/shareholders.service';
import { ShareholdersController } from './presentation/shareholders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Shareholder]), CqrsModule],
  controllers: [ShareholdersController],
  providers: [ShareholdersService],
  exports: [ShareholdersService],
})
export class ShareholdersModule {}
