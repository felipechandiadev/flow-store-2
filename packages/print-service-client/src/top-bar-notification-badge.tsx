/** Contador sobre icono de top bar (misma pastilla que Admin `StockAlertsDropdown` / `NotificationsDropdown`). */
export function TopBarNotificationCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
      aria-hidden
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
