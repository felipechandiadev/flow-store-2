"use server";

import { revalidatePath } from "next/cache";
import { MultimediaRequest } from "../infrastructure/multimedia.request";
import type { MultimediaAssetListItem, MultimediaEntityType } from "../types/multimedia.types";

const PRODUCTS_PATH = "/catalog/products";
const SETTINGS_COMPANY_PATH = "/settings/company";

const ENTITY_TYPES: MultimediaEntityType[] = ["product", "product-variant", "company"];

export async function revalidateMultimediaCachesAction(
  entityType: MultimediaEntityType,
  entityId?: string,
): Promise<void> {
  revalidatePathsForEntityType(entityType, entityId);
}

function revalidatePathsForEntityType(
  entityType: MultimediaEntityType,
  entityId?: string,
) {
  if (entityType === "company") {
    revalidatePath(SETTINGS_COMPANY_PATH, "page");
    return;
  }
  revalidatePath(PRODUCTS_PATH, "page");
  if (entityType === "product-variant" && entityId?.trim()) {
    revalidatePath(`/catalog/products/variants/${entityId.trim()}`, "page");
  }
}

export type ListMultimediaResult =
  | { success: true; assets: MultimediaAssetListItem[] }
  | { success: false; error: string };

export async function listMultimediaForEntityAction(
  entityType: MultimediaEntityType,
  entityId: string,
): Promise<ListMultimediaResult> {
  return MultimediaRequest.listByEntity(entityType, entityId);
}

export async function uploadMultimediaForEntityAction(formData: FormData): Promise<
  { success: true; asset: MultimediaAssetListItem } | { success: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "Archivo requerido" };
  }
  const entityType = String(formData.get("entityType") ?? "").trim() as MultimediaEntityType;
  const entityId = String(formData.get("entityId") ?? "").trim();
  const isPrimary = formData.get("isPrimary") === "true" || formData.get("isPrimary") === "1";
  if (!ENTITY_TYPES.includes(entityType)) {
    return { success: false, error: "Tipo de entidad no válido" };
  }
  if (!entityId) {
    return { success: false, error: "Entidad no válida" };
  }
  const r = await MultimediaRequest.uploadForEntity({ file, entityType, entityId, isPrimary });
  if (r.success) {
    revalidatePathsForEntityType(entityType, entityId);
  }
  return r;
}

export async function setPrimaryMultimediaAssetAction(input: {
  entityType: MultimediaEntityType;
  entityId: string;
  assetId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await MultimediaRequest.setPrimaryForEntity({
    entityType: input.entityType,
    entityId: input.entityId.trim(),
    assetId: input.assetId.trim(),
  });
  if (r.success) {
    revalidatePathsForEntityType(input.entityType, input.entityId);
  }
  return r;
}

export async function unlinkMultimediaFromEntityAction(input: {
  assetId: string;
  entityType: MultimediaEntityType;
  entityId: string;
  usageType?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const r = await MultimediaRequest.unlinkFromEntity({
    assetId: input.assetId,
    entityType: input.entityType,
    entityId: input.entityId,
    usageType: input.usageType,
  });
  if (r.success) {
    revalidatePathsForEntityType(input.entityType, input.entityId);
  }
  return r;
}
