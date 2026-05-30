import { getServerBackendApiBase } from "@/lib/backend-api-url";
import { parseEshopErrorResponse } from "./eshop-api-error";

const slugHeader = (slug: string) => ({ "X-EShop-Store-Slug": slug });

function apiUrl(path: string): string {
  const base = getServerBackendApiBase();
  return `${base}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export class EShopRequest {
  static async get<T>(slug: string, path: string): Promise<T> {
    const res = await fetch(apiUrl(path), {
      headers: { "Content-Type": "application/json", ...slugHeader(slug) },
      cache: "no-store",
    });
    if (!res.ok) {
      throw await parseEshopErrorResponse(res);
    }
    return res.json() as Promise<T>;
  }

  static async post<T>(slug: string, path: string, body: unknown): Promise<T> {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...slugHeader(slug) },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      throw await parseEshopErrorResponse(res);
    }
    return res.json() as Promise<T>;
  }
}
