import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";

export type CompanyDetails = {
  id: string | null;
  razonSocial: string;
  nombreFantasia: string | null;
};

type CompanyApiResponse = {
  id?: string | null;
  razonSocial?: string;
  nombreFantasia?: string | null;
};

export class CompanyRequest {
  static async getDetails(): Promise<CompanyDetails | null> {
    const base = process.env.BACKEND_API_URL;
    if (!base) {
      throw new Error("BACKEND_API_URL is not set");
    }

    const session = await getServerSession(authOptions);
    const token = session?.user?.accessToken;
    const activeCompanyId = (session?.user as any)?.activeCompanyId as string | null | undefined;
    if (!token) {
      return null;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
      const res = await fetch(`${base}/api/company`, {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as CompanyApiResponse;
      if (!data?.razonSocial) {
        return null;
      }

      return {
        id: data.id != null && String(data.id).trim() !== "" ? String(data.id).trim() : null,
        razonSocial: String(data.razonSocial),
        nombreFantasia:
          data.nombreFantasia != null && String(data.nombreFantasia).trim() !== ""
            ? String(data.nombreFantasia).trim()
            : null,
      };
    } catch {
      return null;
    }
  }
}

