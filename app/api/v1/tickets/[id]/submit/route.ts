import { z } from "zod";
import { getTicket, submitTicket } from "@/lib/mock-store";
import { fail, ok } from "@/lib/response";
import { requireSession } from "@/lib/server-auth";

const submitSchema = z.object({
  comment: z.string().min(2),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteProps) {
  const session = await requireSession();
  if (!session.user) {
    return session.response;
  }

  const parsed = submitSchema.safeParse(await request.json());
  if (!parsed.success) {
    return fail(422, "validation_error", "Submit comment is invalid.");
  }

  const { id } = await params;
  const ticket = getTicket(id);

  if (!ticket) {
    return fail(404, "not_found", "Ticket not found.");
  }

  if (ticket.reporterId !== session.user.id && !session.user.roles.includes("admin")) {
    return fail(403, "forbidden", "Only the reporter or admin can submit this ticket.");
  }

  const updated = submitTicket(id, session.user, parsed.data.comment);
  if (!updated) {
    return fail(404, "not_found", "Ticket not found.");
  }

  return ok({ ticket: updated });
}
