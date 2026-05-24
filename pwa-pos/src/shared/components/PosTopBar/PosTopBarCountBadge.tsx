/** Contador de icono en top bar POS: sin pastilla ni fondo (solo número). */
export function PosTopBarCountBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }
  return (
    <span
      className="pointer-events-none absolute -right-1 -top-1 min-w-[0.875rem] text-center text-[10px] font-bold leading-none tabular-nums text-red-600 dark:text-red-400"
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
