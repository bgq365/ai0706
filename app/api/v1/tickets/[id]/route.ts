import { getTicket, listApprovals } from "@/lib/mock-store";
import { fail, ok } from "@/lib/response";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteProps) {
  const { id } = await params;
  const ticket = getTicket(id);

  if (!ticket) {
    return fail(404, "not_found", "Ticket not found.");
  }

  return ok({
    ticket,
    approvals: listApprovals(id),
  });
}
