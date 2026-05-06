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
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
            // backend suele responder { success, message } en algunos flows
            message: data?.message ?? data?.error ?? null,
          });
        }
        if (res.ok && data.user) {
          return {
            id: data.user.id,
            name:
              `${data.user.person?.firstName || ""} ${data.user.person?.lastName || ""}`.trim() ||
              data.user.userName,
            email: data.user.email,
            accessToken: data.user.id,
            role: data.user.rol ?? null,
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
      }
      return token;
    },
    session: async ({ session, token }) => {
      const backendUserId = (token.accessToken as string | undefined) || (token.sub as string | undefined);
      if (session.user) {
        if (backendUserId) session.user.id = backendUserId;
        (session.user as any).accessToken = token.accessToken;
        (session.user as any).role = token.role ?? undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};

