import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        userName: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        const res = await fetch(`${process.env.BACKEND_API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: credentials?.userName,
            password: credentials?.password,
          }),
        });

        const data = await res.json();
        if (res.ok && data.user) {
          return {
            id: data.user.id,
            name: `${data.user.person?.firstName || ''} ${data.user.person?.lastName || ''}`.trim() || data.user.userName,
            email: data.user.email,
            accessToken: data.user.id,  // Use user ID as token for now (adjust if backend provides JWT)
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) token.accessToken = user.accessToken;
      return token;
    },
    session: async ({ session, token }) => {
      // Canonical app user id (DB `users.id`). accessToken is set at login to the same value; keep id in sync so server actions don’t use a different `sub` from the JWT.
      const backendUserId = (token.accessToken as string | undefined) ||
        (token.sub as string | undefined);
      if (backendUserId) {
        session.user.id = backendUserId;
      }
      session.user.accessToken = token.accessToken;
      return session;
    },
  },
  pages: {
    signIn: '/',  // Página de login personalizada
  },
};