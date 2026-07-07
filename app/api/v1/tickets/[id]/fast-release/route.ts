import { z } from "zod";
import { getStore } from "@/lib/data-store";
import { fail, ok } from "@/lib/response";
import { requireRole, requireSession } from "@/lib/server-auth";

const fastReleaseSchema = z.object({
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

  const parsed = fastReleaseSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, "validation_error", "Fast release comment is invalid.");
  }

  if (!requireRole(session.user, ["qc_supervisor", "admin"])) {
    return fail(403, "forbidden", "QC supervisor permission required.");
  }

  const { id } = await params;
  const ticket = await store.getTicket(id);
  if (!ticket) {
    return fail(404, "not_found", "Ticket not found.");
  }

  const result = await store.fastReleaseQcTicket(
    id,
    session.user,
    parsed.data.comment,
    parsed.data.expectedVersion,
    parsed.data.requestToken,
  );
  if (!result.ok) {
    const status = result.code === "version_conflict" ? 409 : result.code === "invalid_category" ? 409 : 409;
    return fail(status, result.code ?? "fast_release_failed", result.message ?? "Fast release failed.");
  }

  return ok({ ticket: await store.getTicket(id) });
}
