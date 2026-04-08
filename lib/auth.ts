import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { loginBodySchema } from "@/lib/schemas/action-plan";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/auth/signin"
  },
  providers: [
    Credentials({
      name: "Најава",
      credentials: {
        username: {
          label: "Корисничко име",
          type: "text"
        },
        password: {
          label: "Лозинка",
          type: "password"
        }
      },
      async authorize(credentials) {
        const parsed = loginBodySchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: parsed.data.username.trim().toLowerCase()
          }
        });

        if (!user || !user.active) {
          return null;
        }

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.username = (token.username as string | undefined) ?? "";
        session.user.role = (token.role as "admin" | "editor" | "viewer" | undefined) ?? "viewer";
      }

      return session;
    }
  }
});
