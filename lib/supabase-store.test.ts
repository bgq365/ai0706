import { createSupabaseStore } from "@/lib/supabase-store";
import type { StoreAdapter } from "@/lib/data-store";
import type {
  ActionResult,
  ApprovalRecord,
  ConfigAssumption,
  ScanRecord,
  SessionUser,
  SyncLog,
  TicketRecord,
  TimeoutProcessResult,
  V2StatusSnapshot,
  WaybillSnapshot,
} from "@/lib/types";

const mockSupabaseClient = {
  from: vi.fn(),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

function createFallbackStore(): StoreAdapter {
  const ticket: TicketRecord = {
    id: "ticket-fallback",
    ticketNo: "EX-20260706-999",
    waybillNo: "WB20260706001",
    title: "Fallback ticket",
    category: "logistics",
    subtype: "customer_refused",
    status: "pending",
    amount: 10,
    warehouseId: "wh-sh-01",
    reporterId: "u1",
    reporterName: "Fallback User",
    createdAt: "2026-07-06T00:00:00.000Z",
    updatedAt: "2026-07-06T00:00:00.000Z",
    summary: "fallback",
    dataSource: "snapshot",
    snapshotSyncedAt: "2026-07-06T00:00:00.000Z",
    currentApproverLevel: null,
    retryCount: 0,
    version: 1,
    executionStatus: "not_started",
    closedAt: null,
    assignedApproverId: null,
    assignedApproverName: null,
    dueAt: null,
    timeoutEscalationCount: 0,
  };

  const user: SessionUser = {
    id: "u1",
    name: "Fallback User",
    email: "fallback@test.local",
    warehouseId: "wh-sh-01",
    roles: ["reporter"],
    isActive: true,
  };

  const approval: ApprovalRecord = {
    id: "a1",
    ticketId: ticket.id,
    level: 1,
    action: "submit",
    actorId: "u1",
    actorName: "Fallback User",
    comment: "ok",
    createdAt: "2026-07-06T00:00:00.000Z",
    requestToken: null,
  };

  const scan: ScanRecord = {
    id: "s1",
    waybillNo: "WB20260706001",
    skuCode: "SKU-1",
    operatorName: "Scanner",
    warehouseId: "wh-sh-01",
    scannedAt: "2026-07-06T00:00:00.000Z",
    result: "passed",
    abnormalReason: null,
    holdStatus: "normal",
    ticketId: null,
    ruleId: null,
  };

  const syncLog: SyncLog = {
    id: "l1",
    requestId: "req-1",
    endpoint: "/api",
    method: "GET",
    requestSummary: "summary",
    statusCode: 200,
    success: true,
    durationMs: 12,
    errorMessage: null,
    createdAt: "2026-07-06T00:00:00.000Z",
  };

  const waybill: WaybillSnapshot = {
    waybillNo: "WB20260706001",
    customerName: "Customer",
    receiverName: "Receiver",
    receiverPhone: "13800000000",
    amount: 10,
    status: "pending",
    warehouseId: "wh-sh-01",
    syncedAt: "2026-07-06T00:00:00.000Z",
  };

  const assumptions: ConfigAssumption[] = [
    { key: "threshold", value: "1000", rationale: "test" },
  ];

  const v2Status: V2StatusSnapshot = {
    overall: "healthy",
    lastSuccessfulSyncAt: "2026-07-06T00:00:00.000Z",
    successRate24h: 99,
    fallbackMode: false,
    notes: ["ok"],
  };

  const actionResult: ActionResult = { ok: true };
  const timeoutResult: TimeoutProcessResult = { escalatedToLevel2: [], autoClosed: [] };

  return {
    mode: "mock-store",
    listTickets: vi.fn(async () => [ticket]),
    getTicket: vi.fn(async () => ticket),
    listApprovals: vi.fn(async () => [approval]),
    createTicket: vi.fn(async () => ticket),
    submitTicket: vi.fn(async () => ticket),
    approveTicket: vi.fn(async () => actionResult),
    rejectTicket: vi.fn(async () => actionResult),
    fastReleaseQcTicket: vi.fn(async () => actionResult),
    processApprovalTimeouts: vi.fn(async () => timeoutResult),
    findOpenTicketByWaybillAndSubtype: vi.fn(async () => ticket),
    findOpenQcTicketByWaybill: vi.fn(async () => ticket),
    createScan: vi.fn(async () => scan),
    listSyncLogs: vi.fn(async () => [syncLog]),
    appendSyncLog: vi.fn(async () => syncLog),
    findWaybill: vi.fn(async () => waybill),
    listWaybills: vi.fn(async () => [waybill]),
    upsertWaybillSnapshot: vi.fn(async () => waybill),
    getV2Status: vi.fn(async () => v2Status),
    getConfigAssumptions: vi.fn(async () => assumptions),
    listDemoUsers: vi.fn(async () => [user]),
    findDemoUserByEmail: vi.fn(async () => user),
    findDemoUserById: vi.fn(async () => user),
    disableDemoUser: vi.fn(async () => user),
    reassignDisabledApproverTickets: vi.fn(async () => actionResult),
    hasRole: vi.fn(async () => true),
    canAccessWarehouse: vi.fn(async () => true),
    getSeedData: vi.fn(async () => ({
      tickets: [ticket],
      approvals: [approval],
      scans: [scan],
      syncLogs: [syncLog],
      compensations: [],
      inventoryEvents: [],
      waybills: [waybill],
      v2Status,
      assumptions,
    })),
  };
}

function createQueryBuilder(result: { data?: unknown; error?: unknown }) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve(result)),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    single: vi.fn(() => Promise.resolve(result)),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
    not: vi.fn(() => builder),
    limit: vi.fn(() => builder),
  };

  return builder;
}

