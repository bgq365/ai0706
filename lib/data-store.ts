import {
  appendSyncLog as appendMockSyncLog,
  approveTicket as approveMockTicket,
  canAccessWarehouse as canAccessMockWarehouse,
  createScan as createMockScan,
  createTicket as createMockTicket,
  disableDemoUser as disableMockDemoUser,
  fastReleaseQcTicket as fastReleaseMockQcTicket,
  findDemoUserByEmail as findMockDemoUserByEmail,
  findDemoUserById as findMockDemoUserById,
  findOpenQcTicketByWaybill as findMockOpenQcTicketByWaybill,
  findOpenTicketByWaybillAndSubtype as findMockOpenTicketByWaybillAndSubtype,
  findWaybill as findMockWaybill,
  getConfigAssumptions as getMockConfigAssumptions,
  getSeedData as getMockSeedData,
  getTicket as getMockTicket,
  getV2Status as getMockV2Status,
  hasRole as hasMockRole,
  listApprovals as listMockApprovals,
  listDemoUsers as listMockDemoUsers,
  listSyncLogs as listMockSyncLogs,
  listTickets as listMockTickets,
  listWaybills as listMockWaybills,
  processApprovalTimeouts as processMockApprovalTimeouts,
  reassignDisabledApproverTickets as reassignMockDisabledApproverTickets,
  rejectTicket as rejectMockTicket,
  resetMockStore,
  submitTicket as submitMockTicket,
  upsertWaybillSnapshot as upsertMockWaybillSnapshot,
} from "@/lib/mock-store";
import { env } from "@/lib/env";
import type {
  ActionResult,
  ApprovalRecord,
  CompensationRecord,
  ConfigAssumption,
  InventoryEvent,
  ScanRecord,
  SessionUser,
  SyncLog,
  TicketRecord,
  TimeoutProcessResult,
  V2StatusSnapshot,
  WaybillSnapshot,
} from "@/lib/types";

export interface StoreSeedData {
  tickets: TicketRecord[];
  approvals: ApprovalRecord[];
  scans: ScanRecord[];
  syncLogs: SyncLog[];
  compensations: CompensationRecord[];
  inventoryEvents: InventoryEvent[];
  waybills: WaybillSnapshot[];
  v2Status: V2StatusSnapshot;
  assumptions: ConfigAssumption[];
}

export interface TicketInput {
  waybillNo: string;
  title: string;
  category: TicketRecord["category"];
  subtype: string;
  amount: number;
  summary: string;
  reporter: SessionUser;
  dataSource: TicketRecord["dataSource"];
  snapshotSyncedAt: string;
  dedupeOpenSameType?: boolean;
}

export interface ScanInput {
  waybillNo: string;
  skuCode: string;
  operatorName: string;
  warehouseId: string;
  result: ScanRecord["result"];
  abnormalReason: string | null;
  holdStatus: ScanRecord["holdStatus"];
  ticketId: string | null;
}

export interface StoreAdapter {
  mode: "mock-store" | "supabase";
  listTickets(): Promise<TicketRecord[]>;
  getTicket(ticketId: string): Promise<TicketRecord | null>;
  listApprovals(ticketId: string): Promise<ApprovalRecord[]>;
  createTicket(input: TicketInput): Promise<TicketRecord>;
  submitTicket(ticketId: string, actor: SessionUser, comment: string): Promise<TicketRecord | null>;
  approveTicket(
    ticketId: string,
    actor: SessionUser,
    comment: string,
    expectedVersion?: number,
    requestToken?: string,
  ): Promise<ActionResult>;
  rejectTicket(
    ticketId: string,
    actor: SessionUser,
    comment: string,
    expectedVersion?: number,
    requestToken?: string,
  ): Promise<ActionResult>;
  fastReleaseQcTicket(
    ticketId: string,
    actor: SessionUser,
    comment: string,
    expectedVersion?: number,
    requestToken?: string,
  ): Promise<ActionResult>;
  processApprovalTimeouts(now?: Date): Promise<TimeoutProcessResult>;
  findOpenTicketByWaybillAndSubtype(
    waybillNo: string,
    category: TicketRecord["category"],
    subtype: string,
  ): Promise<TicketRecord | null>;
  findOpenQcTicketByWaybill(waybillNo: string): Promise<TicketRecord | null>;
  createScan(input: ScanInput): Promise<ScanRecord>;
  listSyncLogs(): Promise<SyncLog[]>;
  appendSyncLog(log: Omit<SyncLog, "id" | "createdAt">): Promise<SyncLog>;
  findWaybill(waybillNo: string): Promise<WaybillSnapshot | null>;
  listWaybills(): Promise<WaybillSnapshot[]>;
  upsertWaybillSnapshot(snapshot: WaybillSnapshot): Promise<WaybillSnapshot>;
  getV2Status(): Promise<V2StatusSnapshot>;
  getConfigAssumptions(): Promise<ConfigAssumption[]>;
  listDemoUsers(): Promise<SessionUser[]>;
  findDemoUserByEmail(email: string): Promise<(SessionUser & { password?: string }) | undefined>;
  findDemoUserById(userId: string): Promise<SessionUser | null>;
  disableDemoUser(userId: string): Promise<SessionUser | null>;
  reassignDisabledApproverTickets(
    disabledUserId: string,
    fallbackApproverId: string,
    actor: SessionUser,
    comment: string,
  ): Promise<ActionResult>;
  hasRole(user: SessionUser, role: SessionUser["roles"][number]): Promise<boolean>;
  canAccessWarehouse(user: SessionUser, warehouseId: string): Promise<boolean>;
  getSeedData(): Promise<StoreSeedData>;
  reset?(): Promise<void>;
}

