"use client";

import dynamic from "next/dynamic";
import type { EShopBranch } from "@/features/e-shop-storefront/types/storefront.types";

const EShopBranchesMapInner = dynamic(() => import("./EShopBranchesMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="h-64 animate-pulse rounded-xl border border-border bg-muted/30"
      aria-hidden
    />
  ),
});

type Props = { branches: EShopBranch[] };

type BranchWithLocation = EShopBranch & { location: { lat: number; lng: number } };

function hasLocation(branch: EShopBranch): branch is BranchWithLocation {
  return branch.location?.lat != null && branch.location?.lng != null;
}

export function BranchesMap({ branches }: Props) {
  const withLoc = branches.filter(hasLocation);

  if (withLoc.length === 0) {
    return (
      <ul className="space-y-2 text-sm text-muted-foreground">
        {branches.map((b) => (
          <li key={b.id}>
            <strong className="text-foreground">{b.name}</strong>
            {b.address ? ` — ${b.address}` : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <EShopBranchesMapInner branches={withLoc} />
      <ul className="space-y-2 text-sm">
        {branches.map((b) => (
          <li key={b.id}>
            <strong>{b.name}</strong>
            {b.address ? ` — ${b.address}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
