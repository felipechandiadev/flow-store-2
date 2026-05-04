export type MultimediaEntityType = "product" | "product-variant" | "company";

export type MultimediaAssetListItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  /** Solo si el backend envía el flag (links por entidad). */
  isPrimary?: boolean;
};
