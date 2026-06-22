import type { EShopFulfillmentStatus } from "../types/eshop-fulfillment.types";

export const FULFILLMENT_STATUS_LABELS: Record<EShopFulfillmentStatus, string> = {
  SUBMITTED: "Recibido",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY_FOR_PICKUP: "Listo para retiro",
  SHIPPED: "Despachado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const STOCK_POLICY_LABELS = {
  ALLOW_BACKORDER: "Permitir pedido igual (encargo si falta stock)",
  BLOCK_OUT_OF_STOCK: "Bloquear si no hay stock",
  IGNORE_STOCK: "No validar stock",
} as const;

export const METHOD_TYPE_LABELS = {
  PICKUP: "Retiro en tienda",
  FLAT_RATE: "Tarifa fija",
  FREE_OVER_THRESHOLD: "Gratis sobre umbral",
  MANUAL_QUOTE: "Coordinar envío",
} as const;

export const NEXT_STATUS_OPTIONS: Partial<Record<EShopFulfillmentStatus, EShopFulfillmentStatus[]>> = {
  SUBMITTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "SHIPPED", "CANCELLED"],
  READY_FOR_PICKUP: ["DELIVERED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
};
