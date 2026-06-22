import type { CompanyEShopFooterSettings } from "../types/eshop-footer.types";

type Props = {
  footer: CompanyEShopFooterSettings;
  companyName?: string;
};

export function EShopFooterPreview({ footer, companyName = "Mi tienda" }: Props) {
  const groups = [...footer.linkGroups]
    .filter((g) => g.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border shadow-sm text-sm"
      data-test-id="eshop-footer-preview"
    >
      <div className="grid gap-4 bg-primary p-4 text-white md:grid-cols-3">
        {footer.showLogo || footer.showTagline ? (
          <div>
            <p className="font-semibold">{companyName}</p>
            {footer.showTagline ? (
              <p className="mt-1 text-xs text-white/80">Tagline de ejemplo</p>
            ) : null}
          </div>
        ) : null}
        {groups.map((g) => (
          <div key={g.id}>
            <p className="text-xs font-semibold uppercase text-white/75">{g.title}</p>
            <ul className="mt-2 space-y-1 text-xs text-white/85">
              {g.links
                .filter((l) => l.enabled)
                .map((l) => (
                  <li key={l.id}>{l.label}</li>
                ))}
            </ul>
          </div>
        ))}
        {footer.showContactBlock ? (
          <div>
            <p className="text-xs font-semibold uppercase text-white/75">Contacto</p>
            <p className="mt-2 text-xs text-white/85">contacto@empresa.cl</p>
          </div>
        ) : null}
      </div>
      <p className="border-t border-white/20 bg-primary px-4 py-2 text-center text-xs text-white/75">
        © {new Date().getFullYear()} {companyName}
        {footer.copyrightSuffix ? ` — ${footer.copyrightSuffix}` : ""}
      </p>
    </div>
  );
}
