import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { CustomersServiceAdapter } from '../application/customers.service.adapter';
import { CreateCustomerDto } from '../application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../application/dto/update-customer.dto';
import { SearchCustomersDto } from '../application/dto/search-customers.dto';
import { InstallmentService } from '@modules/installments/application/services/installment.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersServiceAdapter,
    private readonly installmentService: InstallmentService,
  ) {}

  @Get('search')
  async search(@Query() searchDto: SearchCustomersDto) {
    return this.customersService.search(searchDto);
  }

  @Get()
  async list(@Query() searchDto: SearchCustomersDto) {
    return this.customersService.search(searchDto);
  }

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }

  @Get(':id/pending-payments')
  async getPendingPayments(@Param('id') id: string) {
    return this.customersService.getPendingPayments(id);
  }

  @Get(':id/pending-quotas')
  async getPendingQuotas(@Param('id') id: string) {
    const result = await this.installmentService.getAccountsReceivable({
      customerId: id,
      includePaid: false,
      page: 1,
      pageSize: 200,
    });

    const quotas = (result.rows ?? []).map((inst: any) => ({
      id: inst.id,
      transactionId: inst.sourceTransactionId || inst.saleTransactionId || null,
      documentNumber:
        inst.saleTransaction?.documentNumber ??
        inst.sourceTransactionId ??
        null,
      amount: Number(inst.amount ?? 0),
      dueDate: inst.dueDate,
      createdAt: inst.saleTransaction?.createdAt ?? inst.createdAt,
    }));

    return { success: true, quotas };
  }

  @Get(':id/purchases')
  async getPurchases(@Param('id') id: string) {
    const purchases = await this.customersService.getPurchases(id);
    return { success: true, purchases };
  }

  @Get(':id/purchases/:status')
  async getPurchasesByStatus(
    @Param('id') id: string,
    @Param('status') status: string,
  ) {
    const purchases = await this.customersService.getPurchases(id, status);
    return { success: true, purchases };
  }

  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    const payments = await this.customersService.getPayments(id);
    return { success: true, payments };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { customer: await this.customersService.findOne(id) };
  }
}
