import { GET } from "@/app/api/v1/sync/logs/route";
import { resetMockStore } from "@/lib/mock-store";

describe("GET /api/v1/sync/logs", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("returns paginated logs", async () => {
    const response = await GET(new Request("http://localhost/api/v1/sync/logs?page=1&per_page=2"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: unknown[]; meta: { per_page: number } };
    expect(body.data).toHaveLength(2);
    expect(body.meta.per_page).toBe(2);
  });
});
