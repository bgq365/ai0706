describe("server-auth", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth");
  });

  it("returns unauthorized response when session is missing", async () => {
    vi.doMock("@/lib/auth", () => ({
      getSessionUser: vi.fn(async () => null),
    }));

    const { requireSession } = await import("@/lib/server-auth");
    const result = await requireSession();

    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(401);
  });

  it("checks role membership", async () => {
    const { requireRole } = await import("@/lib/server-auth");
    const matched = requireRole(
      {
        id: "u",
        name: "测试",
        email: "a@test",
        warehouseId: "wh-1",
        roles: ["level1_approver"],
      },
      ["level1_approver", "admin"],
    );

    expect(matched).toBe(true);
  });
});
