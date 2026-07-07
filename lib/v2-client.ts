import { env } from "@/lib/env";
import { getStore } from "@/lib/data-store";
import type { WaybillSnapshot } from "@/lib/types";

function createRequestId() {
  return `req-v2-${Date.now()}`;
}

async function fetchWithTiming(input: string, init?: RequestInit) {
  const startedAt = Date.now();
  const response = await fetch(input, init);
  return {
    response,
    durationMs: Date.now() - startedAt,
  };
}

export async function validateWaybill(waybillNo: string): Promise<{
  found: boolean;
  source: "v2-live" | "snapshot";
  requestId: string;
  waybill: WaybillSnapshot | null;
}> {
  const requestId = createRequestId();
  const store = await getStore();

  if (env.enableV2Live && env.v2ApiBaseUrl && env.v2ApiToken) {
    const endpoint = `${env.v2ApiBaseUrl}/api/v1/waybills/${encodeURIComponent(waybillNo)}`;
    try {
      const { response, durationMs } = await fetchWithTiming(endpoint, {
        headers: {
          Authorization: `Bearer ${env.v2ApiToken}`,
          "X-Request-Id": requestId,
        },
        cache: "no-store",
      });

      await store.appendSyncLog({
        requestId,
        endpoint: `/api/v1/waybills/${waybillNo}`,
        method: "GET",
        requestSummary: "发起实时运单真实性校验",
        statusCode: response.status,
        success: response.ok,
        durationMs,
        errorMessage: response.ok ? null : `V2 返回 ${response.status}`,
      });

      if (!response.ok) {
        return { found: false, source: "snapshot", requestId, waybill: await store.findWaybill(waybillNo) };
      }

      const payload = (await response.json()) as { data?: WaybillSnapshot };
      if (payload.data) {
        await store.upsertWaybillSnapshot(payload.data);
      }
      return {
        found: Boolean(payload.data),
        source: "v2-live",
        requestId,
        waybill: payload.data ?? null,
      };
    } catch (error) {
      await store.appendSyncLog({
        requestId,
        endpoint: `/api/v1/waybills/${waybillNo}`,
        method: "GET",
        requestSummary: "实时运单真实性校验失败，回退快照",
        statusCode: 503,
        success: false,
        durationMs: 0,
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  const waybill = await store.findWaybill(waybillNo);
  await store.appendSyncLog({
    requestId,
    endpoint: `/api/v1/waybills/${waybillNo}`,
    method: "GET",
    requestSummary: "使用本地快照校验运单存在性",
    statusCode: waybill ? 200 : 404,
    success: Boolean(waybill),
    durationMs: 12,
    errorMessage: waybill ? null : "mock snapshot not found",
  });

  return {
    found: Boolean(waybill),
    source: "snapshot",
    requestId,
    waybill,
  };
}

export async function validateSkuOwnership(skuCode: string, waybillNo: string) {
  const requestId = createRequestId();
  const store = await getStore();
  const exists = Boolean(await store.findWaybill(waybillNo));

  await store.appendSyncLog({
    requestId,
    endpoint: `/api/v1/skus/${skuCode}/ownership`,
    method: "GET",
    requestSummary: `校验 SKU ${skuCode} 是否归属运单 ${waybillNo}`,
    statusCode: exists ? 200 : 404,
    success: exists,
    durationMs: 18,
    errorMessage: exists ? null : "waybill not found during sku ownership validation",
  });

  return {
    valid: exists,
    requestId,
  };
}
