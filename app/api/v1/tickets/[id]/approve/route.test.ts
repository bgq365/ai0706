const { requireSessionMock: approveRequireSessionMock } = vi.hoisted(() => ({
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
  requireSession: approveRequireSessionMock,
  requireRole: (user: { roles: string[] }, roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));

import { POST as approvePost } from "@/app/api/v1/tickets/[id]/approve/route";
import { getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/tickets/[id]/approve", () => {
  beforeEach(() => {
    resetMockStore();
    approveRequireSessionMock.mockResolvedValue({
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
    const response = await approvePost(
      new Request("http://localhost/api/v1/tickets/ticket-002/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "x" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 409 when approval uses a stale version", async () => {
    const ticket = getTicket("ticket-002");
    expect(ticket).not.toBeNull();
    const staleVersion = ticket!.version;

    const first = await approvePost(
      new Request("http://localhost/api/v1/tickets/ticket-002/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: "第一次通过",
          expectedVersion: staleVersion,
          requestToken: "stale-token-001",
        }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(first.status).toBe(200);

    const second = await approvePost(
      new Request("http://localhost/api/v1/tickets/ticket-002/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: "重复提交",
          expectedVersion: staleVersion,
          requestToken: "stale-token-002",
        }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: { code: string } };
    expect(body.error.code).toBe("version_conflict");
  });

  it("returns 403 for self approval", async () => {
    approveRequireSessionMock.mockResolvedValueOnce({
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
    const response = await approvePost(
      new Request("http://localhost/api/v1/tickets/ticket-002/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "自批", expectedVersion: ticket!.version, requestToken: "self-approve-01" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 403 when level 2 permission is missing", async () => {
    const ticket = getTicket("ticket-001");
    expect(ticket?.currentApproverLevel).toBe(2);
    const response = await approvePost(
      new Request("http://localhost/api/v1/tickets/ticket-001/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "越权审批", expectedVersion: ticket!.version, requestToken: "wrong-role-01" }),
      }),
      { params: Promise.resolve({ id: "ticket-001" }) },
    );

    expect(response.status).toBe(403);
  });
});
