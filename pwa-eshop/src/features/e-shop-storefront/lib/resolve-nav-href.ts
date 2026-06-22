import type { EShopNavLink } from "../types/storefront.types";

/** Resuelve href de navegación según pathname (anclas en home vs rutas). */
export function resolveEShopNavHref(link: EShopNavLink, pathname: string): string {
  if (link.kind === "external") return link.href;
  if (link.kind === "route") return link.href;
  const anchor = link.href.startsWith("#") ? link.href : `#${link.href}`;
  return pathname === "/" ? anchor : `/${anchor.slice(1)}`;
}

export function eshopNavLinkKey(link: EShopNavLink): string {
  return link.id;
}

export function sortEnabledNavLinks<T extends EShopNavLink>(links: T[]): T[] {
  return [...links]
    .filter((l) => l.enabled)
    .sort((a, b) => a.order - b.order);
}
