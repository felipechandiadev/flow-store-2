import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AccountingAccountsServiceAdapter } from '../application/accounting-accounts.service.adapter';

@Controller('accounting-accounts')
export class AccountingAccountsController {
  constructor(
    private readonly accountingAccountsService: AccountingAccountsServiceAdapter,
  ) {}

  @Get()
  async getAllAccounts() {
    try {
      const accounts = await this.accountingAccountsService.getAllAccounts();

      return {
        success: true,
        data: accounts,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getAccountById(@Param('id') id: string) {
    try {
      const account = await this.accountingAccountsService.getAccountById(id);

      if (!account) {
        throw new HttpException(
          {
            success: false,
            message: 'Accounting account not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: account,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
