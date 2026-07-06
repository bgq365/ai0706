const { requireSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(async () => ({
    user: {
      id: "reporter-1",
      name: "测试上报人",
      email: "reporter@test.local",
      warehouseId: "wh-sh-01",
      roles: ["reporter"],
    },
    response: null,
  })),
}));

vi.mock("@/lib/server-auth", () => ({
  requireSession: requireSessionMock,
}));

import { POST as createTicketPost } from "@/app/api/v1/tickets/route";
import { resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/tickets", () => {
  beforeEach(() => {
    resetMockStore();
    requireSessionMock.mockResolvedValue({
      user: {
        id: "reporter-1",
        name: "测试上报人",
        email: "reporter@test.local",
        warehouseId: "wh-sh-01",
        roles: ["reporter"],
      },
      response: null,
    });
  });

  it("returns 422 for invalid payload", async () => {
    const response = await createTicketPost(
      new Request("http://localhost/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waybillNo: "", title: "x" }),
      }),
    );

    expect(response.status).toBe(422);
  });

  it("returns 403 when warehouse scope does not match", async () => {
    requireSessionMock.mockResolvedValueOnce({
      user: {
        id: "reporter-2",
        name: "异仓用户",
        email: "other@test.local",
        warehouseId: "wh-other-01",
        roles: ["reporter"],
      },
      response: null,
    });

    const response = await createTicketPost(
      new Request("http://localhost/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waybillNo: "WB20260706001",
          title: "异仓提交",
          category: "quality_control",
          subtype: "外观破损-新",
          amount: 860,
          summary: "跨仓提交测试",
        }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects duplicate open tickets for the same waybill and subtype", async () => {
    const payload = {
      waybillNo: "WB20260706001",
      title: "外观破损待审批",
      category: "quality_control",
      subtype: "外观破损",
      amount: 860,
      summary: "重复提交测试",
    };

    const response = await createTicketPost(
      new Request("http://localhost/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("duplicate_open_ticket");
  });

  it("creates a ticket for a valid unique request", async () => {
    const response = await createTicketPost(
      new Request("http://localhost/api/v1/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waybillNo: "WB20260706003",
          title: "地址错误待审批",
          category: "logistics",
          subtype: "地址错误-唯一",
          amount: 320,
          summary: "唯一工单创建测试",
        }),
      }),
    );

    expect(response.status).toBe(201);
  });
});
