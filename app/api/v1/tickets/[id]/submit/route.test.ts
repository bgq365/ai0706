const { requireSessionMock: submitRequireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(async () => ({
    user: {
      id: "user-reporter-01",
      name: "张晓宁",
      email: "reporter@v3.demo",
      warehouseId: "wh-sh-01",
      roles: ["reporter"],
    },
    response: null,
  })),
}));

vi.mock("@/lib/server-auth", () => ({
  requireSession: submitRequireSessionMock,
}));

import { POST } from "@/app/api/v1/tickets/[id]/submit/route";
import { createTicket, getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/tickets/[id]/submit", () => {
  beforeEach(() => {
    resetMockStore();
    submitRequireSessionMock.mockResolvedValue({
      user: {
        id: "user-reporter-01",
        name: "张晓宁",
        email: "reporter@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["reporter"],
      },
      response: null,
    });
  });

  it("returns 422 for invalid comment", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-003/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "x" }),
      }),
      { params: Promise.resolve({ id: "ticket-003" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 403 when user is not the reporter", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/tickets/ticket-002/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "重新提交" }),
      }),
      { params: Promise.resolve({ id: "ticket-002" }) },
    );

    expect(response.status).toBe(403);
  });

  it("submits a pending ticket", async () => {
    const pendingTicket = createTicket({
      waybillNo: "WB20260706003",
      title: "待提交测试工单",
      category: "logistics",
      subtype: "待提交-唯一",
      amount: 320,
      summary: "用于提交路由测试",
      reporter: {
        id: "user-admin-01",
        name: "陈楠",
        email: "admin@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["admin"],
      },
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
      dedupeOpenSameType: false,
    });

    submitRequireSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-admin-01",
        name: "陈楠",
        email: "admin@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["admin"],
      },
      response: null,
    });

    const response = await POST(
      new Request(`http://localhost/api/v1/tickets/${pendingTicket.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "重新提交" }),
      }),
      { params: Promise.resolve({ id: pendingTicket.id }) },
    );

    expect(response.status).toBe(200);
    expect(getTicket(pendingTicket.id)?.status).toBe("level1_reviewing");
  });
});
