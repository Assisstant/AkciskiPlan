import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      username: string;
      role: "admin" | "editor" | "viewer";
    };
  }

  interface User {
    id: string;
    username: string;
    role: "admin" | "editor" | "viewer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    role?: "admin" | "editor" | "viewer";
  }
}
