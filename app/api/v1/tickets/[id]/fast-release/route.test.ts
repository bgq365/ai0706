const { requireSessionMock: fastReleaseSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(async () => ({
    user: {
      id: "user-l2-01",
      name: "王倩",
      email: "l2@v3.demo",
      warehouseId: "wh-sh-01",
      roles: ["level2_approver", "qc_supervisor"],
    },
    response: null,
  })),
}));

vi.mock("@/lib/server-auth", () => ({
  requireSession: fastReleaseSessionMock,
  requireRole: (user: { roles: string[] }, roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));

import { POST } from "@/app/api/v1/tickets/[id]/fast-release/route";
import { getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/tickets/[id]/fast-release", () => {
  beforeEach(() => {
    resetMockStore();
    fastReleaseSessionMock.mockResolvedValue({
      user: {
        id: "user-l2-01",
        name: "王倩",
        email: "l2@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["level2_approver", "qc_supervisor"],
      },
      response: null,
    });
  });

  it("returns 422 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-001/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "x" }),
      }),
      { params: Promise.resolve({ id: "ticket-001" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 403 when caller is not qc supervisor", async () => {
    fastReleaseSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-l1-01",
        name: "李瑞",
        email: "l1@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["level1_approver"],
      },
      response: null,
    });

    const ticket = getTicket("ticket-001")!;
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-001/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "无权限尝试", expectedVersion: ticket.version, requestToken: "fast-deny-001" }),
      }),
      { params: Promise.resolve({ id: "ticket-001" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 404 for missing ticket", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/missing/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "误判放行", expectedVersion: 1, requestToken: "fast-missing-001" }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 for non-qc ticket", async () => {
    const ticket = getTicket("ticket-002")!;
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "非品控放行", expectedVersion: ticket.version, requestToken: "fast-invalid-001" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 for stale version", async () => {
    const ticket = getTicket("ticket-001")!;
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-001/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "版本过期", expectedVersion: ticket.version - 1, requestToken: "fast-stale-001" }),
      }),
      { params: Promise.resolve({ id: "ticket-001" }) },
    );

    expect(response.status).toBe(409);
  });

  it("fast releases a qc ticket", async () => {
    const ticket = getTicket("ticket-001")!;
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-001/fast-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "误判放行", expectedVersion: ticket.version, requestToken: "fast-ok-001" }),
      }),
      { params: Promise.resolve({ id: "ticket-001" }) },
    );

    expect(response.status).toBe(200);
    expect(getTicket("ticket-001")?.status).toBe("completed");
  });
});
