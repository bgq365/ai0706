import { listSyncLogs } from "@/lib/mock-store";
import { okList } from "@/lib/response";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const perPage = Number(searchParams.get("per_page") || "20");
  const logs = listSyncLogs();
  const start = (page - 1) * perPage;
  const end = start + perPage;

  return okList(logs.slice(start, end), {
    total: logs.length,
    page,
    per_page: perPage,
    total_pages: Math.max(1, Math.ceil(logs.length / perPage)),
  });
}
