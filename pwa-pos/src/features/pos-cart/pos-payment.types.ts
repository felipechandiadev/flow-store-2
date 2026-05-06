export const POS_PAYMENT_METHOD_IDS = [
  "CASH",
  "CREDIT_CARD",
  "DEBIT_CARD",
  "TRANSFER",
  "CHECK",
] as const;

export type PosPaymentMethodId = (typeof POS_PAYMENT_METHOD_IDS)[number];

export type PosPaymentLine = {
  id: string;
  type: PosPaymentMethodId;
  amount: number;
  reference: string;
};
