import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns deployment and configuration status", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        status: string;
        features: { deploymentMode: string };
        checks: { jwtConfigured: boolean };
      };
    };

    expect(body.data.status).toBe("ok");
    expect(body.data.features.deploymentMode).toBe("mock-store");
    expect(body.data.checks.jwtConfigured).toBe(false);
  });
});
