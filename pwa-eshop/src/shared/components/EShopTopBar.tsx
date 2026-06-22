"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconButton } from "@/shared/admin-shared";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";

type Props = {
  companyName: string;
  companyLogoUrl: string | null;
};

type NavItem =
  | { label: string; kind: "home-anchor"; anchor: string }
  | { label: string; kind: "route"; href: string };

const NAV: NavItem[] = [
  { label: "Productos", kind: "route", href: "/productos" },
  { label: "Encuéntranos", kind: "home-anchor", anchor: "#donde-estamos" },
  { label: "Nosotros", kind: "route", href: "/nosotros" },
];

function navHref(item: NavItem, pathname: string): string {
  if (item.kind === "route") {
    return item.href;
  }
  return pathname === "/" ? item.anchor : `/${item.anchor}`;
}

function navKey(item: NavItem): string {
  return item.kind === "route" ? item.href : item.anchor;
}

export function EShopTopBar({ companyName, companyLogoUrl }: Props) {
  const pathname = usePathname();
  const { itemCount, openDrawer } = useEShopCart();
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(companyLogoUrl?.trim()) && !logoFailed;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-primary text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          {showLogo ? (
            <EShopCompanyLogo
              companyName={companyName}
              logoUrl={companyLogoUrl}
              size="sm"
              onPrimary
              onError={() => setLogoFailed(true)}
            />
          ) : null}
          <span className="truncate text-sm font-semibold text-white">{companyName}</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={navKey(item)}
              href={navHref(item, pathname)}
              className="text-sm text-white/80 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="relative">
          <IconButton
            icon="ShoppingCart"
            variant="secondary"
            ariaLabel="Abrir carrito"
            onClick={openDrawer}
          />
          {itemCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 translate-x-[7px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-primary">
              {itemCount > 99 ? "99+" : itemCount}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
