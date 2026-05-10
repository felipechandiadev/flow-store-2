import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      accessToken?: string;
      role?: string;
      companyId?: string | null;
      activeCompanyId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    role?: string;
    companyId?: string | null;
    activeCompanyId?: string | null;
  }
}

