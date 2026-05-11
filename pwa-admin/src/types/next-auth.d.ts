import NextAuth from 'next-auth';

export interface SessionCompany {
  id: string;
  razonSocial: string;
  nombreFantasia: string | null;
}

export type FlowstoreUserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      accessToken?: string;
      role?: FlowstoreUserRole | string | null;
      companyId?: string | null;
      activeCompanyId?: string | null;
      companies?: SessionCompany[] | null;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    accessToken?: string;
    role?: FlowstoreUserRole | string | null;
    companyId?: string | null;
    activeCompanyId?: string | null;
    companies?: SessionCompany[] | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    role?: FlowstoreUserRole | string | null;
    companyId?: string | null;
    activeCompanyId?: string | null;
    companies?: SessionCompany[] | null;
  }
}