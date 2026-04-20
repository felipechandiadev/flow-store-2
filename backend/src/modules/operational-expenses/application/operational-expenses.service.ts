import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { OperationalExpensesRepository } from '../infrastructure/operational-expenses.repository';
import { CreateOperationalExpenseDto } from './dto/create-operational-expense.dto';
import { UpdateOperationalExpenseDto } from './dto/update-operational-expense.dto';
import { OperationalExpense } from '../domain/operational-expense.entity';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

@Injectable()
export class OperationalExpensesService {
  private readonly logger = new Logger(OperationalExpensesService.name);

  constructor(
    private readonly repository: OperationalExpensesRepository,
    private readonly multimediaService: MultimediaServiceAdapter,
  ) {}

  async findAll(params?: {
    limit?: number;
    offset?: number;
    companyId?: string;
    branchId?: string;
    status?: string;
  }): Promise<{ data: OperationalExpense[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      companyId,
      branchId,
      status,
    } = params || {};

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.repository.findAll({
        where,
        take: limit,
        skip: offset,
        relations: [
          'company',
          'branch',
          'resultCenter',
          'category',
          'supplier',
          'employee',
        ],
        order: { createdAt: 'DESC' },
      }),
      this.repository.count({ where }),
    ]);

    const enrichedData = await Promise.all(
      data.map(async (expense) => this.attachMediaAssets(expense)),
    );

    return { data: enrichedData, total };
  }

  async findOne(id: string): Promise<OperationalExpense> {
    const expense = await this.repository.findOne(id);
    if (!expense) {
      throw new NotFoundException(`Operational expense ${id} not found`);
    }
    return this.attachMediaAssets(expense);
  }

  async create(dto: CreateOperationalExpenseDto): Promise<OperationalExpense> {
    this.logger.log(`Creating operational expense: ${dto.referenceNumber}`);
    const { multimediaAssetIds, ...expenseData } = dto;
    const created = await this.repository.create(expenseData);

    if (multimediaAssetIds?.length) {
      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: created.id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    return this.attachMediaAssets(created);
  }

  async update(
    id: string,
    dto: UpdateOperationalExpenseDto,
  ): Promise<OperationalExpense> {
    await this.findOne(id);
    this.logger.log(`Updating operational expense ${id}`);
    const { multimediaAssetIds, ...expenseData } = dto;
    const updated = await this.repository.update(id, expenseData);

    if (multimediaAssetIds) {
      const existingAssets = await this.multimediaService.listByEntity(
        'operational-expense',
        id,
      );

      await Promise.all(
        existingAssets.map((asset) =>
          this.multimediaService.unlink({
            assetId: asset.id,
            entityType: 'operational-expense',
            entityId: id,
          }),
        ),
      );

      await Promise.all(
        multimediaAssetIds.map((assetId, index) =>
          this.multimediaService.link({
            assetId,
            entityType: 'operational-expense',
            entityId: id,
            usageType: 'attachment',
            sortOrder: index,
          }),
        ),
      );
    }

    return this.attachMediaAssets(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    this.logger.log(`Removing operational expense ${id}`);
    await this.repository.remove(id);
  }

  private async attachMediaAssets(
    expense: OperationalExpense,
  ): Promise<OperationalExpense> {
    const assets = await this.multimediaService.listByEntity(
      'operational-expense',
      expense.id,
    );

    expense.mediaAssets = assets.map((asset) => ({
      id: asset.id,
      publicUrl: asset.publicUrl,
      mimeType: asset.mimeType,
      kind: asset.kind,
    }));

    return expense;
  }
}
