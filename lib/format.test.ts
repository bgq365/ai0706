import { formatCurrency, formatDateTime } from "@/lib/format";

describe("format helpers", () => {
  it("formats date time for zh-CN locale", () => {
    const formatted = formatDateTime("2026-07-06T08:00:00.000Z");

    expect(formatted).toContain("2026");
  });

  it("formats RMB currency", () => {
    const formatted = formatCurrency(1234);

    expect(formatted).toContain("1,234");
  });
});
