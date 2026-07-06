import { GET } from "@/app/api/v1/tickets/[id]/route";
import { resetMockStore } from "@/lib/mock-store";

describe("GET /api/v1/tickets/[id]", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("returns 404 when ticket does not exist", async () => {
    const response = await GET(new Request("http://localhost/api/v1/tickets/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns ticket detail and approvals", async () => {
    const response = await GET(new Request("http://localhost/api/v1/tickets/ticket-001"), {
      params: Promise.resolve({ id: "ticket-001" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { ticket: { id: string }; approvals: unknown[] } };
    expect(body.data.ticket.id).toBe("ticket-001");
    expect(Array.isArray(body.data.approvals)).toBe(true);
  });
});
