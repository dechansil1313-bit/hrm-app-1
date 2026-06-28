// src/auth.config.ts
import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

export const authConfig = {
  providers: [GitHub],
  callbacks: {
    // Hook triggered when creating or updating a session
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub; // Inject user database ID into the session
      }
      return session;
    },
    // Hook triggered when generating a JSON Web Token
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id; // Attach database user ID to the JWT
      }
      return token;
    },
  },
} satisfies NextAuthConfig;
