import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { MailProcessor } from './mail.processor';

@Module({
  controllers: [MailController],
  providers: [MailService, MailProcessor],
})
export class MailModule {}
