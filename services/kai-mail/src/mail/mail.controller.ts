import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { MailService, type SendMailDto } from './mail.service';

@Controller('v1/mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Post('send')
  async send(
    @Headers('authorization') auth: string | undefined,
    @Body() body: SendMailDto,
  ) {
    const expected = process.env.KAI_MAIL_API_KEY?.trim();
    if (expected) {
      const token = auth?.replace(/^Bearer\s+/i, '').trim();
      if (token !== expected) {
        throw new UnauthorizedException('Invalid API key');
      }
    }
    return this.mail.enqueue(body);
  }
}
