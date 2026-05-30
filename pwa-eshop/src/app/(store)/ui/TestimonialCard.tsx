import type { EShopTestimonial } from "@/features/e-shop-storefront/types/storefront.types";

export function TestimonialCard({ testimonial }: { testimonial: EShopTestimonial }) {
  const { clientName, rating, message, avatarUrl } = testimonial;

  return (
    <blockquote className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <p className="flex-1 text-sm text-foreground">&ldquo;{message}&rdquo;</p>
      <footer className="flex items-center gap-3">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full object-cover"
            width={40}
            height={40}
          />
        ) : (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            aria-hidden
          >
            {clientName.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{clientName}</p>
          <p className="text-xs text-amber-600" aria-label={`${rating} de 5 estrellas`}>
            {"★".repeat(rating)}
            <span className="sr-only">{rating} de 5</span>
          </p>
        </div>
      </footer>
    </blockquote>
  );
}
