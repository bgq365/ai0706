import { z } from "zod";
import { createScan, createTicket, findOpenQcTicketByWaybill } from "@/lib/mock-store";
import { fail, ok } from "@/lib/response";
import { validateSkuOwnership, validateWaybill } from "@/lib/v2-client";

const scanSchema = z.object({
  waybillNo: z.string().min(1),
  skuCode: z.string().min(1),
  operatorName: z.string().min(1),
  result: z.enum(["passed", "abnormal"]),
  abnormalReason: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const parsed = scanSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, "validation_error", "Scan payload is invalid.");
  }

  const waybillValidation = await validateWaybill(parsed.data.waybillNo);
  if (!waybillValidation.found || !waybillValidation.waybill) {
    return fail(404, "waybill_not_found", "Cannot scan a non-existent waybill.");
  }

  const skuValidation = await validateSkuOwnership(parsed.data.skuCode, parsed.data.waybillNo);
  if (!skuValidation.valid) {
    return fail(404, "sku_not_found", "SKU ownership validation failed.");
  }

  let ticket = null;
  if (parsed.data.result === "abnormal") {
    ticket =
      findOpenQcTicketByWaybill(parsed.data.waybillNo) ??
      createTicket({
        waybillNo: parsed.data.waybillNo,
        title: `${parsed.data.abnormalReason || "扫描异常"}待审批`,
        category: "quality_control",
        subtype: parsed.data.abnormalReason || "扫描异常",
        amount: waybillValidation.waybill.amount,
        summary: `扫描录入时触发异常：${parsed.data.abnormalReason || "未填写说明"}`,
        reporter: {
          id: "system-scan",
          name: parsed.data.operatorName,
          email: "scan@local.system",
          warehouseId: waybillValidation.waybill.warehouseId,
          roles: ["reporter"],
        },
        dataSource: waybillValidation.source,
        snapshotSyncedAt: waybillValidation.waybill.syncedAt,
      });
  }

  const record = createScan({
    waybillNo: parsed.data.waybillNo,
    skuCode: parsed.data.skuCode,
    operatorName: parsed.data.operatorName,
    warehouseId: waybillValidation.waybill.warehouseId,
    result: parsed.data.result,
    abnormalReason: parsed.data.abnormalReason || null,
    holdStatus: parsed.data.result === "abnormal" ? "held" : "normal",
    ticketId: ticket?.id ?? null,
  });

  return ok(
    {
      record,
      ticket,
      request_ids: [waybillValidation.requestId, skuValidation.requestId],
    },
    { status: 201 },
  );
}
