import { Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import {
  PaymentMethod,
  TransactionType,
} from '@modules/transactions/domain/transaction.entity';
import { ChecksService } from '../checks.service';
import { CheckDirection } from '../../domain/check.entity';
import { getPaymentSnapshots } from '@modules/transactions/application/payment-snapshots.util';

const INCOMING_PAYMENT_TX_TYPES = new Set<TransactionType>([
  TransactionType.SALE,
  TransactionType.PAYMENT_IN,
]);

const OUTGOING_PAYMENT_TX_TYPES = new Set<TransactionType>([
  TransactionType.SUPPLIER_PAYMENT,
  TransactionType.PAYROLL_PAYMENT,
  TransactionType.EXPENSE_PAYMENT,
  TransactionType.OPERATING_EXPENSE,
  TransactionType.PAYMENT_EXECUTION,
  TransactionType.BANK_WITHDRAWAL_TO_SHAREHOLDER,
]);

type CheckDataSnapshot = {
  checkNumber?: string;
  bankName?: string;
  bankAccountKey?: string | null;
  drawerName?: string | null;
  drawerDocument?: string | null;
  payeeName?: string | null;
  payeeId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
};

/**
 * Materializa cheques (entrante/saliente) cuando se crea una transacción
 * de venta o de pago con `paymentMethod = CHECK`.
 *
 * - Para ventas: revisa `metadata.payments[]` y por cada entry con
 *   `method === 'CHECK'` crea un `Check { direction: INCOMING }` ligado a
 *   esa transacción.
 * - Para pagos salientes: si `paymentMethod === CHECK`, crea un cheque
 *   OUTGOING usando `metadata.checkData` o `metadata.paymentSnapshots`.
 *
 * Saltea la creación si `metadata.endorsedFromCheckId` está presente: ese
 * pago se cubre con un cheque INCOMING que se endosa (no se emite un
 * cheque nuevo). El endoso lo maneja la mutación explícita en
 * `ChecksService.endorse`.
 */
@EventsHandler(TransactionCreatedEvent)
export class CheckFromTransactionHandler
  implements IEventHandler<TransactionCreatedEvent>
{
  private readonly logger = new Logger(CheckFromTransactionHandler.name);

  constructor(private readonly checks: ChecksService) {}

  async handle(event: TransactionCreatedEvent): Promise<void> {
    try {
      const tx: any = (event as any).transaction;
      if (!tx || !tx.id) return;
      const companyId: string | null =
        (event as any).companyId || tx.companyId || null;
      if (!companyId) return;

      const txType = tx.transactionType as TransactionType;
      const metadata = (tx.metadata ?? {}) as Record<string, any>;

      // Endoso: la creación de Check OUTGOING se omite porque el cheque
      // viene de un INCOMING que ya existe.
      if (metadata.endorsedFromCheckId) return;

      const incoming = INCOMING_PAYMENT_TX_TYPES.has(txType);
      const outgoing = OUTGOING_PAYMENT_TX_TYPES.has(txType);

      if (!incoming && !outgoing) return;

      const snapshots = getPaymentSnapshots(metadata);

      if (incoming) {
        const checkSnaps = snapshots.filter((s) => s?.method === 'CHECK');
        for (const snap of checkSnaps) {
          const cd = (snap.checkData ?? {}) as CheckDataSnapshot;
          if (!cd.checkNumber || !cd.bankName) {
            this.logger.warn(
              `Sale tx ${tx.id} has a CHECK payment without checkNumber/bankName; skipping check creation`,
            );
            continue;
          }
          await this.checks.createFromTransactionPayment({
            companyId,
            transactionId: tx.id,
            direction: CheckDirection.INCOMING,
            checkNumber: cd.checkNumber,
            bankName: cd.bankName,
            bankAccountKey: cd.bankAccountKey ?? snap.bankAccountKey ?? null,
            drawerName: cd.drawerName ?? null,
            drawerDocument: cd.drawerDocument ?? null,
            payeeName: cd.payeeName ?? null,
            payeeId: cd.payeeId ?? null,
            amount: Number(snap.amount ?? 0),
            currency: (tx.currency as string) || 'CLP',
            issueDate: cd.issueDate ?? null,
            dueDate: cd.dueDate ?? null,
            metadata: { source: 'sale', txDocumentNumber: tx.documentNumber },
          });
        }
        return;
      }

      // Outgoing
      if (tx.paymentMethod !== PaymentMethod.CHECK) return;

      // Para outgoing aceptamos el payload en dos formatos: metadata.checkData
      // o el primer entry de paymentSnapshots con checkData.
      const cd: CheckDataSnapshot =
        (metadata.checkData as CheckDataSnapshot) ??
        snapshots.find((s) => s?.checkData)?.checkData ??
        {};

      if (!cd.checkNumber || !cd.bankName) {
        this.logger.warn(
          `Outgoing tx ${tx.id} marked CHECK but missing checkNumber/bankName; skipping check creation`,
        );
        return;
      }

      await this.checks.createFromTransactionPayment({
        companyId,
        transactionId: tx.id,
        direction: CheckDirection.OUTGOING,
        checkNumber: cd.checkNumber,
        bankName: cd.bankName,
        bankAccountKey: cd.bankAccountKey ?? tx.bankAccountKey ?? null,
        drawerName: cd.drawerName ?? null,
        drawerDocument: cd.drawerDocument ?? null,
        payeeName: cd.payeeName ?? null,
        payeeId: cd.payeeId ?? null,
        amount: Number(tx.total ?? 0),
        currency: (tx.currency as string) || 'CLP',
        issueDate: cd.issueDate ?? null,
        dueDate: cd.dueDate ?? null,
        metadata: { source: 'payment', txType, txDocumentNumber: tx.documentNumber },
      });
    } catch (err) {
      this.logger.error(
        `Failed to materialize check from transaction: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
