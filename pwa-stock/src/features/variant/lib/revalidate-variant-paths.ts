import { revalidatePath } from "next/cache";
import { VARIANT_REVALIDATE_PATHS } from "./variant-routes";

export function revalidateVariantPaths() {
  for (const path of VARIANT_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/variant", "layout");
}
