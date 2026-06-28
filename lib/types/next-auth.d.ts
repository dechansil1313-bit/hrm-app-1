// lib/types/next-auth.d.ts
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      employeeId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    employeeId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    employeeId?: string;
  }
}
