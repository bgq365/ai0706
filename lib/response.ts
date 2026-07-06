import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function okList<T>(
  data: T[],
  meta: { total: number; page: number; per_page: number; total_pages: number },
) {
  return NextResponse.json({ data, meta });
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: Array<{ field?: string; message: string; code?: string }>,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}
