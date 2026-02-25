export { signIn, signOut, useSession } from "next-auth/react";

export function isAdmin(role?: string) {
  return role?.toLowerCase() === "admin";
}
