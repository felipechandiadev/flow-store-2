import { BadRequestException, Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { SearchTransactionsQuery } from '@modules/transactions/application/queries/search-transactions.query';
import { FindTransactionQuery } from '@modules/transactions/application/queries/find-transaction.query';
import { TransactionType, PaymentStatus } from '@modules/transactions/domain/transaction.entity';
import { CreateTransactionDto } from '@modules/transactions/application/dto/create-transaction.dto';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import { SupplierFiscalDocumentPaymentAggregateService } from '@modules/transactions/application/services/supplier-fiscal-document-payment-aggregate.service';
import { SupplierDocumentPaymentPlanService } from '@modules/transactions/application/services/supplier-document-payment-plan.service';
import {
  applyDteNumberToSupplierDocumentDto,
  normalizeDteNumberFromBody,
} from '@modules/transactions/presentation/helpers/supplier-dte-create.helper';

@Controller('supplier-invoices')
export class SupplierInvoicesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly transactionsService: TransactionsService,
    private readonly supplierDocumentPaymentAggregate: SupplierFiscalDocumentPaymentAggregateService,
    private readonly supplierDocumentPaymentPlan: SupplierDocumentPaymentPlanService,
  ) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, parseInt(limit || '25', 10) || 25);
    return this.queryBus.execute(
      new SearchTransactionsQuery(
        p,
        l,
        TransactionType.SUPPLIER_INVOICE,
        status as any,
        undefined,
        undefined,
        undefined,
        undefined,
        supplierId,
        undefined,
        undefined,
        search,
      ),
    );
  }

  @Get(':id/payment-state')
  async paymentState(@Param('id') id: string) {
    return this.supplierDocumentPaymentAggregate.getAggregate(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.queryBus.execute(new FindTransactionQuery(id));
  }

  @Post()
  async create(@Body() body: any) {
    const totalDoc = Number(body.total ?? 0) || 0;
    const payment = this.supplierDocumentPaymentPlan.normalize(
      body.supplierDocumentPayment ?? null,
    );
    const planErr = this.supplierDocumentPaymentPlan.validate(payment, totalDoc);
    if (planErr) {
      throw new BadRequestException(planErr);
    }

    const parentFields = this.supplierDocumentPaymentPlan.resolveFiscalParentFields(
      payment,
      totalDoc,
    );

    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SUPPLIER_INVOICE;
    dto.branchId = body.branchId;
    dto.userId = body.userId;
    dto.supplierId = body.supplierId;
    dto.storageId = body.storageId ?? undefined;
    dto.subtotal = Number(body.subtotal ?? 0) || 0;
    dto.taxAmount = Number(body.taxAmount ?? 0) || 0;
    dto.discountAmount = Number(body.discountAmount ?? 0) || 0;
    dto.total = totalDoc;
    if (parentFields.paymentMethod) {
      dto.paymentMethod = parentFields.paymentMethod;
    }
    dto.paymentStatus = parentFields.paymentStatus;
    dto.amountPaid = parentFields.amountPaid;
    dto.changeAmount = body.changeAmount ?? undefined;
    dto.notes = body.notes ?? undefined;
    dto.externalReference = body.externalReference ?? undefined;
    dto.relatedTransactionId = body.relatedTransactionId ?? undefined;
    const dteNumber = normalizeDteNumberFromBody(body);
    if (!dteNumber) {
      throw new BadRequestException('El folio DTE es obligatorio.');
    }
    applyDteNumberToSupplierDocumentDto(body, dto);
    dto.metadata = {
      ...(body.metadata ?? {}),
      origin: 'SUPPLIER_INVOICE',
      ...(dteNumber ? { dteNumber } : {}),
      links: {
        purchaseOrderId: body?.metadata?.links?.purchaseOrderId ?? null,
        receptionId: body?.metadata?.links?.receptionId ?? null,
        stockInTransactionId: body?.metadata?.links?.stockInTransactionId ?? null,
      },
      plannedPayments: parentFields.plannedPayments,
      supplierDocumentPayment: payment,
    };
    dto.lines = Array.isArray(body.lines) ? body.lines : [];

    const created = await this.transactionsService.createTransaction(dto);
    const fiscalId = created?.id;
    if (!fiscalId) {
      throw new BadRequestException('No se obtuvo id de la factura creada.');
    }

    await this.supplierDocumentPaymentPlan.createPaymentChildren({
      host: {
        branchId: body.branchId,
        userId: body.userId,
        supplierId: body.supplierId,
      },
      fiscalDocId: fiscalId,
      payment,
      paymentOrigin: 'SUPPLIER_INVOICE_PAYMENT',
    });

    return created;
  }
}

