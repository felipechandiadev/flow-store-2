"use client";

import { useEffect } from "react";
import { useEShopCart } from "@/features/e-shop-cart/EShopCartProvider";
import { getFeaturedProductsAction } from "@/features/e-shop-storefront/actions/storefront.action";

export function StorefrontCartSync({ threshold }: { threshold: number | null }) {
  const { setFreeShippingThreshold, setCrossSell } = useEShopCart();
  useEffect(() => {
    setFreeShippingThreshold(threshold);
  }, [threshold, setFreeShippingThreshold]);
  useEffect(() => {
    getFeaturedProductsAction().then((r) => setCrossSell(r.items ?? []));
  }, [setCrossSell]);
  return null;
}
