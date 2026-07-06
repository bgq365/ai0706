import { fail, ok, okList } from "@/lib/response";

describe("response helpers", () => {
  it("creates success payload", async () => {
    const response = ok({ hello: "world" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { hello: "world" } });
  });

  it("creates paginated success payload", async () => {
    const response = okList([{ id: 1 }], {
      total: 1,
      page: 1,
      per_page: 20,
      total_pages: 1,
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ id: 1 }],
      meta: { total: 1, page: 1, per_page: 20, total_pages: 1 },
    });
  });

  it("creates error payload", async () => {
    const response = fail(422, "validation_error", "bad input", [{ field: "email", message: "required" }]);
    expect(response.status).toBe(422);
    const body = (await response.json()) as { error: { code: string; details: Array<{ field: string }> } };
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details[0]?.field).toBe("email");
  });
});
