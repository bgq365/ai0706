vi.mock("@/lib/auth", () => ({
  setSessionCookie: vi.fn(async () => undefined),
  signSession: vi.fn(() => "signed-token"),
}));

import { POST } from "@/app/api/v1/auth/login/route";
import * as authModule from "@/lib/auth";

describe("POST /api/v1/auth/login", () => {
  beforeEach(() => {
    vi.mocked(authModule.setSessionCookie).mockClear();
    vi.mocked(authModule.signSession).mockClear();
  });

  it("returns 422 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bad", password: "123" }),
      }),
    );

    expect(response.status).toBe(422);
  });

  it("returns 401 for wrong password", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@v3.demo", password: "wrongpass" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("sets a session cookie on successful login", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@v3.demo", password: "demo123456" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(authModule.signSession).toHaveBeenCalledTimes(1);
    expect(authModule.setSessionCookie).toHaveBeenCalledWith("signed-token");
  });
});
