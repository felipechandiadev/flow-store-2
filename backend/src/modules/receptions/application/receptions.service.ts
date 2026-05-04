import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
} from '@modules/transactions/domain/transaction.entity';
import { v4 as uuidv4 } from 'uuid';

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
        dte_number: dteNum,
        dte_type: dteTypeNorm || null,
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
    // Create reception entity
    const reception = this.receptionRepo.create({
      type: data.type || 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: data.reference,
      documentNumber: data.documentNumber,
      dteNumber: data.dteNumber,
      dteType: data.dteType || null,
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
    const reception = this.receptionRepo.create({
      type: 'direct',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: data.reference,
      documentNumber: data.documentNumber,
      dteNumber: data.dteNumber,
      dteType: data.dteType || null,
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

  async createFromPurchaseOrder(data: any) {
    // Create reception entity
    const reception = this.receptionRepo.create({
      type: 'from-purchase-order',
      storageId: data.storageId,
      branchId: data.branchId,
      supplierId: data.supplierId,
      userId: data.userId,
      reference: data.reference,
      documentNumber: data.documentNumber,
      dteNumber: data.dteNumber,
      dteType: data.dteType || null,
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
}
