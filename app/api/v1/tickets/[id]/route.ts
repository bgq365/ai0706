import { getStore } from "@/lib/data-store";
import { fail, ok } from "@/lib/response";

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, { params }: RouteProps) {
  const store = await getStore();
  const { id } = await params;
  const ticket = await store.getTicket(id);

  if (!ticket) {
    return fail(404, "not_found", "Ticket not found.");
  }

  return ok({
    ticket,
    approvals: await store.listApprovals(id),
  });
}
