const { requireSessionMock: timeoutSessionMock } = vi.hoisted(() => ({
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

type MockSessionResult = {
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
  requireSession: timeoutSessionMock,
  requireRole: (user: { roles: string[] }, roles: string[]) => roles.some((role) => user.roles.includes(role)),
}));

import { POST } from "@/app/api/v1/operations/timeouts/route";
import { getTicket, resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/operations/timeouts", () => {
  beforeEach(() => {
    resetMockStore();
    timeoutSessionMock.mockResolvedValue({
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
    timeoutSessionMock.mockResolvedValueOnce({
      user: null,
      response: new Response(JSON.stringify({ error: { code: "unauthorized" } }), { status: 401 }),
    } satisfies MockSessionResult);

    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin caller", async () => {
    timeoutSessionMock.mockResolvedValueOnce({
      user: {
        id: "user-l1-01",
        name: "李瑞",
        email: "l1@v3.demo",
        warehouseId: "wh-sh-01",
        roles: ["level1_approver"],
      },
      response: null,
    } satisfies MockSessionResult);

    const response = await POST();
    expect(response.status).toBe(403);
  });

  it("processes overdue approvals for admin", async () => {
    const ticket = getTicket("ticket-002")!;
    ticket.dueAt = new Date(Date.now() - 60_000).toISOString();

    const response = await POST();
    expect(response.status).toBe(200);
    expect(getTicket("ticket-002")?.status).toBe("level2_reviewing");
  });
});
