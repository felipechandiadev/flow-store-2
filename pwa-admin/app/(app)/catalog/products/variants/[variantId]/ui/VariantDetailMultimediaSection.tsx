"use client";

import { EntityMultimediaPanel } from "../../../ui/EntityMultimediaPanel";

type VariantDetailMultimediaSectionProps = {
  variantId: string;
};

export function VariantDetailMultimediaSection({ variantId }: VariantDetailMultimediaSectionProps) {
  return (
    <section className="space-y-2 rounded-lg border border-border bg-background p-4" data-test-id="pv-section-multimedia">
      <h2 className="text-sm font-semibold text-foreground">Multimedia</h2>
      <EntityMultimediaPanel
        entityType="product-variant"
        entityId={variantId}
        omitHeading
        collectionOnly
      />
    </section>
  );
}
