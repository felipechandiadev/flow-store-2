import Link from "next/link";
import type { EShopStorefront } from "@/features/e-shop-storefront/types/storefront.types";
import { EShopCompanyLogo } from "@/shared/components/EShopCompanyLogo";
import { EShopPublicContactLinks } from "@/shared/components/EShopPublicContactLinks";
import { EShopSocialBrandLinks } from "@/shared/components/EShopSocialBrandLinks";

type Props = {
  storefront: EShopStorefront;
};

export function EShopFooter({ storefront }: Props) {
  const year = new Date().getFullYear();
  const contact = storefront.publicContact ?? {};

  return (
    <footer className="mt-16 bg-primary text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <EShopCompanyLogo
              companyName={storefront.companyName}
              logoUrl={storefront.companyLogoUrl}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-semibold">{storefront.companyName}</p>
              {storefront.tagline ? (
                <p className="mt-1 text-sm text-white/85">{storefront.tagline}</p>
              ) : null}
            </div>
          </div>
          {storefront.brandManifest ? (
            <p className="text-sm leading-relaxed text-white/85 whitespace-pre-line">
              {storefront.brandManifest}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Enlaces</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/nosotros" className="text-white hover:text-white/80">
                Nosotros
              </Link>
            </li>
            <li>
              <Link href="/donde-estamos" className="text-white hover:text-white/80">
                Encuéntranos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/75">Contacto</p>
          <EShopPublicContactLinks
            contact={contact}
            omit={["instagram", "tiktok", "facebook"]}
            className="mt-3 space-y-1 text-sm text-white/85"
            linkClassName="text-white/85 hover:text-white"
          />
          <EShopSocialBrandLinks contact={contact} className="mt-4 flex flex-wrap items-center gap-3" />
        </div>
      </div>
      <p className="border-t border-white/20 py-4 text-center text-xs text-white/75">
        © {year} {storefront.companyName}
      </p>
    </footer>
  );
}
