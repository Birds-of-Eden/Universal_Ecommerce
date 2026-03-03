import { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      roleNames?: string[];
      permissions?: string[];
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role?: string;
    roleNames?: string[];
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string;
    roleNames?: string[];
    permissions?: string[];
  }
}
