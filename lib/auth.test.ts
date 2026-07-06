import type { SessionUser } from "@/lib/types";

const cookieStore = {
  values: new Map<string, string>(),
  get(name: string) {
    const value = this.values.get(name);
    return value ? { value } : undefined;
  },
  set(name: string, value: string) {
    this.values.set(name, value);
  },
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

describe("auth helpers", () => {
  const user: SessionUser = {
    id: "user-1",
    name: "测试用户",
    email: "user@test.local",
    warehouseId: "wh-sh-01",
    roles: ["admin"],
  };

  beforeEach(() => {
    cookieStore.values.clear();
  });

  it("signs and verifies a session token", async () => {
    const { signSession, verifySession } = await import("@/lib/auth");
    const token = signSession(user);

    expect(verifySession(token)?.email).toBe(user.email);
    expect(verifySession("bad-token")).toBeNull();
  });

  it("reads and writes the session cookie", async () => {
    const { getSessionUser, setSessionCookie, clearSessionCookie, signSession } = await import("@/lib/auth");
    const token = signSession(user);

    await setSessionCookie(token);
    expect((await getSessionUser())?.id).toBe(user.id);

    await clearSessionCookie();
    expect(await getSessionUser()).toBeNull();
  });
});
