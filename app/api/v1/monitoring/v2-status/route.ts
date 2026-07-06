import { getV2Status } from "@/lib/mock-store";
import { ok } from "@/lib/response";

export async function GET() {
  return ok(getV2Status());
}
