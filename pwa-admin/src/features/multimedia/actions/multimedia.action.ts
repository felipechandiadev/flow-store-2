"use server";

import { revalidatePath } from "next/cache";
import { MultimediaRequest } from "../infrastructure/multimedia.request";
import type { MultimediaAssetListItem, MultimediaEntityType } from "../types/multimedia.types";

const PRODUCTS_PATH = "/inventory/products";

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
  if (entityType !== "product" && entityType !== "product-variant") {
    return { success: false, error: "Tipo de entidad no válido" };
  }
  if (!entityId) {
    return { success: false, error: "Entidad no válida" };
  }
  const r = await MultimediaRequest.uploadForEntity({ file, entityType, entityId, isPrimary });
  if (r.success) {
    revalidatePath(PRODUCTS_PATH, "page");
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
    revalidatePath(PRODUCTS_PATH, "page");
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
    revalidatePath(PRODUCTS_PATH, "page");
  }
  return r;
}
