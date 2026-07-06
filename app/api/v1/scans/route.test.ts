import { POST as scanPost } from "@/app/api/v1/scans/route";
import { resetMockStore } from "@/lib/mock-store";

describe("POST /api/v1/scans", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("returns 422 for invalid payload", async () => {
    const response = await scanPost(
      new Request("http://localhost/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waybillNo: "", skuCode: "" }),
      }),
    );

    expect(response.status).toBe(422);
  });

  it("returns 404 for non-existent waybill", async () => {
    const response = await scanPost(
      new Request("http://localhost/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waybillNo: "WB404",
          skuCode: "SKU-404",
          operatorName: "测试扫描员",
          result: "abnormal",
          abnormalReason: "外观破损",
        }),
      }),
    );

    expect(response.status).toBe(404);
  });

  it("reuses an existing open qc ticket instead of creating a duplicate one", async () => {
    const response = await scanPost(
      new Request("http://localhost/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waybillNo: "WB20260706001",
          skuCode: "SKU-GLASS-01",
          operatorName: "测试扫描员",
          result: "abnormal",
          abnormalReason: "外观破损",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { data: { ticket: { id: string; ticketNo: string } } };
    expect(body.data.ticket.ticketNo).toBe("EX-20260706-001");
  });

  it("creates a normal scan record without generating a ticket", async () => {
    const response = await scanPost(
      new Request("http://localhost/api/v1/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waybillNo: "WB20260706003",
          skuCode: "SKU-CHAIR-08",
          operatorName: "测试扫描员",
          result: "passed",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { data: { ticket: null; record: { holdStatus: string } } };
    expect(body.data.ticket).toBeNull();
    expect(body.data.record.holdStatus).toBe("normal");
  });
});
