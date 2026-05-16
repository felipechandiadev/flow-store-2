import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Reception } from '../domain/reception.entity';
import { ReceptionLine } from '../domain/reception-line.entity';
import { Storage } from '@modules/storages/domain/storage.entity';
import { Branch } from '@modules/branches/domain/branch.entity';
import { Company } from '@modules/companies/domain/company.entity';
import { User } from '@modules/users/domain/user.entity';
import { ProductVariantsService } from '@modules/product-variants/application/product-variants.service';
import { TransactionsService } from '@modules/transactions/application/transactions.service';
import {
  CreateTransactionDto,
  CreateTransactionLineDto,
} from '@modules/transactions/application/dto/create-transaction.dto';
import {
  TransactionStatus,
  TransactionType,
  PaymentMethod,
  PaymentStatus,
} from '@modules/transactions/domain/transaction.entity';
import { applyDteNumberToSupplierDocumentDto } from '@modules/transactions/presentation/helpers/supplier-dte-create.helper';
@Injectable()
export class ReceptionsService {
  private logger = new Logger(ReceptionsService.name);

  constructor(
    @InjectRepository(Reception)
    private readonly receptionRepo: Repository<Reception>,
    @InjectRepository(ReceptionLine)
    private readonly receptionLineRepo: Repository<ReceptionLine>,
    @InjectRepository(Storage)
    private readonly storageRepo: Repository<Storage>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly transactionsService: TransactionsService,
    private readonly variantsService: ProductVariantsService,
  ) {}

  private async enrichReceptionLines(reception: any) {
    if (!reception || !Array.isArray(reception.lines)) return;
    for (const l of reception.lines) {
      try {
        if (l.productVariantId) {
          const v = await this.variantsService.findOne(
            String(l.productVariantId),
          );
          if (v) {
            l.sku = l.sku || v.sku || l.sku;
            l.productName = l.productName || v.product?.name || l.productName;
            l.variantName = l.variantName || v.variantName || l.variantName;
          }
        }
      } catch (err) {
        // best-effort enrichment; ignore errors
      }
    }
  }

  private getSupplierDisplayName(reception: any): string | null {
    const supplier = reception?.supplier;
    if (!supplier) return null;
    const alias =
      typeof supplier.alias === 'string' ? supplier.alias.trim() : '';
    if (alias) return alias;
    const person = supplier.person;
    const businessName =
      typeof person?.businessName === 'string'
        ? person.businessName.trim()
        : '';
    if (businessName) return businessName;
    const firstName =
      typeof person?.firstName === 'string' ? person.firstName.trim() : '';
    const lastName =
      typeof person?.lastName === 'string' ? person.lastName.trim() : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return fullName || null;
  }

  private getStorageDisplayName(reception: any): string | null {
    const name =
      typeof reception?.storage?.name === 'string'
        ? reception.storage.name.trim()
        : '';
    return name || null;
  }

  private async buildLineSnapshot(line: any) {
    const variantId =
      line?.productVariantId ||
      line?.variantId ||
      line?.productVariant?.id ||
      null;
    const baseName =
      typeof line?.productName === 'string' ? line.productName.trim() : '';
    let productName = baseName || '';
    let sku = typeof line?.sku === 'string' ? line.sku : undefined;
    let variantName =
      typeof line?.variantName === 'string' ? line.variantName : undefined;
    let productId = line?.productId || line?.product?.id || null;

    if (variantId && this.variantsService) {
      try {
        const v = await this.variantsService.findOne(String(variantId));
        if (v) {
          sku = sku || v.sku || sku;
          productName = productName || v.product?.name || productName;
          variantName = variantName || v.variantName || variantName;
          productId = productId || v.product?.id || productId;
        }
      } catch (err) {
        // ignore lookup errors
      }
    }

    return {
      productId: productId || undefined,
      productVariantId: variantId || undefined,
      productName: productName || 'Item',
      sku,
      variantName,
    };
  }

