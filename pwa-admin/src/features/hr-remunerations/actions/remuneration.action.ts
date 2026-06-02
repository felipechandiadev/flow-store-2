"use server";

import { revalidatePath } from "next/cache";
import { RemunerationRequest } from "../infrastructure/remuneration.request";
import type { RemunerationGridRow } from "../types/remuneration.types";

const REMUNERATIONS_PATH = "/hr/remunerations";

export type CreateRemunerationFormInput = {
  employeeId: string;
  date: string;
  resultCenterId?: string | null;
  ordinaryAmount: number;
  afpAmount?: number;
  healthAmount?: number;
  othersAmount?: number;
};

export type CreateRemunerationResult = { success: true; id: string } | { success: false; error: string };

function parseAmount(value: string | number | undefined): number {
  if (typeof value === "number") {
    return Math.max(0, Math.round(value));
  }
  return Math.max(0, Math.round(Number(String(value ?? "").replace(/\D/g, "")) || 0));
}

export async function listRemunerationsForGridAction(opts: {
  employeeId?: string;
  status?: string;
} = {}): Promise<RemunerationGridRow[]> {
  return RemunerationRequest.list(opts);
}

export async function createRemunerationAction(
  input: CreateRemunerationFormInput,
): Promise<CreateRemunerationResult> {
  const employeeId = input.employeeId?.trim() ?? "";
  if (!employeeId) {
    return { success: false, error: "Seleccione un empleado." };
  }
  const date = input.date?.trim() ?? "";
  if (!date) {
    return { success: false, error: "La fecha de liquidación es obligatoria." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: "La fecha debe tener formato AAAA-MM-DD." };
  }

  const ordinary = parseAmount(input.ordinaryAmount);
  if (ordinary <= 0) {
    return { success: false, error: "Ingrese un monto de remuneración ordinaria mayor a cero." };
  }

  const lines: Array<{ typeId: string; amount: number }> = [
    { typeId: "ORDINARY", amount: ordinary },
  ];

  const afp = parseAmount(input.afpAmount);
  if (afp > 0) lines.push({ typeId: "AFP", amount: afp });

  const health = parseAmount(input.healthAmount);
  if (health > 0) lines.push({ typeId: "HEALTH_INSURANCE", amount: health });

  const others = parseAmount(input.othersAmount);
  if (others > 0) lines.push({ typeId: "DEDUCTION_EXTRA", amount: others });

  const net =
    ordinary -
    parseAmount(input.afpAmount) -
    parseAmount(input.healthAmount) -
    parseAmount(input.othersAmount);

  const res = await RemunerationRequest.create({
    employeeId,
    date,
    resultCenterId: input.resultCenterId?.trim() || null,
    lines,
    plannedPayments: [{ dueDate: date, amount: net }],
  });
  if (res.success) {
    revalidatePath(REMUNERATIONS_PATH, "page");
  }
  return res;
}
