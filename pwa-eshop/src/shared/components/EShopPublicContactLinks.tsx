import type { EShopStorefront } from "@/features/e-shop-storefront/types/storefront.types";

type PublicContact = NonNullable<EShopStorefront["publicContact"]>;

function socialLabel(url: string, network: "instagram" | "tiktok"): string {
  try {
    const path = new URL(url).pathname.replace(/\/$/, "");
    if (network === "instagram") {
      const handle = path.split("/").filter(Boolean).pop();
      return handle ? `@${handle}` : "Instagram";
    }
    const match = path.match(/@([^/]+)/);
    return match ? `@${match[1]}` : "TikTok";
  } catch {
    return network === "instagram" ? "Instagram" : "TikTok";
  }
}

type Props = {
  contact: PublicContact;
  className?: string;
  linkClassName?: string;
};

export function EShopPublicContactLinks({
  contact,
  className = "space-y-1 text-sm",
  linkClassName = "hover:underline",
}: Props) {
  const items: Array<{ key: string; href: string; label: string; external?: boolean }> = [];

  if (contact.phone?.trim()) {
    items.push({
      key: "phone",
      href: `tel:${contact.phone.trim().replace(/\s+/g, "")}`,
      label: contact.phone.trim(),
    });
  }
  if (contact.email?.trim()) {
    items.push({
      key: "email",
      href: `mailto:${contact.email.trim()}`,
      label: contact.email.trim(),
    });
  }
  if (contact.instagram?.trim()) {
    items.push({
      key: "instagram",
      href: contact.instagram.trim(),
      label: socialLabel(contact.instagram.trim(), "instagram"),
      external: true,
    });
  }
  if (contact.tiktok?.trim()) {
    items.push({
      key: "tiktok",
      href: contact.tiktok.trim(),
      label: socialLabel(contact.tiktok.trim(), "tiktok"),
      external: true,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={className}>
      {items.map((item) => (
        <li key={item.key}>
          <a
            href={item.href}
            className={linkClassName}
            {...(item.external
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