  private mapReceptionListItem(reception: any) {
    const documentNumber =
      reception?.dteNumber ||
      reception?.documentNumber ||
      reception?.reference ||
      (typeof reception?.id === 'string' ? reception.id : null);

    return {
      ...reception,
      transactionType: TransactionType.ADJUSTMENT_IN,
      status: TransactionStatus.RECEIVED,
      supplierName: this.getSupplierDisplayName(reception),
      storageName: this.getStorageDisplayName(reception),
      documentNumber,
      purchaseOrderNumber:
        reception?.type === 'from-purchase-order'
          ? reception?.documentNumber || reception?.reference || null
          : null,
    };
  }

  async search(
    opts: { limit?: number; offset?: number } = { limit: 25, offset: 0 },
  ) {
    const { limit = 25, offset = 0 } = opts;

    const [rows, count] = await this.receptionRepo.findAndCount({
      relations: [
        'lines',
        'storage',
        'branch',
        'supplier',
        'supplier.person',
        'user',
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Enrich returned rows with SKU/product names
    for (const r of rows) {
      // do not block on failures

      await this.enrichReceptionLines(r);
    }

    return {
      rows: rows.map((row) => this.mapReceptionListItem(row)),
      count,
      limit,
      offset,
    };
  }

  async getById(id: string) {
    const found = await this.receptionRepo.findOne({
      where: { id },
      relations: [
        'lines',
        'storage',
        'branch',
        'supplier',
        'supplier.person',
        'user',
      ],
    });

    if (!found) throw new NotFoundException('Reception not found');
    await this.enrichReceptionLines(found);
    return this.mapReceptionListItem(found);
  }

  /**
   * Última recepción del proveedor cuya referencia, número de documento o DTE coincide con `documentRef`.
   * Usado en devoluciones para localizar la recepción asociada a una factura sin usar líneas del DTE.
   */
  async getBySupplierDocumentRef(supplierId: string, documentRef: string) {
    const sid = String(supplierId ?? '').trim();
    const ref = String(documentRef ?? '').trim();
    if (!sid) {
      throw new BadRequestException('supplierId is required');
    }
    if (!ref) {
      throw new BadRequestException('documentRef is required');
    }

    const found = await this.receptionRepo
      .createQueryBuilder('r')
      .where('r.supplierId = :sid', { sid })
      .andWhere(
        '(r.reference = :ref OR r.documentNumber = :ref OR r.dteNumber = :ref)',
        { ref },
      )
      .orderBy('r.createdAt', 'DESC')
      .getOne();

    if (!found?.id) {
      throw new NotFoundException(
        'No se encontró recepción para ese proveedor y referencia de documento.',
      );
    }
    return this.getById(String(found.id));
  }

  private async maybeCreateStockInTransaction(reception: any) {
    try {
      // Attempt to resolve branchId from storage if not provided
      let branchId = reception.branchId;
      if (!branchId && reception.storageId) {
        const storage = await this.storageRepo.findOne({
          where: { id: reception.storageId },
        });
        if (storage && storage.branchId) branchId = storage.branchId;
      }

      if (!branchId) {
        // Try to fallback to any available branch (best-effort)
        try {
          // Prefer a branch that has a companyId set (required by TransactionsService)
          const branchWithCompany = await this.branchRepo.findOne({
            where: { companyId: Not(IsNull()) },
          });
          if (branchWithCompany && branchWithCompany.id) {
            branchId = branchWithCompany.id;
            this.logger.log(
              `Falling back to branch ${branchId} (with company) for reception transaction`,
            );
          } else {
            // Last resort: any branch
            const anyBranch = await this.branchRepo.findOne({ where: {} });
            if (anyBranch && anyBranch.id) {
              // If this branch has no companyId, try to set it from the last company in DB
              if (!anyBranch.companyId) {
                try {
                  const lastCompany = await this.companyRepo.findOne({
                    order: { createdAt: 'DESC' } as any,
                  });
                  if (lastCompany && lastCompany.id) {
                    await this.branchRepo.update(anyBranch.id, {
                      companyId: lastCompany.id,
                    } as any);
                    this.logger.log(
                      `Assigned company ${lastCompany.id} to branch ${anyBranch.id} to allow transaction creation`,
                    );
                    branchId = anyBranch.id;
                  } else {
                    branchId = anyBranch.id;
                    this.logger.log(
                      `Falling back to branch ${branchId} for reception transaction (no company found)`,
                    );
                  }
                } catch (err) {
                  // ignore update errors but still fallback
                  branchId = anyBranch.id;
                  this.logger.warn(
                    `Could not assign company to branch ${anyBranch.id}: ${(err as Error).message}`,
                  );
                }
              } else {
                branchId = anyBranch.id;
                this.logger.log(
                  `Falling back to branch ${branchId} for reception transaction`,
                );
              }
            }
          }
        } catch (err) {
          // ignore
        }
      }

      if (!branchId) {
        this.logger.warn(
          'Could not determine branchId for reception, skipping transaction creation',
        );
        return null;
      }

      // Build transaction DTO (stock movement)
      const dto = new CreateTransactionDto();
      dto.transactionType = TransactionType.ADJUSTMENT_IN;
      dto.branchId = branchId;
      let resolvedUserId = reception.userId;
      if (!resolvedUserId) {
        const fallbackUser = await this.userRepo.findOne({ where: {} });
        if (fallbackUser?.id) {
          resolvedUserId = fallbackUser.id;
          this.logger.log(
            `Falling back to user ${resolvedUserId} for reception transaction`,
          );
        }
      }

      if (!resolvedUserId) {
        this.logger.warn(
          'Could not determine userId for reception, skipping transaction creation',
        );
        return null;
      }

      dto.userId = resolvedUserId;
      // ADJUSTMENT_IN is an inventory movement; keep supplier linkage in metadata for traceability
      dto.supplierId = undefined as any;
      dto.storageId = reception.storageId || null;
      dto.subtotal = 0;
      dto.taxAmount = 0;
      dto.discountAmount = 0;
      dto.total = 0;
      dto.lines = [];
      dto.notes = reception.notes || null;
      const dteNum =
        (reception.dteNumber && String(reception.dteNumber).trim()) ||
        (reception.documentNumber && String(reception.documentNumber).trim()) ||
        null;
      dto.externalReference =
        dteNum || reception.reference || reception.documentNumber || null;

      const dteTypeNorm =
        reception.dteType && String(reception.dteType).trim().toLowerCase();

      // Attach reception-specific metadata so consumers can identify origin
      dto.metadata = {
        origin: 'RECEPTION',
        receptionId: reception.id,
        receptionType: reception.type || 'direct',
        storageId: reception.storageId || null,
        supplierId: reception.supplierId || null,
        reference: dteNum,
        document_type: dteTypeNorm || null,
        links: {
          // Reception currently doesn't store PO id as FK; keep link placeholders in metadata.
          purchaseOrderId: null,
        },
      } as any;

      // Payment plan is financial and should be handled by Supplier Invoice / AP, not by stock movement.

      // Ensure lines are loaded before mapping
      if (!Array.isArray(reception.lines) || reception.lines.length === 0) {
        const loadedLines = await this.receptionLineRepo.find({
          where: { receptionId: reception.id },
        });
        if (loadedLines.length > 0) {
          reception.lines = loadedLines;
        }
      }

      // Map reception lines to transaction lines
      if (Array.isArray(reception.lines)) {
        for (const l of reception.lines) {
          const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
          const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
          const lineSubtotal = qty * unitPrice;
          const tline: CreateTransactionLineDto = {
            productId: l.productId || undefined,
            productVariantId: l.productVariantId || undefined,
            productName: l.productName || l.product?.name || 'Item',
            productSku: l.sku || l.productSku || undefined,
            variantName: l.variantName || undefined,
            quantity: qty,
            // In stock-in movement we value with unitCost when available; fallback to unitPrice
            unitPrice: Number(l.unitCost ?? 0) > 0 ? Number(l.unitCost ?? 0) : unitPrice,
            unitCost: Number(l.unitCost ?? 0) || 0,
            discountPercentage: 0,
            discountAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            subtotal: Number(lineSubtotal),
            total: Number(lineSubtotal),
          } as any;
          dto.lines.push(tline);
          dto.subtotal += lineSubtotal;
          dto.total += lineSubtotal;
        }
      }

      // If there are payments attached in the reception, and the reception isn't fully paid,
      // we still create the PURCHASE transaction (accounts payable will be generated by accounting engine)

      if ((dto.lines?.length ?? 0) === 0) {
        this.logger.warn(
          'Reception has no lines, skipping transaction creation',
        );
        return null;
      }

      // Create inventory transaction
      const created = await this.transactionsService.createTransaction(dto);
      this.logger.log(
        `Created ADJUSTMENT_IN transaction ${created.id} for reception ${reception.id}`,
      );
      // Persist link back to reception object (in-memory) for UI and diagnostics
      try {
        reception.transactionId = created.id;
        reception.transaction = {
          id: created.id,
          documentNumber: created.documentNumber,
        } as any;
      } catch (err) {
        // best-effort
      }
      return created;
    } catch (err) {
      const msg = (err as Error).message || 'unknown error';
      this.logger.error(
        'Error creating purchase transaction for reception: ' + msg,
      );
      return { error: msg } as any;
    }
  }

  async create(data: any) {
    const refFromPayload =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNorm =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    // Create reception entity
    const reception = this.receptionRepo.create({
      type: data.type || 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayload,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayload || data.dteNumber || null,
      dteType: docTypeNorm,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals and lineCount
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }

    // Save reception to database
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save reception lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Try to create corresponding PURCHASE transaction (best-effort)
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!);
    if (tx && tx.id) {
      receptionWithLines!.transactionId = tx.id;
      await this.receptionRepo.save(receptionWithLines!);
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: tx && tx.id ? { id: tx.id } : null,
      transactionError: tx && tx.error ? tx.error : null,
    };
  }

  async createDirect(data: any) {
    // Create reception entity
    const refFromPayload =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNorm =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    const reception = this.receptionRepo.create({
      type: 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayload,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayload || data.dteNumber || null,
      dteType: docTypeNorm,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }

    // Save reception
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Create PURCHASE transaction
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!);
    const stockTxId = tx && (tx as any).id ? String((tx as any).id) : null;
    if (stockTxId) {
      receptionWithLines!.transactionId = stockTxId as any;
      await this.receptionRepo.save(receptionWithLines!);
    }

    let supplierDocumentError: string | null = null;
    if (docTypeNorm === 'invoice' || docTypeNorm === 'receipt') {
      try {
        supplierDocumentError = await this.tryCreateReceptionSupplierFiscalDocuments({
          data,
          reception: receptionWithLines!,
          docTypeNorm: String(docTypeNorm),
          stockInTransactionId: stockTxId,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Supplier fiscal from reception failed: ${msg}`);
        supplierDocumentError = msg;
      }
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: stockTxId ? { id: stockTxId } : null,
      transactionError: tx && (tx as any).error ? String((tx as any).error) : null,
      supplierDocumentError,
    };
  }

  async createFromPurchaseOrder(data: any) {
    // Create reception entity
    const refFromPayloadPo =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof data.dteNumber === 'string' && data.dteNumber.trim()) ||
      null;
    const docTypeNormPo =
      (data.documentType ?? data.dteType)?.toString().trim().toLowerCase() || null;

    const reception = this.receptionRepo.create({
      type: 'from-purchase-order',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: refFromPayloadPo,
      documentNumber: data.documentNumber,
      dteNumber: refFromPayloadPo || data.dteNumber || null,
      dteType: docTypeNormPo,
      notes: data.notes,
      payments: data.payments,
      subtotal: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 0,
      lineCount: 0,
    });

    // Compute totals
    if (Array.isArray(data.lines)) {
      reception.lineCount = data.lines.length;
      reception.subtotal = data.lines.reduce((s: number, l: any) => {
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        return s + qty * unitPrice;
      }, 0);
      reception.total = Number(reception.subtotal || 0);
    }

    // Save reception
    const savedReception = await this.receptionRepo.save(reception);

    // Create and save lines
    if (Array.isArray(data.lines)) {
      for (let i = 0; i < data.lines.length; i++) {
        const l = data.lines[i];
        const qty = Number(l.receivedQuantity ?? l.quantity ?? 0) || 0;
        const unitPrice = Number(l.unitPrice ?? l.price ?? 0) || 0;
        const lineSubtotal = qty * unitPrice;

        const snapshot = await this.buildLineSnapshot(l);

        const receptionLine = this.receptionLineRepo.create({
          receptionId: savedReception.id,
          productId: snapshot.productId,
          productVariantId: snapshot.productVariantId,
          productName: snapshot.productName,
          sku: snapshot.sku,
          variantName: snapshot.variantName,
          quantity: qty,
          receivedQuantity: Number(l.receivedQuantity ?? qty),
          unitPrice,
          unitCost: Number(l.unitCost ?? 0) || 0,
          subtotal: lineSubtotal,
          lineNumber: i + 1,
        });

        await this.receptionLineRepo.save(receptionLine);
      }
    }

    // Reload with relations
    const receptionWithLines = await this.receptionRepo.findOne({
      where: { id: savedReception.id },
      relations: ['lines'],
    });

    // Create PURCHASE transaction
    const tx = await this.maybeCreateStockInTransaction(receptionWithLines!);
    if (tx && tx.id) {
      receptionWithLines!.transactionId = tx.id;
      await this.receptionRepo.save(receptionWithLines!);
    }

    return {
      success: true,
      reception: receptionWithLines,
      transaction: tx && tx.id ? { id: tx.id } : null,
      transactionError: tx && tx.error ? tx.error : null,
    };
  }

  private roundClp(n: unknown): number {
    return Math.round(Number(n) || 0);
  }

  private mapUiPaymentMethod(raw: unknown): PaymentMethod {
    const s = String(raw || '').toUpperCase();
    if (s === 'CASH') return PaymentMethod.CASH;
    if (s === 'CHECK') return PaymentMethod.CHECK;
    return PaymentMethod.TRANSFER;
  }

  private normalizeSupplierDocumentPayment(raw: unknown): {
    mode: string;
    partialPaidAmount?: number;
    paidLines: any[];
    scheduledLines: any[];
  } {
    if (!raw || typeof raw !== 'object') {
      return { mode: 'PENDING', paidLines: [], scheduledLines: [] };
    }
    const o = raw as Record<string, unknown>;
    const modeRaw = String(o.mode || 'PENDING').toUpperCase();
    const mode = ['PENDING', 'PENDING_SCHEDULED', 'PARTIAL', 'COMPLETED'].includes(
      modeRaw,
    )
      ? modeRaw
      : 'PENDING';
    const paidLines = Array.isArray(o.paidLines) ? o.paidLines : [];
    const scheduledLines = Array.isArray(o.scheduledLines) ? o.scheduledLines : [];
    return {
      mode,
      partialPaidAmount:
        o.partialPaidAmount != null ? this.roundClp(o.partialPaidAmount) : undefined,
      paidLines,
      scheduledLines,
    };
  }

  private validatePaymentLine(l: any, label: string): string | null {
    const due = typeof l?.dueDate === 'string' ? l.dueDate.trim() : '';
    const amount = this.roundClp(l?.amount);
    const pm = String(l?.paymentMethod || '').toUpperCase();
    if (!due) return `${label}: fecha de vencimiento requerida.`;
    if (amount <= 0) return `${label}: monto inválido.`;
    if (!['CASH', 'TRANSFER', 'CHECK'].includes(pm))
      return `${label}: medio de pago inválido.`;
    if (pm === 'CASH') {
      const hub = typeof l?.cashHubId === 'string' ? l.cashHubId.trim() : '';
      if (!hub) return `${label}: efectivo requiere centro de acopio (cashHubId).`;
    }
    if (pm === 'TRANSFER' || pm === 'CHECK') {
      const c = l?.companyBankAccountKey;
      if (c == null || String(c).trim() === '')
        return `${label}: transferencia/cheque requiere cuenta empresa.`;
    }
    if (pm === 'CHECK') {
      const ch = l?.chequeNumber;
      if (ch == null || String(ch).trim() === '')
        return `${label}: cheque requiere número.`;
    }
    return null;
  }

  private toPlannedPaymentMeta(line: any) {
    const pm = String(line?.paymentMethod || '').toUpperCase();
    return {
      dueDate: String(line?.dueDate || '').trim(),
      amount: this.roundClp(line?.amount),
      paymentMethod: pm,
      companyBankAccountKey:
        pm === 'TRANSFER' || pm === 'CHECK'
          ? line?.companyBankAccountKey != null
            ? String(line.companyBankAccountKey)
            : null
          : null,
      supplierBankAccountKey:
        pm === 'TRANSFER'
          ? line?.supplierBankAccountKey != null
            ? String(line.supplierBankAccountKey)
            : null
          : null,
      chequeNumber:
        pm === 'CHECK' && line?.chequeNumber != null
          ? String(line.chequeNumber).trim()
          : null,
      cashHubId:
        pm === 'CASH' && line?.cashHubId != null ? String(line.cashHubId).trim() : null,
    };
  }

  private sumLineAmounts(lines: any[]): number {
    return lines.reduce((s, l) => s + this.roundClp((l as any)?.amount), 0);
  }

  private validateReceptionSupplierPaymentPlan(
    payment: {
      mode: string;
      partialPaidAmount?: number;
      paidLines: any[];
      scheduledLines: any[];
    },
    docTotal: number,
  ): string | null {
    const eps = 2;
    const { mode } = payment;
    const paid = payment.paidLines as any[];
    const sched = payment.scheduledLines as any[];

    for (let i = 0; i < paid.length; i++) {
      const err = this.validatePaymentLine(paid[i], `Abono ${i + 1}`);
      if (err) return err;
    }
    for (let i = 0; i < sched.length; i++) {
      const err = this.validatePaymentLine(sched[i], `Cuota ${i + 1}`);
      if (err) return err;
    }

    if (mode === 'PENDING') {
      if (paid.length || sched.length) {
        return 'Modo pendiente: no debe incluir líneas de pago.';
      }
      return null;
    }

    if (mode === 'PENDING_SCHEDULED') {
      if (paid.length) return 'Pago pendiente con cuotas: no debe incluir abonos ejecutados.';
      if (!sched.length) return 'Indique al menos una cuota programada.';
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(sumS - docTotal) > eps) {
        return `Las cuotas (${sumS}) deben sumar el total del documento (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'COMPLETED') {
      if (!paid.length) return 'Pago completado: defina la línea de pago.';
      if (sched.length) return 'Pago completado: no debe incluir cuotas pendientes adicionales.';
      const sumP = this.sumLineAmounts(paid);
      if (Math.abs(sumP - docTotal) > eps) {
        return `El pago (${sumP}) debe igualar el total (${docTotal}).`;
      }
      return null;
    }

    if (mode === 'PARTIAL') {
      const part = this.roundClp(payment.partialPaidAmount ?? 0);
      const sumP = this.sumLineAmounts(paid);
      if (Math.abs(sumP - part) > eps) {
        return `Los abonos (${sumP}) deben coincidir con el monto parcial indicado (${part}).`;
      }
      const sumS = this.sumLineAmounts(sched);
      if (Math.abs(part + sumS - docTotal) > eps) {
        return 'Abonos + saldo programado deben igualar el total del documento.';
      }
      if (!paid.length) return 'Pago parcial: agregue al menos un abono ejecutado.';
      if (part < docTotal - eps && !sched.length) {
        return 'Pago parcial: indique las cuotas para el saldo pendiente.';
      }
      return null;
    }

    return null;
  }

  private async createSupplierPaymentLine(opts: {
    dtoHost: any;
    fiscalDocId: string;
    line: any;
    asDraft: boolean;
    note: string;
  }): Promise<void> {
    const dto = new CreateTransactionDto();
    dto.transactionType = TransactionType.SUPPLIER_PAYMENT;
    if (opts.asDraft) {
      dto.transactionStatus = TransactionStatus.DRAFT;
    }
    dto.branchId = opts.dtoHost.branchId;
    dto.userId = opts.dtoHost.userId;
    dto.supplierId = opts.dtoHost.supplierId;
    dto.relatedTransactionId = opts.fiscalDocId;
    dto.subtotal = this.roundClp(opts.line.amount);
    dto.discountAmount = 0;
    dto.taxAmount = 0;
    dto.total = this.roundClp(opts.line.amount);
    dto.paymentMethod = this.mapUiPaymentMethod(opts.line.paymentMethod);
    dto.amountPaid = opts.asDraft ? 0 : this.roundClp(opts.line.amount);
    dto.paymentStatus = opts.asDraft ? PaymentStatus.PENDING : PaymentStatus.PAID;
    dto.paymentDueDate = String(opts.line.dueDate || '').trim();
    const pm = String(opts.line.paymentMethod || '').toUpperCase();
    if (pm === 'TRANSFER' || pm === 'CHECK') {
      dto.bankAccountKey =
        opts.line.companyBankAccountKey != null
          ? String(opts.line.companyBankAccountKey).trim()
          : undefined;
    }
    if (pm === 'CASH') {
      dto.cashHubId =
        opts.line.cashHubId != null ? String(opts.line.cashHubId).trim() : undefined;
    }
    dto.notes = opts.note;
    dto.metadata = {
      origin: 'RECEPTION_SUPPLIER_PAYMENT',
      receptionSupplierPaymentLine: this.toPlannedPaymentMeta(opts.line),
    };
    await this.transactionsService.createTransaction(dto);
  }

  private async tryCreateReceptionSupplierFiscalDocuments(opts: {
    data: any;
    reception: any;
    docTypeNorm: string;
    stockInTransactionId: string | null;
  }): Promise<string | null> {
    const { data, reception, docTypeNorm, stockInTransactionId } = opts;

    const fa = data?.supplierFiscalAmounts;
    if (!fa || typeof fa !== 'object') {
      return 'Faltan montos del documento fiscal (supplierFiscalAmounts).';
    }

    const subtotalNeto = this.roundClp((fa as any).subtotalNeto);
    const taxAmount = this.roundClp((fa as any).taxAmount);
    const totalDoc = this.roundClp((fa as any).total);
    const taxIdRaw = (fa as any).taxId;
    const taxId =
      typeof taxIdRaw === 'string' && taxIdRaw.trim().length ? taxIdRaw.trim() : undefined;
    let taxRatePct = Number((fa as any).taxRatePct);
    if (!Number.isFinite(taxRatePct) || taxRatePct < 0) taxRatePct = 0;
    if (taxRatePct > 100) taxRatePct = 100;

    if (subtotalNeto <= 0 || totalDoc <= 0) {
      return 'Montos del documento fiscal inválidos.';
    }
    if (Math.abs(subtotalNeto + taxAmount - totalDoc) > 2) {
      return 'Neto + impuestos no coincide con el total del documento.';
    }

    const payment = this.normalizeSupplierDocumentPayment(
      data?.supplierDocumentPayment ?? null,
    );

    const planErr = this.validateReceptionSupplierPaymentPlan(payment, totalDoc);
    if (planErr) {
      return planErr;
    }

    const fiscalDto = new CreateTransactionDto();
    fiscalDto.transactionType =
      docTypeNorm === 'invoice'
        ? TransactionType.SUPPLIER_INVOICE
        : TransactionType.SUPPLIER_RECEIPT;
    fiscalDto.branchId = data.branchId;
    fiscalDto.userId = data.userId;
    fiscalDto.supplierId = data.supplierId;
    fiscalDto.storageId = reception.storageId || undefined;
    fiscalDto.subtotal = subtotalNeto;
    fiscalDto.taxAmount = taxAmount;
    fiscalDto.discountAmount = 0;
    fiscalDto.total = totalDoc;

    const ref =
      (typeof data.reference === 'string' && data.reference.trim()) ||
      (typeof reception.reference === 'string' && reception.reference.trim()) ||
      '';
    applyDteNumberToSupplierDocumentDto(
      { dteNumber: ref, metadata: { dteNumber: ref } },
      fiscalDto,
    );

    let parentPaymentStatus = PaymentStatus.PENDING;
    let parentAmountPaid = 0;
    const paid = payment.paidLines as any[];
    const sched = payment.scheduledLines as any[];

    let plannedForMeta: any[] = [];

    if (payment.mode === 'COMPLETED') {
      parentPaymentStatus = PaymentStatus.PAID;
      parentAmountPaid = totalDoc;
      plannedForMeta = paid.map((l) => this.toPlannedPaymentMeta(l));
    } else if (payment.mode === 'PARTIAL') {
      parentPaymentStatus = PaymentStatus.PARTIAL;
      parentAmountPaid = this.sumLineAmounts(paid);
      plannedForMeta = [...paid, ...sched].map((l) => this.toPlannedPaymentMeta(l));
    } else if (payment.mode === 'PENDING_SCHEDULED') {
      parentPaymentStatus = PaymentStatus.PENDING;
      parentAmountPaid = 0;
      plannedForMeta = sched.map((l) => this.toPlannedPaymentMeta(l));
    } else {
      parentPaymentStatus = PaymentStatus.PENDING;
      parentAmountPaid = 0;
      plannedForMeta = [];
    }

    const methodSource =
      paid[0]?.paymentMethod ?? sched[0]?.paymentMethod ?? 'TRANSFER';
    fiscalDto.paymentMethod = this.mapUiPaymentMethod(methodSource);
    fiscalDto.paymentStatus = parentPaymentStatus;
    fiscalDto.amountPaid = parentAmountPaid;

    const line = new CreateTransactionLineDto();
    line.productName =
      docTypeNorm === 'invoice'
        ? 'Factura proveedor (recepción)'
        : 'Boleta proveedor (recepción)';
    line.quantity = 1;
    line.unitPrice = subtotalNeto;
    line.subtotal = subtotalNeto;
    line.taxAmount = taxAmount;
    line.total = totalDoc;
    line.taxRate = taxRatePct;
    if (taxId) {
      line.taxId = taxId;
    }

    fiscalDto.lines = [line];

    fiscalDto.metadata = {
      origin: docTypeNorm === 'invoice' ? 'SUPPLIER_INVOICE' : 'SUPPLIER_RECEIPT',
      dteNumber: ref || undefined,
      links: {
        receptionId: reception.id,
        stockInTransactionId: stockInTransactionId,
        purchaseOrderId: null,
      },
      plannedPayments: plannedForMeta,
      receptionSupplierDocumentPayment: payment,
    };

    const created = await this.transactionsService.createTransaction(fiscalDto);
    const fiscalId = created?.id;
    if (!fiscalId) {
      return 'No se obtuvo id del documento fiscal creado.';
    }

    if (payment.mode === 'COMPLETED') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: paid[i],
          asDraft: false,
          note: `Pago documento recepción (${i + 1}/${paid.length})`,
        });
      }
    } else if (payment.mode === 'PARTIAL') {
      for (let i = 0; i < paid.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: paid[i],
          asDraft: false,
          note: `Abono recepción (${i + 1}/${paid.length})`,
        });
      }
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada recepción (${i + 1}/${sched.length})`,
        });
      }
    } else if (payment.mode === 'PENDING_SCHEDULED') {
      for (let i = 0; i < sched.length; i++) {
        await this.createSupplierPaymentLine({
          dtoHost: data,
          fiscalDocId: fiscalId,
          line: sched[i],
          asDraft: true,
          note: `Cuota programada recepción (${i + 1}/${sched.length})`,
        });
      }
    }

    return null;
  }
}
