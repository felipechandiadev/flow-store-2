import { Controller, Get } from '@nestjs/common';
import { ShareholdersService } from '../application/shareholders.service';

@Controller('shareholders')
export class ShareholdersController {
  constructor(private readonly shareholdersService: ShareholdersService) {}

  @Get()
  async listShareholders() {
    return await this.shareholdersService.listShareholders();
  }
}
