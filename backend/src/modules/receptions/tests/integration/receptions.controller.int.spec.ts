import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { ReceptionsController } from '@modules/receptions/presentation/receptions.controller';
import { ReceptionsService } from '@modules/receptions/application/receptions.service';

describe('ReceptionsController (Integration)', () => {
  let app: INestApplication;
  let service: {
    search: jest.Mock;
    getById: jest.Mock;
    create: jest.Mock;
    createDirect: jest.Mock;
    createFromPurchaseOrder: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      search: jest.fn(),
      getById: jest.fn(),
      create: jest.fn().mockResolvedValue({ success: true }),
      createDirect: jest.fn().mockResolvedValue({ success: true }),
      createFromPurchaseOrder: jest.fn().mockResolvedValue({ success: true }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ReceptionsController],
      providers: [
        {
          provide: ReceptionsService,
          useValue: service,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reject unknown fields on create', async () => {
    const response = await request(app.getHttpServer())
      .post('/receptions')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        imagePath: '/legacy/reception.png',
      })
      .expect(400);

    expect(response.body.message).toContain('property imagePath should not exist');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('should accept declared fields on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        lines: [
          {
            quantity: 2,
            unitPrice: 100,
          },
        ],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        lines: [
          expect.objectContaining({
            quantity: 2,
            unitPrice: 100,
          }),
        ],
      }),
    );
  });

  it('should accept reference and documentType on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        reference: 'FOLIO-999',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: 'FOLIO-999',
        documentType: 'invoice',
      }),
    );
  });

  it('should accept supplierDocumentPayment and supplierFiscalAmounts on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'invoice',
        lines: [{ quantity: 1, unitPrice: 10 }],
        supplierDocumentPayment: {
          mode: 'PENDING',
          paidLines: [],
          scheduledLines: [],
        },
        supplierFiscalAmounts: {
          subtotalNeto: 10,
          taxAmount: 0,
          total: 10,
          taxId: null,
          taxRatePct: 0,
        },
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierDocumentPayment: expect.objectContaining({ mode: 'PENDING' }),
        supplierFiscalAmounts: expect.objectContaining({ total: 10 }),
      }),
    );
  });

  it('should reject invalid documentType on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'not-a-dte',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(400);

    expect(service.createDirect).not.toHaveBeenCalled();
  });

  it('should accept documentType other on createDirect', async () => {
    await request(app.getHttpServer())
      .post('/receptions/direct')
      .send({
        storageId: '11111111-1111-4111-8111-111111111111',
        branchId: '22222222-2222-4222-8222-222222222222',
        documentType: 'other',
        lines: [{ quantity: 1, unitPrice: 10 }],
      })
      .expect(201);

    expect(service.createDirect).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'other',
      }),
    );
  });
});