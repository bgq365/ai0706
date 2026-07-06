import { getSessionUser } from "@/lib/auth";
import { fail } from "@/lib/response";
import type { SessionUser, UserRole } from "@/lib/types";

export async function requireSession() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: fail(401, "unauthorized", "Missing or invalid session."),
    };
  }
  return { user, response: null };
}

export function requireRole(user: SessionUser, roles: UserRole[]) {
  return roles.some((role) => user.roles.includes(role));
}
