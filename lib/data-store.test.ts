import { resetMockStore } from "@/lib/mock-store";

describe("data-store selection", () => {
  beforeEach(() => {
    resetMockStore();
    vi.resetModules();
  });

  it("uses mock mode when Supabase is disabled", async () => {
    const { env } = await import("@/lib/env");
    const { getStore, getStoreMode } = await import("@/lib/data-store");
    env.enableSupabase = false;
    env.supabaseUrl = "";
    env.supabaseServiceRoleKey = "";

    expect(getStoreMode()).toBe("mock-store");

    const store = await getStore();
    expect(store.mode).toBe("mock-store");

    const tickets = await store.listTickets();
    expect(tickets.length).toBeGreaterThan(0);
  });

  it("falls back to mock mode when Supabase config is incomplete", async () => {
    const { env } = await import("@/lib/env");
    const { getStore, getStoreMode } = await import("@/lib/data-store");
    env.enableSupabase = true;
    env.supabaseUrl = "https://project.supabase.co";
    env.supabaseServiceRoleKey = "";

    expect(getStoreMode()).toBe("mock-store");
    expect((await getStore()).mode).toBe("mock-store");
  });

  it("switches to Supabase mode when config is complete", async () => {
    const { env } = await import("@/lib/env");
    const { getStore, getStoreMode } = await import("@/lib/data-store");
    env.enableSupabase = true;
    env.supabaseUrl = "https://project.supabase.co";
    env.supabaseServiceRoleKey = "service-role-key";

    expect(getStoreMode()).toBe("supabase");
    const store = await getStore();
    expect(store.mode).toBe("supabase");
  });
});
