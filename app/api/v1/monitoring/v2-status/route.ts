import { getStore } from "@/lib/data-store";
import { ok } from "@/lib/response";

export async function GET() {
  const store = await getStore();
  return ok(await store.getV2Status());
}
