import { env } from "@/lib/env";
import { listSyncLogs, resetMockStore } from "@/lib/mock-store";
import { validateSkuOwnership, validateWaybill } from "@/lib/v2-client";

describe("v2 client", () => {
  const original = {
    enableV2Live: env.enableV2Live,
    v2ApiBaseUrl: env.v2ApiBaseUrl,
    v2ApiToken: env.v2ApiToken,
  };

  beforeEach(() => {
    resetMockStore();
    env.enableV2Live = false;
    env.v2ApiBaseUrl = "";
    env.v2ApiToken = "";
    vi.restoreAllMocks();
  });

  afterAll(() => {
    env.enableV2Live = original.enableV2Live;
    env.v2ApiBaseUrl = original.v2ApiBaseUrl;
    env.v2ApiToken = original.v2ApiToken;
  });

  it("falls back to snapshot when live V2 is disabled", async () => {
    const result = await validateWaybill("WB20260706001");
    expect(result.found).toBe(true);
    expect(result.source).toBe("snapshot");
  });

  it("records a failed live request and falls back to snapshot", async () => {
    env.enableV2Live = true;
    env.v2ApiBaseUrl = "https://v2.example.test";
    env.v2ApiToken = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "not found" }), { status: 404 })),
    );

    const result = await validateWaybill("WB20260706001");
    expect(result.found).toBe(false);
    expect(result.source).toBe("snapshot");
    expect(listSyncLogs()[0]?.statusCode).toBe(404);
  });

  it("returns live waybill data when upstream succeeds", async () => {
    env.enableV2Live = true;
    env.v2ApiBaseUrl = "https://v2.example.test";
    env.v2ApiToken = "token";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              waybillNo: "WB-LIVE-001",
              customerName: "客户",
              receiverName: "收件人",
              receiverPhone: "13800000000",
              amount: 100,
              status: "待出库",
              warehouseId: "wh-sh-01",
              syncedAt: new Date().toISOString(),
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await validateWaybill("WB-LIVE-001");
    expect(result.found).toBe(true);
    expect(result.source).toBe("v2-live");
    expect(result.waybill?.waybillNo).toBe("WB-LIVE-001");
  });

  it("validates sku ownership using snapshot presence", async () => {
    const ok = await validateSkuOwnership("SKU-01", "WB20260706001");
    const bad = await validateSkuOwnership("SKU-02", "WB404");

    expect(ok.valid).toBe(true);
    expect(bad.valid).toBe(false);
  });
});
