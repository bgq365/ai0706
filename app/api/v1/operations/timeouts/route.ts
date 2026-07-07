import { getStore } from "@/lib/data-store";
import { fail, ok } from "@/lib/response";
import { requireRole, requireSession } from "@/lib/server-auth";

export async function POST() {
  const store = await getStore();
  const session = await requireSession();
  if (!session.user) {
    return session.response;
  }

  if (!requireRole(session.user, ["admin"])) {
    return fail(403, "forbidden", "Admin permission required.");
  }

  return ok({ result: await store.processApprovalTimeouts(new Date()) });
}
