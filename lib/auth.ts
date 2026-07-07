import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getJwtSecret, getSessionCookieSecureFlag } from "@/lib/env";
import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE = "v3_session";

interface SessionPayload {
  sub: string;
  user: SessionUser;
}

export function signSession(user: SessionUser) {
  return jwt.sign(
    {
      sub: user.id,
      user,
    } satisfies SessionPayload,
    getJwtSecret(),
    { expiresIn: "12h" },
  );
}

export function verifySession(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;
    return payload.user;
  } catch {
    return null;
  }
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionCookieSecureFlag(),
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: getSessionCookieSecureFlag(),
    path: "/",
    maxAge: 0,
  });
}
