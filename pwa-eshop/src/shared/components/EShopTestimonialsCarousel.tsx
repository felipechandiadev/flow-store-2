"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/shared/admin-shared";
import type { EShopTestimonial } from "@/features/e-shop-storefront/types/storefront.types";
import { TestimonialCard } from "@/app/(store)/ui/TestimonialCard";

const VISIBLE_COUNT = 3;
const GAP_PX = 16;

type Props = {
  testimonials: EShopTestimonial[];
};

export function EShopTestimonialsCarousel({ testimonials }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);
  const [stepPx, setStepPx] = useState(0);

  const maxStart = Math.max(0, testimonials.length - VISIBLE_COUNT);
  const canGoPrev = startIndex > 0;
  const canGoNext = startIndex < maxStart;

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const cardWidth = (viewport.clientWidth - GAP_PX * (VISIBLE_COUNT - 1)) / VISIBLE_COUNT;
    setStepPx(cardWidth + GAP_PX);
  }, []);

  useEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [measure, testimonials.length]);

  useEffect(() => {
    setStartIndex((prev) => Math.min(prev, maxStart));
  }, [maxStart]);

  if (testimonials.length === 0) {
    return null;
  }

  const showNav = testimonials.length > VISIBLE_COUNT;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Qué dicen nuestros clientes</h2>
        {showNav ? (
          <div className="flex shrink-0 items-center gap-1">
            {canGoPrev ? (
              <IconButton
                icon="ChevronLeft"
                variant="text"
                size="md"
                ariaLabel="Testimonio anterior"
                className="eshop-hero-carousel-nav-shadow rounded-full border border-border bg-background/90"
                onClick={() => setStartIndex((i) => Math.max(0, i - 1))}
              />
            ) : null}
            {canGoNext ? (
              <IconButton
                icon="ChevronRight"
                variant="text"
                size="md"
                ariaLabel="Testimonio siguiente"
                className="eshop-hero-carousel-nav-shadow rounded-full border border-border bg-background/90"
                onClick={() => setStartIndex((i) => Math.min(maxStart, i + 1))}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            gap: GAP_PX,
            transform: stepPx > 0 ? `translateX(-${startIndex * stepPx}px)` : undefined,
          }}
          role="list"
          aria-live="polite"
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="shrink-0"
              style={{
                width:
                  stepPx > 0
                    ? stepPx - GAP_PX
                    : `calc((100% - ${GAP_PX * (VISIBLE_COUNT - 1)}px) / ${VISIBLE_COUNT})`,
              }}
              role="listitem"
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
