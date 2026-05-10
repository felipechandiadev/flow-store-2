import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

/** En dev cada app usa su propio origen (p. ej. :3022 vs admin :3021): las cookies ya no se mezclan. Nombres explícitos por si más adelante comparten host detrás de un proxy. */
const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session.flowstore-pos" : "next-auth.session.flowstore-pos",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        userName: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const url = `${process.env.BACKEND_API_URL}/api/auth/login`;
        // Empresa fija de este deployment de POS. Si está definida, se envía
        // como header para que el backend valide que el usuario pertenece (o
        // —si es ADMIN— tenga acceso) a esa empresa específica.
        const companyId = process.env.NEXT_PUBLIC_COMPANY_ID || process.env.COMPANY_ID || null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (companyId) {
          headers["X-Active-Company-Id"] = companyId;
        }
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          console.warn("[POS][auth] Login failed", {
            url,
            status: res.status,
            message: data?.message ?? data?.error ?? null,
          });
        }
        if (res.ok && data.user) {
          // Validar que el operator pertenece a la company del deployment.
          const userCompanyId = data.user.companyId ?? null;
          const role = data.user.rol ?? null;
          if (companyId && role === "OPERATOR" && userCompanyId !== companyId) {
            console.warn("[POS][auth] Operator no pertenece a la empresa configurada", {
              userCompanyId,
              expected: companyId,
            });
            return null;
          }
          return {
            id: data.user.id,
            name:
              `${data.user.person?.firstName || ""} ${data.user.person?.lastName || ""}`.trim() ||
              data.user.userName,
            email: data.user.email,
            accessToken: data.user.id,
            role,
            companyId: userCompanyId,
            // ADMIN: usar la company del deployment como activa.
            // OPERATOR: usar su companyId.
            activeCompanyId: role === "ADMIN" ? companyId : userCompanyId,
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.role = (user as any).role ?? null;
        token.companyId = (user as any).companyId ?? null;
        token.activeCompanyId = (user as any).activeCompanyId ?? null;
      }
      return token;
    },
    session: async ({ session, token }) => {
      const backendUserId = (token.accessToken as string | undefined) || (token.sub as string | undefined);
      if (session.user) {
        if (backendUserId) session.user.id = backendUserId;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).role = token.role ?? undefined;
        (session.user as any).companyId = token.companyId ?? null;
        (session.user as any).activeCompanyId = token.activeCompanyId ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

