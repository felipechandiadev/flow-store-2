"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ESHOP_HERO } from "@/features/e-shop-storefront/constants/hero";
import type { EShopHeroSlide } from "@/features/e-shop-storefront/types/storefront.types";
import { storeContentContainerClassName } from "@/shared/layout/store-content-layout";
import {
  getHeroSlideTextPresentation,
  heroSlideCarouselIndicatorStyle,
  heroSlideLinkCtaStyle,
  heroSlideSubtitleStyle,
  heroSlideTitleStyle,
  heroSlideUsesCustomTextColor,
} from "@/shared/utils/hero-slide-text-color";

const DEFAULT_AUTOPLAY_SECONDS = 6;
const MIN_AUTOPLAY_SECONDS = 3;

const TEXT_ALIGN_CLASS: Record<EShopHeroSlide["textAlign"], string> = {
  left: "items-start text-left",
  center: "items-center text-center mx-auto",
  right: "items-end text-right ml-auto",
};

function FallbackHero() {
  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 eshop-hero-section-shadow"
    >
      <div className="flex min-h-[320px] flex-col justify-end pb-12 pt-16 text-foreground md:min-h-[480px] md:pb-16">
        <div className={storeContentContainerClassName}>
          <div className="max-w-2xl eshop-hero-text-shadow">
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">{ESHOP_HERO.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{ESHOP_HERO.subtitle}</p>
            <Link
              href={ESHOP_HERO.ctaTarget}
              className="mt-8 inline-flex min-h-[44px] items-center rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-primary"
            >
              {ESHOP_HERO.ctaLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function resolveCtaStyle(slide: EShopHeroSlide): "none" | "button" | "link" {
  if (slide.ctaStyle === "button" || slide.ctaStyle === "link" || slide.ctaStyle === "none") {
    return slide.ctaStyle;
  }
  return slide.ctaLabel?.trim() ? "button" : "none";
}

function HeroCta({ slide }: { slide: EShopHeroSlide }) {
  const ctaStyle = resolveCtaStyle(slide);
  if (ctaStyle === "none" || !slide.ctaLabel?.trim()) return null;
  const href = slide.ctaHref?.trim() || "#productos";
  const isExternal = href.startsWith("http://") || href.startsWith("https://");
  const linkStyle = heroSlideLinkCtaStyle(slide.textColor);

  if (ctaStyle === "link") {
    const presentation = getHeroSlideTextPresentation(slide.textColor);
    const linkClass = presentation.usesCustomColor
      ? "mt-8 inline-block text-base font-medium underline underline-offset-4 transition hover:opacity-80"
      : "mt-8 inline-block text-base font-medium text-foreground underline underline-offset-4 transition hover:text-muted-foreground";
    if (isExternal) {
      return (
        <a href={href} className={linkClass} style={linkStyle} target="_blank" rel="noopener noreferrer">
          {slide.ctaLabel}
        </a>
      );
    }
    return (
      <Link href={href} className={linkClass} style={linkStyle}>
        {slide.ctaLabel}
      </Link>
    );
  }

  const buttonClass =
    "mt-8 inline-flex min-h-[44px] items-center rounded-lg bg-secondary px-6 py-3 text-sm font-semibold text-primary transition hover:opacity-95 [text-shadow:none]";

  if (isExternal) {
    return (
      <a href={href} className={buttonClass} style={{ textShadow: "none" }} target="_blank" rel="noopener noreferrer">
        {slide.ctaLabel}
      </a>
    );
  }

  return (
    <Link href={href} className={buttonClass} style={{ textShadow: "none" }}>
      {slide.ctaLabel}
    </Link>
  );
}

function HeroSlideBackground({ slide }: { slide: EShopHeroSlide }) {
  if (slide.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  return <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />;
}

function HeroSlideCopy({ slide }: { slide: EShopHeroSlide }) {
  const alignClass = TEXT_ALIGN_CLASS[slide.textAlign] ?? TEXT_ALIGN_CLASS.left;
  const presentation = getHeroSlideTextPresentation(slide.textColor);
  const titleStyle = heroSlideTitleStyle(slide.textColor);
  const subtitleStyle = heroSlideSubtitleStyle(slide.textColor);

  return (
    <div className={`flex max-w-2xl flex-col ${alignClass}`}>
      {slide.title ? (
        <h1
          className={`text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl ${presentation.usesCustomColor ? "" : "text-foreground eshop-hero-text-shadow"}`}
          style={titleStyle}
        >
          {slide.title}
        </h1>
      ) : null}
      {slide.subtitle ? (
        <p
          className={`mt-4 text-lg md:text-xl ${presentation.usesCustomColor ? "" : "text-muted-foreground eshop-hero-text-shadow"}`}
          style={subtitleStyle}
        >
          {slide.subtitle}
        </p>
      ) : null}
      <HeroCta slide={slide} />
    </div>
  );
}

/** Un solo slide activo: hero estático, sin controles ni autoplay. */
function EShopHero({ slide }: { slide: EShopHeroSlide }) {
  return (
    <section id="hero" className="relative w-full overflow-hidden eshop-hero-section-shadow">
      <div className="relative min-h-[320px] w-full md:min-h-[480px]">
        <HeroSlideBackground slide={slide} />
        <div className="relative z-10 flex min-h-[320px] flex-col justify-end pb-12 pt-16 text-foreground md:min-h-[480px] md:pb-16">
          <div className={storeContentContainerClassName}>
            <HeroSlideCopy slide={slide} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Dos o más slides: carrusel con flechas, puntos y autoplay. */
function resolveAutoplayMs(autoplaySeconds: number): number {
  const seconds = Math.max(
    MIN_AUTOPLAY_SECONDS,
    Math.round(autoplaySeconds) || DEFAULT_AUTOPLAY_SECONDS,
  );
  return seconds * 1000;
}

function EShopHeroCarousel({
  slides,
  autoplaySeconds,
}: {
  slides: EShopHeroSlide[];
  autoplaySeconds: number;
}) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  const goTo = useCallback(
    (next: number) => {
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const autoplayMs = resolveAutoplayMs(autoplaySeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, autoplayMs);
    return () => window.clearInterval(timer);
  }, [count, autoplayMs]);

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden eshop-hero-section-shadow"
      aria-roledescription="carousel"
      aria-label="Destacados de la tienda"
    >
      <div className="relative min-h-[320px] w-full md:min-h-[480px]">
        {slides.map((slide, i) => {
          const active = i === index;

          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                active ? "z-10 opacity-100" : "z-0 pointer-events-none opacity-0"
              }`}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={slide.title ?? `Slide ${i + 1}`}
            >
              <HeroSlideBackground slide={slide} />
              <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-end pb-20 pt-16 text-foreground md:min-h-[480px] md:pb-24">
                <div className={storeContentContainerClassName}>
                  <HeroSlideCopy slide={slide} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground eshop-hero-carousel-nav-shadow transition hover:bg-muted md:left-5"
        aria-label="Slide anterior"
        onClick={() => goTo(index - 1)}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 text-foreground eshop-hero-carousel-nav-shadow transition hover:bg-muted md:right-5"
        aria-label="Slide siguiente"
        onClick={() => goTo(index + 1)}
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
        {slides.map((slide, i) => {
          const presentation = getHeroSlideTextPresentation(slide.textColor);
          const active = i === index;
          const useThemeIndicators = !presentation.usesCustomColor;

          return (
            <button
              key={slide.id}
              type="button"
              className={`h-2.5 rounded-full transition-all ${
                useThemeIndicators ? "eshop-hero-carousel-indicator-shadow" : ""
              } ${useThemeIndicators ? (active ? "w-8 bg-foreground" : "w-2.5 bg-foreground/40 hover:bg-foreground/60") : active ? "w-8" : "w-2.5 hover:opacity-80"}`}
              style={useThemeIndicators ? undefined : presentation.indicatorStyle(active)}
              aria-label={`Ir al slide ${i + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          );
        })}
      </div>
    </section>
  );
}

export function EShopHeroSlider({
  slides,
  autoplaySeconds = DEFAULT_AUTOPLAY_SECONDS,
}: {
  slides: EShopHeroSlide[];
  autoplaySeconds?: number;
}) {
  if (slides.length === 0) {
    return <FallbackHero />;
  }
  if (slides.length === 1) {
    return <EShopHero slide={slides[0]} />;
  }
  return <EShopHeroCarousel slides={slides} autoplaySeconds={autoplaySeconds} />;
}
