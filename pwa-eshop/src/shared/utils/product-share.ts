export type ProductShareNetwork = "whatsapp" | "facebook" | "instagram";

export type ProductShareChannel =
  | {
      id: ProductShareNetwork;
      label: string;
      action: "open";
      href: string;
    }
  | {
      id: ProductShareNetwork;
      label: string;
      action: "copy";
      copyText: string;
      successMessage: string;
    };

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === "undefined") {
    return false;
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/** WhatsApp, Facebook e Instagram (copiar enlace; IG no expone URL de share web). */
export function buildProductShareChannels(input: {
  url: string;
  title: string;
}): ProductShareChannel[] {
  const pageUrl = input.url.trim();
  const title = input.title.trim();
  const encodedUrl = encodeURIComponent(pageUrl);
  const shareText = `${title} ${pageUrl}`.trim();
  const encodedText = encodeURIComponent(shareText);

  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      action: "open",
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      action: "open",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      id: "instagram",
      label: "Instagram",
      action: "copy",
      copyText: shareText,
      successMessage: "Enlace copiado — pégalo en Instagram",
    },
  ];
}

export function openShareWindow(href: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.open(href, "_blank", "noopener,noreferrer,width=640,height=720");
}
