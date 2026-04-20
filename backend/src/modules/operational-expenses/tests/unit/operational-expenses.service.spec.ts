import { OperationalExpensesService } from '@modules/operational-expenses/application/operational-expenses.service';
import { OperationalExpensesRepository } from '@modules/operational-expenses/infrastructure/operational-expenses.repository';
import { MultimediaServiceAdapter } from '@modules/multimedia/application/services/multimedia.service.adapter';

describe('OperationalExpensesService', () => {
  let service: OperationalExpensesService;
  let repository: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    count: jest.Mock;
  };
  let multimediaService: {
    listByEntity: jest.Mock;
    link: jest.Mock;
    unlink: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    };
    multimediaService = {
      listByEntity: jest.fn(),
      link: jest.fn(),
      unlink: jest.fn(),
    };

    service = new OperationalExpensesService(
      repository as unknown as OperationalExpensesRepository,
      multimediaService as unknown as MultimediaServiceAdapter,
    );
  });

  it('should create expense and link multimedia assets', async () => {
    repository.create.mockResolvedValueOnce({
      id: 'oe-1',
      referenceNumber: 'REF-1',
      metadata: { notes: 'ok' },
    });
    multimediaService.link.mockResolvedValue(undefined);
    multimediaService.listByEntity.mockResolvedValueOnce([
      { id: 'asset-1', publicUrl: '/multimedia/files/a1', mimeType: 'application/pdf', kind: 'document' },
    ]);

    const result = await service.create({
      companyId: 'company-1',
      categoryId: 'category-1',
      referenceNumber: 'REF-1',
      operationDate: '2026-04-19',
      createdBy: 'user-1',
      metadata: {
        notes: 'ok',
      } as any,
      multimediaAssetIds: ['asset-1'],
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { notes: 'ok' },
      }),
    );
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-1',
      entityType: 'operational-expense',
      entityId: 'oe-1',
      usageType: 'attachment',
      sortOrder: 0,
    });
    expect(result).toMatchObject({
      id: 'oe-1',
      mediaAssets: [
        {
          id: 'asset-1',
          publicUrl: '/multimedia/files/a1',
          mimeType: 'application/pdf',
          kind: 'document',
        },
      ],
    });
  });

  it('should update expense and replace linked multimedia assets when provided', async () => {
    repository.findOne.mockResolvedValueOnce({ id: 'oe-1' });
    repository.update.mockResolvedValueOnce({ id: 'oe-1', metadata: { notes: 'updated' } });
    multimediaService.listByEntity
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'old-asset' }])
      .mockResolvedValueOnce([
        { id: 'asset-9', publicUrl: '/multimedia/files/a9', mimeType: 'image/png', kind: 'image' },
      ]);
    multimediaService.unlink.mockResolvedValue(undefined);
    multimediaService.link.mockResolvedValue(undefined);

    const result = await service.update('oe-1', {
      metadata: {
        notes: 'updated',
      } as any,
      multimediaAssetIds: ['asset-9'],
    });

    expect(repository.update).toHaveBeenCalledWith(
      'oe-1',
      expect.objectContaining({
        metadata: { notes: 'updated' },
      }),
    );
    expect(multimediaService.unlink).toHaveBeenCalledWith({
      assetId: 'old-asset',
      entityType: 'operational-expense',
      entityId: 'oe-1',
    });
    expect(multimediaService.link).toHaveBeenCalledWith({
      assetId: 'asset-9',
      entityType: 'operational-expense',
      entityId: 'oe-1',
      usageType: 'attachment',
      sortOrder: 0,
    });
    expect(result).toMatchObject({
      id: 'oe-1',
      mediaAssets: [
        {
          id: 'asset-9',
          publicUrl: '/multimedia/files/a9',
          mimeType: 'image/png',
          kind: 'image',
        },
      ],
    });
  });
});