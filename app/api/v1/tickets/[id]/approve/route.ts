import { z } from "zod";
import { getStore } from "@/lib/data-store";
import { fail, ok } from "@/lib/response";
import { requireRole, requireSession } from "@/lib/server-auth";

const actionSchema = z.object({
  comment: z.string().min(2),
  expectedVersion: z.number().int().positive().optional(),
  requestToken: z.string().min(8).optional(),
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

  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, "validation_error", "Approval comment is invalid.");
  }

  const { id } = await params;
  const ticket = await store.getTicket(id);
  if (!ticket) {
    return fail(404, "not_found", "Ticket not found.");
  }

  if (parsed.data.expectedVersion !== undefined && ticket.version !== parsed.data.expectedVersion) {
    return fail(409, "version_conflict", "This ticket has already been updated by someone else. Please refresh.");
  }

  if (ticket.reporterId === session.user.id) {
    return fail(403, "self_approval_forbidden", "Reporter cannot approve their own ticket.");
  }

  if (ticket.currentApproverLevel === 1 && !requireRole(session.user, ["level1_approver", "admin"])) {
    return fail(403, "forbidden", "Level 1 approval permission required.");
  }

  if (ticket.currentApproverLevel === 2 && !requireRole(session.user, ["level2_approver", "admin"])) {
    return fail(403, "forbidden", "Level 2 approval permission required.");
  }

  if (ticket.warehouseId !== session.user.warehouseId && !session.user.roles.includes("admin")) {
    return fail(403, "forbidden", "Cross-warehouse approval is not allowed.");
  }

  const result = await store.approveTicket(
    id,
    session.user,
    parsed.data.comment,
    parsed.data.expectedVersion,
    parsed.data.requestToken,
  );
  if (!result.ok) {
    return fail(result.code === "version_conflict" ? 409 : 409, result.code ?? "approval_failed", result.message ?? "Approval failed.");
  }

  return ok({ ticket: await store.getTicket(id) });
}
