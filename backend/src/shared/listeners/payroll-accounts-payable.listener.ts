import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TransactionCreatedEvent } from '@shared/events/transaction-created.event';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '@modules/transactions/domain/transaction.entity';

/**
 * LISTENER: Crea cuentas por pagar automáticamente cuando se genera una nómina
 *
 * Responsabilidad: Cuando se crea una transacción PAYROLL, generar
 * transacciones PAYMENT_OUT por cada deuda generada:
 * - Pago al empleado (líquido a pagar)
 * - Pago AFP
 * - Pago Salud
 * - Pago otras retenciones (impuestos, préstamos, etc)
 *
 * Flujo:
 * 1. Escucha evento 'transaction.created'
 * 2. Si es PAYROLL, analiza metadata.lines
 * 3. Crea transacciones PAYMENT_OUT en estado DRAFT
 * 4. Estas aparecen en el DataGrid de Cuentas por Pagar
 *
 * Beneficios:
 * - Desacopla creación de nómina del pago
 * - Permite revisión antes de pagar
 * - Facilita control de caja
 */
@Injectable()
export class PayrollAccountsPayableListener {
  private logger = new Logger(PayrollAccountsPayableListener.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  @OnEvent('transaction.created', { async: true })
  async handlePayrollCreated(event: TransactionCreatedEvent) {
    const { transaction, companyId } = event;

    // Solo procesar transacciones PAYROLL
    if (transaction.transactionType !== TransactionType.PAYROLL) {
      return;
    }

    try {
      this.logger.log(
        `[PAYROLL ACCOUNTS PAYABLE] Processing payroll transaction ${transaction.id}`,
      );

      const metadata = transaction.metadata as any;
      if (!metadata?.lines || !Array.isArray(metadata.lines)) {
        this.logger.warn(`Payroll ${transaction.id} has no lines in metadata`);
        return;
      }

      await this.dataSource.transaction(async (manager) => {
        const transactionRepo = manager.getRepository(Transaction);
        const accountsPayable: Array<{
          description: string;
          amount: number;
          typeId: string;
          paymentDueDate?: Date;
        }> = [];

        // Calcular deudas de retenciones específicas
        let totalDeductions = 0;
        const deductionsByType: Record<string, number> = {};

        for (const line of metadata.lines) {
          const { typeId, amount } = line;

          if (amount < 0) {
            // Es una deducción -> genera cuenta por pagar a institución
            const absAmount = Math.abs(amount);
            totalDeductions += absAmount;

            if (!deductionsByType[typeId]) {
              deductionsByType[typeId] = 0;
            }
            deductionsByType[typeId] += absAmount;
          }
        }

        // Crear cuentas por pagar por tipo de retención
        for (const [typeId, amount] of Object.entries(deductionsByType)) {
          accountsPayable.push({
            description: this.getDeductionDescription(typeId),
            amount,
            typeId,
            paymentDueDate: this.getPaymentDueDate(typeId),
          });
        }

        // Calcular líquido a pagar al empleado
        const totalEarnings = metadata.lines
          .filter((line: any) => line.amount > 0)
          .reduce((sum: number, line: any) => sum + line.amount, 0);

        const netPayment = totalEarnings - totalDeductions;

        if (netPayment > 0) {
          accountsPayable.push({
            description: 'Pago de remuneración al empleado',
            amount: netPayment,
            typeId: 'EMPLOYEE_PAYMENT',
            paymentDueDate: transaction.paymentDueDate || new Date(),
          });
        }

        // Crear transacciones PAYMENT_OUT por cada cuenta por pagar
        for (const payable of accountsPayable) {
          const paymentOut = transactionRepo.create({
            documentNumber: await this.generateDocumentNumber(
              transaction.documentNumber,
              payable.typeId,
            ),
            transactionType: TransactionType.PAYMENT_OUT,
            status: TransactionStatus.DRAFT, // Pendiente de pago
            branchId: transaction.branchId,
            userId: transaction.userId,
            employeeId:
              payable.typeId === 'EMPLOYEE_PAYMENT'
                ? transaction.employeeId
                : null,
            // supplierId: null, // Por ahora no asignamos proveedor específico (AFP/Isapre/etc)
            total: payable.amount,
            subtotal: payable.amount,
            taxAmount: 0,
            discountAmount: 0,
            paymentMethod: PaymentMethod.TRANSFER, // Por defecto transferencia
            amountPaid: 0, // Aún no pagado
            paymentDueDate: payable.paymentDueDate,
            accountingPeriodId: transaction.accountingPeriodId,
            relatedTransactionId: transaction.id, // Enlazar con la nómina
            notes: payable.description,
            metadata: {
              origin: 'PAYROLL',
              payrollTransactionId: transaction.id,
              payrollLineType: payable.typeId,
              employeeId: transaction.employeeId,
            },
          });

          await transactionRepo.save(paymentOut);

          this.logger.log(
            `[PAYROLL ACCOUNTS PAYABLE] Created PAYMENT_OUT ${paymentOut.id} ` +
              `for ${payable.description} - Amount: ${payable.amount}`,
          );
        }

        this.logger.log(
          `[PAYROLL ACCOUNTS PAYABLE] Successfully created ${accountsPayable.length} ` +
            `accounts payable for payroll ${transaction.id}`,
        );
      });
    } catch (error) {
      this.logger.error(
        `[PAYROLL ACCOUNTS PAYABLE] ERROR processing payroll ${transaction.id}: ` +
          `${(error as Error).message}`,
      );
      // No lanzamos el error para no afectar la creación de la nómina
      // Las cuentas por pagar pueden crearse manualmente si falla
    }
  }

  /**
   * Genera número de documento único para el pago
   */
  private async generateDocumentNumber(
    payrollDocNumber: string,
    typeId: string,
  ): Promise<string> {
    const timestamp = Date.now().toString().slice(-6);
    const typePrefix = this.getTypePrefix(typeId);
    return `PAY-${typePrefix}-${timestamp}`;
  }

  /**
   * Prefijo según tipo de pago
   */
  private getTypePrefix(typeId: string): string {
    const prefixes: Record<string, string> = {
      EMPLOYEE_PAYMENT: 'EMP',
      AFP: 'AFP',
      HEALTH_INSURANCE: 'SAL',
      INCOME_TAX: 'IMP',
      UNEMPLOYMENT_INSURANCE: 'CES',
      LOAN_PAYMENT: 'PRE',
      ADVANCE_PAYMENT: 'ANT',
      UNION_FEE: 'SIN',
      COURT_ORDER: 'JUD',
      DEDUCTION_EXTRA: 'EXT',
      ADJUSTMENT_NEG: 'AJU',
    };

    return prefixes[typeId] || 'OTR';
  }

  /**
   * Descripción legible de la deducción
   */
  private getDeductionDescription(typeId: string): string {
    const descriptions: Record<string, string> = {
      AFP: 'Pago cotización AFP',
      HEALTH_INSURANCE: 'Pago cotización Salud (Fonasa/Isapre)',
      INCOME_TAX: 'Pago impuesto único 2da categoría',
      UNEMPLOYMENT_INSURANCE: 'Pago seguro de cesantía',
      LOAN_PAYMENT: 'Pago descuento préstamo',
      ADVANCE_PAYMENT: 'Pago anticipo de sueldo',
      UNION_FEE: 'Pago cuota sindical',
      COURT_ORDER: 'Pago orden judicial',
      DEDUCTION_EXTRA: 'Pago descuento extraordinario',
      ADJUSTMENT_NEG: 'Pago ajuste negativo',
    };

    return descriptions[typeId] || `Pago ${typeId}`;
  }

  /**
   * Fecha de vencimiento según tipo de pago
   */
  private getPaymentDueDate(typeId: string): Date {
    const now = new Date();
    const dueDate = new Date(now);

    // AFP y Salud: día 10 del mes siguiente
    if (typeId === 'AFP' || typeId === 'HEALTH_INSURANCE') {
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(10);
      return dueDate;
    }

    // Impuesto único: día 12 del mes siguiente
    if (typeId === 'INCOME_TAX') {
      dueDate.setMonth(dueDate.getMonth() + 1);
      dueDate.setDate(12);
      return dueDate;
    }

    // Otros pagos: 5 días hábiles
    dueDate.setDate(dueDate.getDate() + 7);
    return dueDate;
  }
}