const mockAdapter: StoreAdapter = {
  mode: "mock-store",
  async listTickets() {
    return listMockTickets();
  },
  async getTicket(ticketId) {
    return getMockTicket(ticketId);
  },
  async listApprovals(ticketId) {
    return listMockApprovals(ticketId);
  },
  async createTicket(input) {
    return createMockTicket(input);
  },
  async submitTicket(ticketId, actor, comment) {
    return submitMockTicket(ticketId, actor, comment);
  },
  async approveTicket(ticketId, actor, comment, expectedVersion, requestToken) {
    return approveMockTicket(ticketId, actor, comment, expectedVersion, requestToken);
  },
  async rejectTicket(ticketId, actor, comment, expectedVersion, requestToken) {
    return rejectMockTicket(ticketId, actor, comment, expectedVersion, requestToken);
  },
  async fastReleaseQcTicket(ticketId, actor, comment, expectedVersion, requestToken) {
    return fastReleaseMockQcTicket(ticketId, actor, comment, expectedVersion, requestToken);
  },
  async processApprovalTimeouts(now) {
    return processMockApprovalTimeouts(now);
  },
  async findOpenTicketByWaybillAndSubtype(waybillNo, category, subtype) {
    return findMockOpenTicketByWaybillAndSubtype(waybillNo, category, subtype);
  },
  async findOpenQcTicketByWaybill(waybillNo) {
    return findMockOpenQcTicketByWaybill(waybillNo);
  },
  async createScan(input) {
    return createMockScan(input);
  },
  async listSyncLogs() {
    return listMockSyncLogs();
  },
  async appendSyncLog(log) {
    return appendMockSyncLog(log);
  },
  async findWaybill(waybillNo) {
    return findMockWaybill(waybillNo);
  },
  async listWaybills() {
    return listMockWaybills();
  },
  async upsertWaybillSnapshot(snapshot) {
    return upsertMockWaybillSnapshot(snapshot);
  },
  async getV2Status() {
    return getMockV2Status();
  },
  async getConfigAssumptions() {
    return getMockConfigAssumptions();
  },
  async listDemoUsers() {
    return listMockDemoUsers();
  },
  async findDemoUserByEmail(email) {
    return findMockDemoUserByEmail(email);
  },
  async findDemoUserById(userId) {
    return findMockDemoUserById(userId);
  },
  async disableDemoUser(userId) {
    return disableMockDemoUser(userId);
  },
  async reassignDisabledApproverTickets(disabledUserId, fallbackApproverId, actor, comment) {
    return reassignMockDisabledApproverTickets(disabledUserId, fallbackApproverId, actor, comment);
  },
  async hasRole(user, role) {
    return hasMockRole(user, role);
  },
  async canAccessWarehouse(user, warehouseId) {
    return canAccessMockWarehouse(user, warehouseId);
  },
  async getSeedData() {
    return getMockSeedData();
  },
  async reset() {
    resetMockStore();
  },
};

export function getStoreMode() {
  if (env.enableSupabase && env.supabaseUrl && env.supabaseServiceRoleKey) {
    return "supabase";
  }

  return "mock-store";
}

export async function getStore(): Promise<StoreAdapter> {
  if (getStoreMode() === "supabase") {
    const { createSupabaseStore } = await import("@/lib/supabase-store");
    return createSupabaseStore(mockAdapter);
  }

  return mockAdapter;
}
