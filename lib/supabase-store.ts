import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import type { StoreAdapter, StoreSeedData, TicketInput, ScanInput } from "@/lib/data-store";
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

function createSupabaseAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function mapTicket(row: Record<string, unknown>): TicketRecord {
  return {
    id: String(row.id),
    ticketNo: String(row.ticket_no),
    waybillNo: String(row.waybill_no),
    title: String(row.title),
    category: row.category as TicketRecord["category"],
    subtype: String(row.subtype),
    status: row.status as TicketRecord["status"],
    amount: Number(row.amount),
    warehouseId: String(row.warehouse_id),
    reporterId: String(row.reporter_id ?? ""),
    reporterName: String(row.reporter_name ?? "Unknown Reporter"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    summary: String(row.summary),
    dataSource: row.data_source as TicketRecord["dataSource"],
    snapshotSyncedAt: String(row.snapshot_synced_at),
    currentApproverLevel: (row.current_approver_level as 1 | 2 | null) ?? null,
    retryCount: Number(row.retry_count ?? 0),
    version: Number(row.version ?? 1),
    executionStatus: (row.execution_status as TicketRecord["executionStatus"]) ?? "not_started",
    closedAt: (row.closed_at as string | null) ?? null,
    assignedApproverId: (row.assigned_approver_id as string | null) ?? null,
    assignedApproverName: (row.assigned_approver_name as string | null) ?? null,
    dueAt: (row.due_at as string | null) ?? null,
    timeoutEscalationCount: Number(row.timeout_escalation_count ?? 0),
  };
}

function mapApproval(row: Record<string, unknown>): ApprovalRecord {
  return {
    id: String(row.id),
    ticketId: String(row.ticket_id),
    level: Number(row.level) as 1 | 2,
    action: row.action as ApprovalRecord["action"],
    actorId: String(row.actor_id ?? ""),
    actorName: String(row.actor_name),
    comment: String(row.comment),
    createdAt: String(row.created_at),
    requestToken: (row.request_token as string | null) ?? null,
  };
}

function mapScan(row: Record<string, unknown>): ScanRecord {
  return {
    id: String(row.id),
    waybillNo: String(row.waybill_no),
    skuCode: String(row.sku_code),
    operatorName: String(row.operator_name),
    warehouseId: String(row.warehouse_id),
    scannedAt: String(row.scanned_at),
    result: row.result as ScanRecord["result"],
    abnormalReason: (row.abnormal_reason as string | null) ?? null,
    holdStatus: row.hold_status as ScanRecord["holdStatus"],
    ticketId: (row.ticket_id as string | null) ?? null,
    ruleId: (row.rule_id as string | null) ?? null,
  };
}

function mapSyncLog(row: Record<string, unknown>): SyncLog {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    endpoint: String(row.endpoint),
    method: row.method as SyncLog["method"],
    requestSummary: String(row.request_summary),
    statusCode: Number(row.status_code),
    success: Boolean(row.success),
    durationMs: Number(row.duration_ms),
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapWaybill(row: Record<string, unknown>): WaybillSnapshot {
  return {
    waybillNo: String(row.waybill_no),
    customerName: String(row.customer_name),
    receiverName: String(row.receiver_name),
    receiverPhone: String(row.receiver_phone),
    amount: Number(row.amount),
    status: String(row.status),
    warehouseId: String(row.warehouse_id),
    syncedAt: String(row.synced_at),
  };
}

function mapUser(row: Record<string, unknown>): SessionUser {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    warehouseId: String(row.warehouse_id),
    roles: Array.isArray(row.roles) ? (row.roles as SessionUser["roles"]) : ["reporter"],
    isActive: Boolean(row.is_active),
  };
}

async function withFallback<T>(fallback: () => Promise<T>, work: () => Promise<T>) {
  try {
    return await work();
  } catch {
    return fallback();
  }
}

export function createSupabaseStore(mockStore: StoreAdapter): StoreAdapter {
  const client = createSupabaseAdminClient();

  return {
    mode: "supabase",
    async listTickets() {
      return withFallback(
        () => mockStore.listTickets(),
        async () => {
          const { data, error } = await client
            .from("exception_tickets")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            throw error;
          }

          return (data ?? []).map((row) => mapTicket(row));
        },
      );
    },
    async getTicket(ticketId) {
      return withFallback(
        () => mockStore.getTicket(ticketId),
        async () => {
          const { data, error } = await client
            .from("exception_tickets")
            .select("*")
            .eq("id", ticketId)
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data ? mapTicket(data) : null;
        },
      );
    },
    async listApprovals(ticketId) {
      return withFallback(
        () => mockStore.listApprovals(ticketId),
        async () => {
          const { data, error } = await client
            .from("approval_records")
            .select("*")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true });

          if (error) {
            throw error;
          }

          return (data ?? []).map((row) => mapApproval(row));
        },
      );
    },
    async createTicket(input: TicketInput) {
      return withFallback(
        () => mockStore.createTicket(input),
        async () => {
          const existing = await this.findOpenTicketByWaybillAndSubtype(
            input.waybillNo,
            input.category,
            input.subtype,
          );
          if (existing && input.dedupeOpenSameType !== false) {
            return existing;
          }

          const now = new Date().toISOString();
          const id = randomUUID();
          const ticketNo = `EX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
            .toString()
            .slice(-6)}`;

          const payload = {
            id,
            ticket_no: ticketNo,
            waybill_no: input.waybillNo,
            title: input.title,
            category: input.category,
            subtype: input.subtype,
            status: "pending",
            amount: input.amount,
            warehouse_id: input.reporter.warehouseId,
            reporter_id: input.reporter.id,
            reporter_name: input.reporter.name,
            summary: input.summary,
            data_source: input.dataSource,
            snapshot_synced_at: input.snapshotSyncedAt,
            current_approver_level: null,
            retry_count: 0,
            created_at: now,
            updated_at: now,
            version: 1,
            execution_status: "not_started",
            closed_at: null,
            assigned_approver_id: null,
            assigned_approver_name: null,
            due_at: null,
            timeout_escalation_count: 0,
          };

          const { data, error } = await client
            .from("exception_tickets")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return mapTicket(data);
        },
      );
    },
    async submitTicket(ticketId, actor, comment) {
      return withFallback(
        () => mockStore.submitTicket(ticketId, actor, comment),
        async () => {
          const current = await this.getTicket(ticketId);
          if (!current || current.status !== "pending") {
            return current;
          }

          const updatedAt = new Date().toISOString();
          const dueAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

          const { data, error } = await client
            .from("exception_tickets")
            .update({
              status: "level1_reviewing",
              current_approver_level: 1,
              updated_at: updatedAt,
              version: current.version + 1,
              due_at: dueAt,
            })
            .eq("id", ticketId)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          const { error: approvalError } = await client.from("approval_records").insert({
            id: randomUUID(),
            ticket_id: ticketId,
            level: 1,
            action: "submit",
            actor_id: actor.id,
            actor_name: actor.name,
            comment,
            created_at: updatedAt,
            request_token: null,
          });

          if (approvalError) {
            throw approvalError;
          }

          return mapTicket(data);
        },
      );
    },
    async approveTicket(ticketId, actor, comment, expectedVersion, requestToken) {
      return mockStore.approveTicket(ticketId, actor, comment, expectedVersion, requestToken);
    },
    async rejectTicket(ticketId, actor, comment, expectedVersion, requestToken) {
      return mockStore.rejectTicket(ticketId, actor, comment, expectedVersion, requestToken);
    },
    async fastReleaseQcTicket(ticketId, actor, comment, expectedVersion, requestToken) {
      return mockStore.fastReleaseQcTicket(ticketId, actor, comment, expectedVersion, requestToken);
    },
    async processApprovalTimeouts(now?: Date): Promise<TimeoutProcessResult> {
      return mockStore.processApprovalTimeouts(now);
    },
    async findOpenTicketByWaybillAndSubtype(waybillNo, category, subtype) {
      return withFallback(
        () => mockStore.findOpenTicketByWaybillAndSubtype(waybillNo, category, subtype),
        async () => {
          const { data, error } = await client
            .from("exception_tickets")
            .select("*")
            .eq("waybill_no", waybillNo)
            .eq("category", category)
            .eq("subtype", subtype)
            .not("status", "in", '("completed","closed")')
            .limit(1)
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data ? mapTicket(data) : null;
        },
      );
    },
    async findOpenQcTicketByWaybill(waybillNo) {
      return withFallback(
        () => mockStore.findOpenQcTicketByWaybill(waybillNo),
        async () => {
          const { data, error } = await client
            .from("exception_tickets")
            .select("*")
            .eq("waybill_no", waybillNo)
            .eq("category", "quality_control")
            .not("status", "in", '("completed","closed")')
            .limit(1)
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data ? mapTicket(data) : null;
        },
      );
    },
    async createScan(input: ScanInput) {
      return withFallback(
        () => mockStore.createScan(input),
        async () => {
          const payload = {
            id: randomUUID(),
            waybill_no: input.waybillNo,
            sku_code: input.skuCode,
            operator_name: input.operatorName,
            warehouse_id: input.warehouseId,
            result: input.result,
            abnormal_reason: input.abnormalReason,
            hold_status: input.holdStatus,
            ticket_id: input.ticketId,
            scanned_at: new Date().toISOString(),
            rule_id: input.holdStatus === "held" ? "qc-rule-damage-default" : null,
          };

          const { data, error } = await client
            .from("scan_records")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return mapScan(data);
        },
      );
    },
    async listSyncLogs() {
      return withFallback(
        () => mockStore.listSyncLogs(),
        async () => {
          const { data, error } = await client
            .from("sync_logs")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) {
            throw error;
          }

          return (data ?? []).map((row) => mapSyncLog(row));
        },
      );
    },
    async appendSyncLog(log) {
      return withFallback(
        () => mockStore.appendSyncLog(log),
        async () => {
          const payload = {
            id: randomUUID(),
            request_id: log.requestId,
            endpoint: log.endpoint,
            method: log.method,
            request_summary: log.requestSummary,
            status_code: log.statusCode,
            success: log.success,
            duration_ms: log.durationMs,
            error_message: log.errorMessage,
            created_at: new Date().toISOString(),
          };

          const { data, error } = await client
            .from("sync_logs")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return mapSyncLog(data);
        },
      );
    },
    async findWaybill(waybillNo) {
      return withFallback(
        () => mockStore.findWaybill(waybillNo),
        async () => {
          const { data, error } = await client
            .from("waybill_snapshots")
            .select("*")
            .eq("waybill_no", waybillNo)
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data ? mapWaybill(data) : null;
        },
      );
    },
    async listWaybills() {
      return withFallback(
        () => mockStore.listWaybills(),
        async () => {
          const { data, error } = await client
            .from("waybill_snapshots")
            .select("*")
            .order("synced_at", { ascending: false });

          if (error) {
            throw error;
          }

          return (data ?? []).map((row) => mapWaybill(row));
        },
      );
    },
    async upsertWaybillSnapshot(snapshot) {
      return withFallback(
        () => mockStore.upsertWaybillSnapshot(snapshot),
        async () => {
          const payload = {
            waybill_no: snapshot.waybillNo,
            customer_name: snapshot.customerName,
            receiver_name: snapshot.receiverName,
            receiver_phone: snapshot.receiverPhone,
            amount: snapshot.amount,
            status: snapshot.status,
            warehouse_id: snapshot.warehouseId,
            synced_at: snapshot.syncedAt,
            source_request_id: null,
          };

          const { data, error } = await client
            .from("waybill_snapshots")
            .upsert(payload, { onConflict: "waybill_no" })
            .select("*")
            .single();

          if (error) {
            throw error;
          }

          return mapWaybill(data);
        },
      );
    },
    async getV2Status(): Promise<V2StatusSnapshot> {
      return mockStore.getV2Status();
    },
    async getConfigAssumptions(): Promise<ConfigAssumption[]> {
      return mockStore.getConfigAssumptions();
    },
    async listDemoUsers() {
      return withFallback(
        () => mockStore.listDemoUsers(),
        async () => {
          const { data, error } = await client
            .from("users")
            .select("id, email, name, warehouse_id, is_active, user_role_bindings(role_code)")
            .order("created_at", { ascending: true });

          if (error) {
            throw error;
          }

          return (data ?? []).map((row) =>
            mapUser({
              ...row,
              roles: Array.isArray(row.user_role_bindings)
                ? row.user_role_bindings.map((binding) => binding.role_code)
                : ["reporter"],
            }),
          );
        },
      );
    },
    async findDemoUserByEmail(email) {
      return withFallback(
        () => mockStore.findDemoUserByEmail(email),
        async () => {
          const users = await this.listDemoUsers();
          return users.find((user) => user.email === email);
        },
      );
    },
    async findDemoUserById(userId) {
      return withFallback(
        () => mockStore.findDemoUserById(userId),
        async () => {
          const users = await this.listDemoUsers();
          return users.find((user) => user.id === userId) ?? null;
        },
      );
    },
    async disableDemoUser(userId) {
      return withFallback(
        () => mockStore.disableDemoUser(userId),
        async () => {
          const { data, error } = await client
            .from("users")
            .update({ is_active: false })
            .eq("id", userId)
            .select("id, email, name, warehouse_id, is_active")
            .maybeSingle();

          if (error) {
            throw error;
          }

          return data
            ? {
                id: String(data.id),
                email: String(data.email),
                name: String(data.name),
                warehouseId: String(data.warehouse_id),
                roles: ["reporter"],
                isActive: Boolean(data.is_active),
              }
            : null;
        },
      );
    },
    async reassignDisabledApproverTickets(disabledUserId, fallbackApproverId, actor, comment) {
      return mockStore.reassignDisabledApproverTickets(disabledUserId, fallbackApproverId, actor, comment);
    },
    async hasRole(user, role) {
      return user.roles.includes(role);
    },
    async canAccessWarehouse(user, warehouseId) {
      return user.roles.includes("admin") || user.warehouseId === warehouseId;
    },
    async getSeedData(): Promise<StoreSeedData> {
      const [tickets, assumptions, syncLogs, users, waybills] = await Promise.all([
        this.listTickets(),
        this.getConfigAssumptions(),
        this.listSyncLogs(),
        this.listDemoUsers(),
        this.listWaybills(),
      ]);

      const approvalsByTicket = await Promise.all(tickets.map((ticket) => this.listApprovals(ticket.id)));

      return {
        tickets,
        approvals: approvalsByTicket.flat(),
        scans: [],
        syncLogs,
        compensations: [],
        inventoryEvents: [],
        waybills,
        v2Status: await this.getV2Status(),
        assumptions,
      };
    },
  };
}
