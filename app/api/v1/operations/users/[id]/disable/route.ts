import { z } from "zod";
import { getStore } from "@/lib/data-store";
import { fail, ok } from "@/lib/response";
import { requireRole, requireSession } from "@/lib/server-auth";

const disableSchema = z.object({
  fallbackApproverId: z.string().min(1),
  comment: z.string().min(2),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteProps) {
  const store = await getStore();
  const session = await requireSession();
  if (!session.user) {
    return session.response;
  }

  if (!requireRole(session.user, ["admin"])) {
    return fail(403, "forbidden", "Admin permission required.");
  }

  const parsed = disableSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, "validation_error", "Disable payload is invalid.");
  }

  const { id } = await params;
  const disabled = await store.disableDemoUser(id);
  if (!disabled) {
    return fail(404, "not_found", "User not found.");
  }

  const result = await store.reassignDisabledApproverTickets(
    id,
    parsed.data.fallbackApproverId,
    session.user,
    parsed.data.comment,
  );

  if (!result.ok) {
    return fail(409, result.code ?? "reassign_failed", result.message ?? "Reassign failed.");
  }

  return ok({ disabledUser: await store.findDemoUserById(id) });
}
