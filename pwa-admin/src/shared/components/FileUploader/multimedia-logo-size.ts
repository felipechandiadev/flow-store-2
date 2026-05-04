import type { MultimediaBannerSize } from "./multimedia-banner-size";
import { bannerPlaceholderIconDimension } from "./multimedia-banner-size";

/** Misma escala que banner (`xs` … `full`), aplicada a un área **cuadrada** 1:1. */
export type MultimediaLogoSize = MultimediaBannerSize;

/** Contenedor logo: proporción 1:1, ancho máximo por escala (alineado a `bannerAreaClassName`). */
export function logoAreaClassName(size: MultimediaLogoSize | undefined): string {
  const key = size ?? "md";
  const width =
    key === "xs"
      ? "max-w-[200px]"
      : key === "sm"
        ? "max-w-[280px]"
        : key === "md"
          ? "max-w-[480px]"
          : key === "lg"
            ? "max-w-[640px]"
            : key === "xl"
              ? "max-w-[960px]"
              : "max-w-none";
  const center = key === "full" ? "" : "mx-auto";
  return `relative w-full ${width} aspect-square overflow-hidden flex cursor-pointer items-center justify-center rounded-lg border border-border bg-muted/25 transition-colors hover:border-blue-500 ${center}`.trim();
}

export function logoPlaceholderIconDimension(size: MultimediaLogoSize | undefined): number {
  return bannerPlaceholderIconDimension(size);
}
