import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '../domain/transaction.entity';

export type PosSaleForReturnLineDto = {
  id: string;
  lineNumber: number;
  productId: string | null;
  productVariantId: string | null;
  productName: string;
  productSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  total: number;
  unitOfMeasure: string | null;
};

export type PosSaleForReturnDto = {
  id: string;
  documentNumber: string;
  transactionType: string;
  status: string;
  createdAt: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  customerId: string | null;
  customerName: string | null;
  customerDocument: string | null;
  branchName: string | null;
  pointOfSaleName: string | null;
  lines: PosSaleForReturnLineDto[];
};

const BLOCKED_STATUSES = new Set<string>([
  TransactionStatus.VOIDED,
  TransactionStatus.CANCELLED,
  TransactionStatus.DRAFT,
]);

@Injectable()
export class PosSaleLookupService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async findSaleByDocumentNumber(
    companyId: string,
    documentNumber: string,
  ): Promise<PosSaleForReturnDto | null> {
    const folio = documentNumber?.trim();
    if (!folio) {
      throw new BadRequestException('Folio de venta requerido');
    }

    const tx = await this.transactionRepository.findOne({
      where: {
        companyId,
        documentNumber: folio,
        transactionType: TransactionType.SALE,
      },
      relations: [
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.unit',
        'lines.tax',
        'customer',
        'customer.person',
        'branch',
        'pointOfSale',
      ],
    });

    if (!tx) return null;

    if (BLOCKED_STATUSES.has(String(tx.status))) {
      throw new BadRequestException(
        `La venta ${folio} no está disponible para devolución (estado: ${tx.status}).`,
      );
    }

    return this.toPosDto(tx);
  }

  private toPosDto(tx: Transaction): PosSaleForReturnDto {
    const customer = tx.customer as
      | {
          id?: string;
          person?: {
            firstName?: string;
            lastName?: string;
            documentNumber?: string;
          };
        }
      | undefined;

    const person = customer?.person;
    const customerName = person
      ? `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim() || null
      : null;
    const customerDocument =
      typeof person?.documentNumber === 'string' &&
      person.documentNumber.trim()
        ? person.documentNumber.trim()
        : null;

    const sortedLines = [...(tx.lines ?? [])].sort(
      (a, b) => (a.lineNumber ?? 0) - (b.lineNumber ?? 0),
    );
    const lines = sortedLines.map((line, index) => {
      const qty = Number(line.quantity) || 0;
      const taxRate =
        Number(line.taxRate) ||
        Number((line as { tax?: { rate?: number } }).tax?.rate) ||
        0;
      return {
        id: line.id,
        lineNumber: line.lineNumber ?? index + 1,
        productId: line.productId ?? null,
        productVariantId: line.productVariantId ?? null,
        productName: line.productName,
        productSku: line.productSku ?? null,
        variantName: line.variantName ?? null,
        quantity: qty,
        unitPrice: Number(line.unitPrice) || 0,
        discountAmount: Number(line.discountAmount) || 0,
        taxRate,
        taxAmount: Number(line.taxAmount) || 0,
        subtotal: Number(line.subtotal) || 0,
        total: Number(line.total) || 0,
        unitOfMeasure: line.unitOfMeasure ?? null,
      };
    });

    return {
      id: tx.id,
      documentNumber: tx.documentNumber,
      transactionType: tx.transactionType,
      status: tx.status,
      createdAt:
        tx.createdAt instanceof Date
          ? tx.createdAt.toISOString()
          : String(tx.createdAt ?? ''),
      subtotal: Number(tx.subtotal) || 0,
      taxAmount: Number(tx.taxAmount) || 0,
      discountAmount: Number(tx.discountAmount) || 0,
      total: Number(tx.total) || 0,
      customerId: customer?.id ?? tx.customerId ?? null,
      customerName,
      customerDocument,
      branchName: tx.branch?.name ?? null,
      pointOfSaleName: tx.pointOfSale?.name ?? null,
      lines,
    };
  }
}
