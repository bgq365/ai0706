import { z } from "zod";
import { getStore } from "@/lib/data-store";
import { fail, ok, okList } from "@/lib/response";
import { requireSession } from "@/lib/server-auth";
import { validateWaybill } from "@/lib/v2-client";

const createTicketSchema = z.object({
  waybillNo: z.string().min(1),
  title: z.string().min(2),
  category: z.enum(["logistics", "quality_control"]),
  subtype: z.string().min(2),
  amount: z.coerce.number().min(0),
  summary: z.string().min(4),
});

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const perPage = Number(searchParams.get("per_page") || "20");
  const records = await store.listTickets();
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return okList(records.slice(start, end), {
    total: records.length,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(records.length / perPage)),
  });
}

export async function POST(request: Request) {
  const store = await getStore();
  const session = await requireSession();
  if (!session.user) {
    return session.response;
  }

  const body = await request.json();
  const parsed = createTicketSchema.safeParse(body);

  if (!parsed.success) {
    return fail(422, "validation_error", "Ticket payload is invalid.", [
      ...parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    ]);
  }

  const validation = await validateWaybill(parsed.data.waybillNo);
  if (!validation.found || !validation.waybill) {
    return fail(404, "waybill_not_found", "Waybill does not exist in V2 or current snapshot.");
  }

  if (validation.waybill.warehouseId !== session.user.warehouseId && !session.user.roles.includes("admin")) {
    return fail(403, "forbidden", "You cannot create tickets for another warehouse.");
  }

  const duplicate = await store.findOpenTicketByWaybillAndSubtype(
    parsed.data.waybillNo,
    parsed.data.category,
    parsed.data.subtype,
  );
  if (duplicate) {
    return fail(
      409,
      "duplicate_open_ticket",
      `An open ticket already exists for this waybill and subtype: ${duplicate.ticketNo}.`,
    );
  }

  const ticket = await store.createTicket({
    ...parsed.data,
    reporter: session.user,
    dataSource: validation.source,
    snapshotSyncedAt: validation.waybill.syncedAt,
  });

  return ok({ ticket, request_id: validation.requestId }, { status: 201 });
}
