import { GET } from "@/app/api/v1/tickets/route";
import { resetMockStore } from "@/lib/mock-store";

describe("GET /api/v1/tickets", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("returns paginated ticket list", async () => {
    const response = await GET(new Request("http://localhost/api/v1/tickets?page=1&per_page=2"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown[]; meta: { per_page: number } };
    expect(body.data).toHaveLength(2);
    expect(body.meta.per_page).toBe(2);
  });
});
