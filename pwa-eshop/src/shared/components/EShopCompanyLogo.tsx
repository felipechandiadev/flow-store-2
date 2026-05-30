"use client";

import { useState } from "react";

type Props = {
  companyName: string;
  logoUrl: string | null | undefined;
  /** Top bar: compacto. Footer: más grande sobre fondo primario. */
  size?: "sm" | "md";
  /** Logo sobre fondo `bg-primary` (caja blanca detrás). */
  onPrimary?: boolean;
  className?: string;
  /** Se invoca si la imagen falla al cargar (para fallback en el padre). */
  onError?: () => void;
};

export function EShopCompanyLogo({
  companyName,
  logoUrl,
  size = "sm",
  onPrimary = false,
  className = "",
  onError,
}: Props) {
  const src = logoUrl?.trim() ?? "";
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return null;
  }

  const dim = size === "md" ? "h-10 w-auto max-w-[140px]" : "h-8 w-auto max-w-[120px]";

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinámica del backend (multimedia empresa).
    <img
      src={src}
      alt={companyName}
      className={`${dim} object-contain`}
      onError={() => {
        setFailed(true);
        onError?.();
      }}
    />
  );

  if (onPrimary) {
    return (
      <div className={`inline-flex rounded-lg bg-white px-3 py-2 ${className}`.trim()}>
        {img}
      </div>
    );
  }

  return <div className={`inline-flex shrink-0 items-center ${className}`.trim()}>{img}</div>;
}
