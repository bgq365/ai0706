const { requireSessionMock: rejectRequireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(async () => ({
    user: {
      id: "approver-l1",
      name: "一级审批",
      email: "l1@test.local",
      warehouseId: "wh-sh-01",
      roles: ["level1_approver"],
    },
    response: null,
  })),
}));

vi.mock("@/lib/server-auth", () => ({
  requireSession: rejectRequireSessionMock,
  requireRole: (user: { roles: string[] }, roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));

import { POST } from "@/app/api/v1/tickets/[id]/reject/route";
import { getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/tickets/[id]/reject", () => {
  beforeEach(() => {
    resetMockStore();
    rejectRequireSessionMock.mockResolvedValue({
      user: {
        id: "approver-l1",
        name: "一级审批",
        email: "l1@test.local",
        warehouseId: "wh-sh-01",
        roles: ["level1_approver"],
      },
      response: null,
    });
  });

  it("returns 422 for invalid comment", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "x" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 409 for stale version", async () => {
    const ticket = getTicket("ticket-002");
    expect(ticket).not.toBeNull();
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "驳回", expectedVersion: ticket!.version - 1, requestToken: "reject-token-001" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(409);
  });

  it("rejects a valid pending approval", async () => {
    const ticket = getTicket("ticket-002");
    expect(ticket).not.toBeNull();
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "驳回", expectedVersion: ticket!.version, requestToken: "reject-token-002" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(200);
  });

  it("returns 403 for self reject", async () => {
    rejectRequireSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-admin-01",
        name: "陈楠",
        email: "admin@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["admin", "level1_approver"],
      },
      response: null,
    });

    const ticket = getTicket("ticket-002");
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "自驳回", expectedVersion: ticket!.version, requestToken: "reject-self-01" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(403);
  });
});
