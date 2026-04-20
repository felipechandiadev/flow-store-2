import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RemunerationsService } from '../application/remunerations.service';
import { TransactionStatus } from '@modules/transactions/domain/transaction.entity';

@Controller('remunerations')
export class RemunerationsController {
  constructor(private readonly remunerationsService: RemunerationsService) {}

  @Get()
  async getRemunerations(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    try {
      const statusFilter = (status as TransactionStatus) || undefined;
      const data = await this.remunerationsService.getAllRemunerations({
        employeeId,
        status: statusFilter,
      });
      return { success: true, data };
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
  async getRemunerationById(@Param('id') id: string) {
    try {
      const remuneration =
        await this.remunerationsService.getRemunerationById(id);
      if (!remuneration) {
        throw new HttpException(
          { success: false, message: 'Remuneration not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: remuneration };
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

  @Post()
  async createRemuneration(
    @Body()
    data: {
      employeeId: string;
      resultCenterId?: string | null;
      date: string;
      lines: Array<{ typeId: string; amount: number }>;
      userId?: string;
    },
  ) {
    try {
      const remuneration =
        await this.remunerationsService.createRemuneration(data);
      return { success: true, data: remuneration };
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

  @Put(':id')
  async updateRemuneration(
    @Param('id') id: string,
    @Body()
    data: Partial<{
      date: string;
      status: TransactionStatus;
      resultCenterId?: string | null;
      lines: Array<{ typeId: string; amount: number }>;
    }>,
  ) {
    try {
      const updated = await this.remunerationsService.updateRemuneration(
        id,
        data,
      );
      if (!updated) {
        throw new HttpException(
          { success: false, message: 'Remuneration not found' },
          HttpStatus.NOT_FOUND,
        );
      }
      return { success: true, data: updated };
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

  @Delete(':id')
  async deleteRemuneration(@Param('id') id: string) {
    try {
      await this.remunerationsService.deleteRemuneration(id);
      return { success: true };
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
}
