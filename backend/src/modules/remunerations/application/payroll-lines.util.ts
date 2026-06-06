import { BadRequestException } from '@nestjs/common';
import {
  PAYROLL_LINE_TYPE_LEGACY_ALIASES,
  PAYROLL_LINE_TYPE_LABELS,
  PayrollDeductionTypeId,
  PayrollEarningTypeId,
  PayrollLineCategory,
  type PayrollLineTypeId,
} from '../domain/payroll-line-type.enum';

export interface PayrollLineInput {
  typeId: string;
  amount: number;
}

export interface NormalizedPayrollLine {
  typeId: PayrollLineTypeId;
  amount: number;
  category: PayrollLineCategory;
}

const EARNING_TYPE_IDS = new Set<string>(Object.values(PayrollEarningTypeId));
const DEDUCTION_TYPE_IDS = new Set<string>(Object.values(PayrollDeductionTypeId));
const ALL_TYPE_IDS = new Set<string>([
  ...EARNING_TYPE_IDS,
  ...DEDUCTION_TYPE_IDS,
]);

export function normalizePayrollLineTypeId(raw: string): PayrollLineTypeId {
  const typeId = String(raw ?? '').trim();
  if (!typeId) {
    throw new BadRequestException('Cada línea debe tener typeId');
  }
  if (ALL_TYPE_IDS.has(typeId)) {
    return typeId as PayrollLineTypeId;
  }
  const alias = PAYROLL_LINE_TYPE_LEGACY_ALIASES[typeId];
  if (alias) {
    return alias;
  }
  throw new BadRequestException(`Tipo de línea de liquidación no válido: ${typeId}`);
}

export function getPayrollLineCategory(typeId: PayrollLineTypeId): PayrollLineCategory {
  if (DEDUCTION_TYPE_IDS.has(typeId)) {
    return PayrollLineCategory.DEDUCTION;
  }
  return PayrollLineCategory.EARNING;
}

export function getPayrollLineTypeLabel(typeId: string): string {
  if (PAYROLL_LINE_TYPE_LABELS[typeId]) {
    return PAYROLL_LINE_TYPE_LABELS[typeId];
  }
  const alias = PAYROLL_LINE_TYPE_LEGACY_ALIASES[typeId];
  if (alias) {
    return PAYROLL_LINE_TYPE_LABELS[alias] ?? alias;
  }
  return typeId;
}

export function calculatePayrollTotals(lines: PayrollLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new BadRequestException('La liquidación debe incluir al menos una línea');
  }

  let totalEarnings = 0;
  let totalDeductions = 0;
  let earningCount = 0;

  const normalizedLines: NormalizedPayrollLine[] = lines.map((line, index) => {
    const typeId = normalizePayrollLineTypeId(line.typeId);
    const amount = Math.round(Number(line.amount) || 0);
    if (amount <= 0) {
      throw new BadRequestException(
        `La línea ${index + 1} (${getPayrollLineTypeLabel(typeId)}) debe tener monto mayor a cero`,
      );
    }

    const category = getPayrollLineCategory(typeId);
    if (category === PayrollLineCategory.DEDUCTION) {
      totalDeductions += amount;
    } else {
      totalEarnings += amount;
      earningCount += 1;
    }

    return { typeId, amount, category };
  });

  if (earningCount === 0) {
    throw new BadRequestException('La liquidación debe incluir al menos un haber');
  }

  const netPayment = totalEarnings - totalDeductions;
  if (netPayment < 0) {
    throw new BadRequestException(
      'El líquido a pagar no puede ser negativo (descuentos superan haberes)',
    );
  }

  return {
    totalEarnings,
    totalDeductions,
    netPayment,
    normalizedLines,
  };
}

export function listPayrollLineTypeOptions() {
  const earnings = Object.values(PayrollEarningTypeId).map((id) => ({
    id,
    label: PAYROLL_LINE_TYPE_LABELS[id],
    category: PayrollLineCategory.EARNING,
  }));
  const deductions = Object.values(PayrollDeductionTypeId).map((id) => ({
    id,
    label: PAYROLL_LINE_TYPE_LABELS[id],
    category: PayrollLineCategory.DEDUCTION,
  }));
  return { earnings, deductions };
}
