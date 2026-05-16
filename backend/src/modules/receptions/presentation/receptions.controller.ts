import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ReceptionsService } from '../application/receptions.service';
import { CreateReceptionDto } from '../application/dto/create-reception.dto';

@Controller('receptions')
export class ReceptionsController {
  constructor(private readonly receptionsService: ReceptionsService) {}

  @Get()
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : 25;
    const o = offset ? parseInt(offset, 10) : 0;
    return this.receptionsService.search({ limit: l, offset: o });
  }

  @Get('resolve')
  async resolveBySupplierDocument(
    @Query('supplierId') supplierId?: string,
    @Query('documentRef') documentRef?: string,
  ) {
    const sid = String(supplierId ?? '').trim();
    const ref = String(documentRef ?? '').trim();
    if (!sid || !ref) {
      throw new BadRequestException('supplierId and documentRef are required');
    }
    return this.receptionsService.getBySupplierDocumentRef(sid, ref);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.receptionsService.getById(id);
  }

  @Post()
  async create(@Body() body: CreateReceptionDto) {
    return this.receptionsService.create(body);
  }

  @Post('direct')
  async createDirect(@Body() body: CreateReceptionDto) {
    return this.receptionsService.createDirect(body);
  }

  @Post('from-purchase-order')
  async createFromPurchaseOrder(@Body() body: CreateReceptionDto) {
    return this.receptionsService.createFromPurchaseOrder(body);
  }
}
