const { requireSessionMock: disableSessionMock } = vi.hoisted(() => ({
  requireSessionMock: vi.fn(async () => ({
    user: {
      id: "user-admin-01",
      name: "陈楠",
      email: "admin@v3.demo",
      warehouseId: "wh-sh-01",
      roles: ["admin"],
    },
    response: null,
  })),
}));

type DisableMockSessionResult = {
  user: {
    id: string;
    name: string;
    email: string;
    warehouseId: string;
    roles: string[];
  } | null;
  response: Response | null;
};

vi.mock("@/lib/server-auth", () => ({
  requireSession: disableSessionMock,
  requireRole: (user: { roles: string[] }, roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));

import { POST } from "@/app/api/v1/operations/users/[id]/disable/route";
import { findDemoUserById, getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/operations/users/[id]/disable", () => {
  beforeEach(() => {
    resetMockStore();
    disableSessionMock.mockResolvedValue({
      user: {
        id: "user-admin-01",
        name: "陈楠",
        email: "admin@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["admin"],
      },
      response: null,
    });
  });

  it("returns 401 when session is missing", async () => {
    disableSessionMock.mockResolvedValueOnce({
      user: null,
      response: new Response(JSON.stringify({ error: { code: "unauthorized" } }), { status: 401 }),
    } satisfies DisableMockSessionResult);

    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/user-l1-01/disable", { method: "POST" }),
      { params: Promise.resolve({ id: "user-l1-01" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin caller", async () => {
    disableSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-l1-01",
        name: "李瑞",
        email: "l1@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["level1_approver"],
      },
      response: null,
    } satisfies DisableMockSessionResult);

    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/user-l1-01/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fallbackApproverId: "user-admin-01",
          comment: "无权限尝试",
        }),
      }),
      { params: Promise.resolve({ id: "user-l1-01" }) },
    );

    expect(response.status).toBe(403);
  });

  it("returns 422 for invalid payload", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/user-l1-01/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fallbackApproverId: "",
          comment: "x",
        }),
      }),
      { params: Promise.resolve({ id: "user-l1-01" }) },
    );

    expect(response.status).toBe(422);
  });

  it("returns 404 when target user does not exist", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/missing/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fallbackApproverId: "user-admin-01",
          comment: "尝试处理不存在用户",
        }),
      }),
      { params: Promise.resolve({ id: "missing" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 409 when fallback approver is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/user-l1-01/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fallbackApproverId: "missing-fallback",
          comment: "兜底人无效",
        }),
      }),
      { params: Promise.resolve({ id: "user-l1-01" }) },
    );

    expect(response.status).toBe(409);
  });

  it("disables user and reassigns open approvals", async () => {
    const response = await POST(
      new Request("http://localhost/api/v1/operations/users/user-l1-01/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fallbackApproverId: "user-admin-01",
          comment: "一级审批人离职，管理员接管。",
        }),
      }),
      { params: Promise.resolve({ id: "user-l1-01" }) },
    );

    expect(response.status).toBe(200);
    expect(findDemoUserById("user-l1-01")?.isActive).toBe(false);
    expect(getTicket("ticket-002")?.assignedApproverId).toBe("user-admin-01");
  });
});
