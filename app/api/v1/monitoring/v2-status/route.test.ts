import { GET } from "@/app/api/v1/monitoring/v2-status/route";

describe("GET /api/v1/monitoring/v2-status", () => {
  it("returns v2 monitoring snapshot", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { overall: string } };
    expect(body.data.overall).toBeTruthy();
  });
});