describe("supabase-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the mock store when a Supabase read fails", async () => {
    mockSupabaseClient.from.mockReturnValue(createQueryBuilder({ error: new Error("db down") }));
    const fallback = createFallbackStore();
    const store = createSupabaseStore(fallback);

    const tickets = await store.listTickets();

    expect(tickets[0]?.id).toBe("ticket-fallback");
    expect(fallback.listTickets).toHaveBeenCalled();
  });

  it("maps Supabase ticket rows into the domain model", async () => {
    mockSupabaseClient.from.mockReturnValue(
      createQueryBuilder({
        data: [
          {
            id: "ticket-supabase",
            ticket_no: "EX-1",
            waybill_no: "WB-1",
            title: "Supabase ticket",
            category: "logistics",
            subtype: "lost",
            status: "pending",
            amount: "18.5",
            warehouse_id: "wh-sh-01",
            reporter_id: "u1",
            reporter_name: "Reporter",
            created_at: "2026-07-06T00:00:00.000Z",
            updated_at: "2026-07-06T00:00:00.000Z",
            summary: "summary",
            data_source: "snapshot",
            snapshot_synced_at: "2026-07-06T00:00:00.000Z",
            current_approver_level: 1,
            retry_count: 2,
            version: 3,
            execution_status: "completed",
            closed_at: null,
            assigned_approver_id: "u2",
            assigned_approver_name: "Approver",
            due_at: null,
            timeout_escalation_count: 1,
          },
        ],
      }),
    );

    const store = createSupabaseStore(createFallbackStore());
    const tickets = await store.listTickets();

    expect(tickets[0]).toMatchObject({
      id: "ticket-supabase",
      ticketNo: "EX-1",
      amount: 18.5,
      reporterName: "Reporter",
      version: 3,
      timeoutEscalationCount: 1,
    });
  });

  it("aggregates seed data from store reads", async () => {
    const ticketBuilder = createQueryBuilder({
      data: [
        {
          id: "ticket-1",
          ticket_no: "EX-1",
          waybill_no: "WB-1",
          title: "title",
          category: "logistics",
          subtype: "lost",
          status: "pending",
          amount: 9,
          warehouse_id: "wh-sh-01",
          reporter_id: "u1",
          reporter_name: "Reporter",
          created_at: "2026-07-06T00:00:00.000Z",
          updated_at: "2026-07-06T00:00:00.000Z",
          summary: "summary",
          data_source: "snapshot",
          snapshot_synced_at: "2026-07-06T00:00:00.000Z",
          current_approver_level: null,
          retry_count: 0,
          version: 1,
          execution_status: "not_started",
          closed_at: null,
          assigned_approver_id: null,
          assigned_approver_name: null,
          due_at: null,
          timeout_escalation_count: 0,
        },
      ],
    });
    const approvalBuilder = createQueryBuilder({
      data: [
        {
          id: "approval-1",
          ticket_id: "ticket-1",
          level: 1,
          action: "submit",
          actor_id: "u1",
          actor_name: "Reporter",
          comment: "comment",
          created_at: "2026-07-06T00:00:00.000Z",
          request_token: null,
        },
      ],
    });
    const syncLogBuilder = createQueryBuilder({
      data: [
        {
          id: "log-1",
          request_id: "req-1",
          endpoint: "/api/v1/waybills/WB-1",
          method: "GET",
          request_summary: "summary",
          status_code: 200,
          success: true,
          duration_ms: 10,
          error_message: null,
          created_at: "2026-07-06T00:00:00.000Z",
        },
      ],
    });
    const userBuilder = createQueryBuilder({
      data: [
        {
          id: "user-1",
          email: "user@test.local",
          name: "User",
          warehouse_id: "wh-sh-01",
          is_active: true,
          user_role_bindings: [{ role_code: "admin" }],
        },
      ],
    });
    const waybillBuilder = createQueryBuilder({
      data: [
        {
          waybill_no: "WB-1",
          customer_name: "Customer",
          receiver_name: "Receiver",
          receiver_phone: "13800000000",
          amount: 10,
          status: "pending",
          warehouse_id: "wh-sh-01",
          synced_at: "2026-07-06T00:00:00.000Z",
        },
      ],
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      switch (table) {
        case "exception_tickets":
          return ticketBuilder;
        case "approval_records":
          return approvalBuilder;
        case "sync_logs":
          return syncLogBuilder;
        case "users":
          return userBuilder;
        case "waybill_snapshots":
          return waybillBuilder;
        default:
          return createQueryBuilder({ data: [] });
      }
    });

    const fallback = createFallbackStore();
    const store = createSupabaseStore(fallback);
    const seed = await store.getSeedData();

    expect(seed.tickets).toHaveLength(1);
    expect(seed.approvals).toHaveLength(1);
    expect(seed.syncLogs).toHaveLength(1);
    expect(seed.waybills[0]?.waybillNo).toBe("WB-1");
    expect(seed.v2Status.overall).toBe("healthy");
  });

  it("delegates complex mutation paths to the fallback store", async () => {
    const fallback = createFallbackStore();
    const store = createSupabaseStore(fallback);

    await store.approveTicket("ticket-1", {
      id: "u1",
      name: "Approver",
      email: "approver@test.local",
      warehouseId: "wh-sh-01",
      roles: ["admin"],
    }, "ok", 1, "token-1");

    expect(fallback.approveTicket).toHaveBeenCalled();
  });

  it("creates tickets and scans through successful Supabase writes", async () => {
    const duplicateQuery = createQueryBuilder({
      data: null,
    });
    const insertTicketQuery = createQueryBuilder({
      data: {
        id: "ticket-created",
        ticket_no: "EX-NEW",
        waybill_no: "WB-NEW",
        title: "Created ticket",
        category: "quality_control",
        subtype: "damage",
        status: "pending",
        amount: 22,
        warehouse_id: "wh-sh-01",
        reporter_id: "u1",
        reporter_name: "Reporter",
        created_at: "2026-07-06T00:00:00.000Z",
        updated_at: "2026-07-06T00:00:00.000Z",
        summary: "summary",
        data_source: "snapshot",
        snapshot_synced_at: "2026-07-06T00:00:00.000Z",
        current_approver_level: null,
        retry_count: 0,
        version: 1,
        execution_status: "not_started",
        closed_at: null,
        assigned_approver_id: null,
        assigned_approver_name: null,
        due_at: null,
        timeout_escalation_count: 0,
      },
    });
    const insertScanQuery = createQueryBuilder({
      data: {
        id: "scan-created",
        waybill_no: "WB-NEW",
        sku_code: "SKU-NEW",
        operator_name: "Scanner",
        warehouse_id: "wh-sh-01",
        scanned_at: "2026-07-06T00:00:00.000Z",
        result: "abnormal",
        abnormal_reason: "damage",
        hold_status: "held",
        ticket_id: "ticket-created",
        rule_id: "qc-rule-damage-default",
      },
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      switch (table) {
        case "exception_tickets":
          return mockSupabaseClient.from.mock.calls.filter((call) => call[0] === "exception_tickets").length === 1
            ? duplicateQuery
            : insertTicketQuery;
        case "scan_records":
          return insertScanQuery;
        default:
          return createQueryBuilder({ data: [] });
      }
    });

    const store = createSupabaseStore(createFallbackStore());
    const ticket = await store.createTicket({
      waybillNo: "WB-NEW",
      title: "Created ticket",
      category: "quality_control",
      subtype: "damage",
      amount: 22,
      summary: "summary",
      reporter: {
        id: "u1",
        name: "Reporter",
        email: "reporter@test.local",
        warehouseId: "wh-sh-01",
        roles: ["reporter"],
      },
      dataSource: "snapshot",
      snapshotSyncedAt: "2026-07-06T00:00:00.000Z",
    });
    const scan = await store.createScan({
      waybillNo: "WB-NEW",
      skuCode: "SKU-NEW",
      operatorName: "Scanner",
      warehouseId: "wh-sh-01",
      result: "abnormal",
      abnormalReason: "damage",
      holdStatus: "held",
      ticketId: "ticket-created",
    });

    expect(ticket.id).toBe("ticket-created");
    expect(scan.id).toBe("scan-created");
  });

  it("supports read helpers and user helpers through Supabase mappings", async () => {
    const ticketRow = {
      id: "ticket-1",
      ticket_no: "EX-1",
      waybill_no: "WB-1",
      title: "title",
      category: "quality_control",
      subtype: "damage",
      status: "pending",
      amount: 9,
      warehouse_id: "wh-sh-01",
      reporter_id: "u1",
      reporter_name: "Reporter",
      created_at: "2026-07-06T00:00:00.000Z",
      updated_at: "2026-07-06T00:00:00.000Z",
      summary: "summary",
      data_source: "snapshot",
      snapshot_synced_at: "2026-07-06T00:00:00.000Z",
      current_approver_level: null,
      retry_count: 0,
      version: 1,
      execution_status: "not_started",
      closed_at: null,
      assigned_approver_id: null,
      assigned_approver_name: null,
      due_at: null,
      timeout_escalation_count: 0,
    };

    mockSupabaseClient.from.mockImplementation((table: string) => {
      switch (table) {
        case "exception_tickets":
          return createQueryBuilder({ data: ticketRow });
        case "waybill_snapshots":
          return createQueryBuilder({
            data: {
              waybill_no: "WB-1",
              customer_name: "Customer",
              receiver_name: "Receiver",
              receiver_phone: "13800000000",
              amount: 10,
              status: "pending",
              warehouse_id: "wh-sh-01",
              synced_at: "2026-07-06T00:00:00.000Z",
            },
          });
        case "users":
          return createQueryBuilder({
            data: [
              {
                id: "user-1",
                email: "user@test.local",
                name: "User",
                warehouse_id: "wh-sh-01",
                is_active: true,
                user_role_bindings: [{ role_code: "qc_supervisor" }],
              },
            ],
          });
        case "sync_logs":
          return createQueryBuilder({
            data: {
              id: "log-1",
              request_id: "req-1",
              endpoint: "/api",
              method: "GET",
              request_summary: "summary",
              status_code: 200,
              success: true,
              duration_ms: 10,
              error_message: null,
              created_at: "2026-07-06T00:00:00.000Z",
            },
          });
        default:
          return createQueryBuilder({ data: null });
      }
    });

    const fallback = createFallbackStore();
    const store = createSupabaseStore(fallback);
    const ticket = await store.getTicket("ticket-1");
    const openTicket = await store.findOpenTicketByWaybillAndSubtype("WB-1", "quality_control", "damage");
    const openQcTicket = await store.findOpenQcTicketByWaybill("WB-1");
    const waybill = await store.findWaybill("WB-1");
    const upsertedWaybill = await store.upsertWaybillSnapshot({
      waybillNo: "WB-1",
      customerName: "Customer",
      receiverName: "Receiver",
      receiverPhone: "13800000000",
      amount: 10,
      status: "pending",
      warehouseId: "wh-sh-01",
      syncedAt: "2026-07-06T00:00:00.000Z",
    });
    const user = await store.findDemoUserByEmail("user@test.local");
    const userById = await store.findDemoUserById("user-1");
    const disabled = await store.disableDemoUser("user-1");
    const log = await store.appendSyncLog({
      requestId: "req-1",
      endpoint: "/api",
      method: "GET",
      requestSummary: "summary",
      statusCode: 200,
      success: true,
      durationMs: 12,
      errorMessage: null,
    });

    expect(ticket?.id).toBe("ticket-1");
    expect(openTicket?.id).toBe("ticket-1");
    expect(openQcTicket?.id).toBe("ticket-1");
    expect(waybill?.waybillNo).toBe("WB-1");
    expect(upsertedWaybill.waybillNo).toBe("WB-1");
    expect(user?.email).toBe("user@test.local");
    expect(userById?.id).toBe("user-1");
    expect(disabled?.isActive).toBe(false);
    expect(log.requestId).toBe("req-1");
    expect(await store.hasRole({
      id: "u1",
      name: "Admin",
      email: "admin@test.local",
      warehouseId: "wh-sh-01",
      roles: ["admin"],
    }, "admin")).toBe(true);
    expect(await store.canAccessWarehouse({
      id: "u1",
      name: "Reporter",
      email: "reporter@test.local",
      warehouseId: "wh-sh-01",
      roles: ["reporter"],
    }, "wh-sh-01")).toBe(true);
  });
});
