export type RecipeTypeDto = "SERVICE" | "PRODUCTION";

export type RecipeLineDto = {
  id?: string;
  inputVariantId: string;
  qtyPerOutputUnit: number;
  wasteFactor?: number;
  sortOrder?: number;
};

export type RecipeDto = {
  id: string;
  outputVariantId: string;
  type: RecipeTypeDto;
  version: number;
  isActive: boolean;
  lines?: RecipeLineDto[];
};
