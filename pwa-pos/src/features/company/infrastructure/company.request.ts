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
    if (!token) {
      return null;
    }

    try {
      const res = await fetch(`${base}/api/company`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

