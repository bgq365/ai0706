export type TicketCategory = "logistics" | "quality_control";

export type TicketStatus =
  | "pending"
  | "level1_reviewing"
  | "level2_reviewing"
  | "executing"
  | "completed"
  | "rejected"
  | "closed";

export type ScanHoldStatus = "normal" | "held" | "released" | "returned" | "reprocured";

export type UserRole =
  | "reporter"
  | "level1_approver"
  | "level2_approver"
  | "qc_supervisor"
  | "admin";

export type CompensationDirection = "customer_compensation" | "supplier_recovery";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  warehouseId: string;
  roles: UserRole[];
}

export interface TicketRecord {
  id: string;
  ticketNo: string;
  waybillNo: string;
  title: string;
  category: TicketCategory;
  subtype: string;
  status: TicketStatus;
  amount: number;
  warehouseId: string;
  reporterId: string;
  reporterName: string;
  createdAt: string;
  updatedAt: string;
  summary: string;
  dataSource: "v2-live" | "snapshot";
  snapshotSyncedAt: string;
  currentApproverLevel: 1 | 2 | null;
  retryCount: number;
  version: number;
  executionStatus: "not_started" | "completed";
  closedAt?: string | null;
}

export interface ApprovalRecord {
  id: string;
  ticketId: string;
  level: 1 | 2;
  action: "submit" | "approve" | "reject";
  actorId: string;
  actorName: string;
  comment: string;
  createdAt: string;
  requestToken?: string | null;
}

export interface ScanRecord {
  id: string;
  waybillNo: string;
  skuCode: string;
  operatorName: string;
  warehouseId: string;
  scannedAt: string;
  result: "passed" | "abnormal";
  abnormalReason: string | null;
  holdStatus: ScanHoldStatus;
  ticketId: string | null;
  ruleId?: string | null;
}

export interface CompensationRecord {
  id: string;
  ticketId: string;
  approvalRecordId: string;
  amount: number;
  direction: CompensationDirection;
  status: "draft" | "created";
  createdAt: string;
}

export interface InventoryEvent {
  id: string;
  ticketId: string;
  approvalRecordId: string;
  eventType: "restock" | "reship" | "hold_release";
  skuCode: string | null;
  deltaQty: number | null;
  warehouseId: string;
  createdAt: string;
}

export interface ActionResult {
  ok: boolean;
  code?: string;
  message?: string;
}

export interface SyncLog {
  id: string;
  requestId: string;
  endpoint: string;
  method: "GET" | "POST";
  requestSummary: string;
  statusCode: number;
  success: boolean;
  durationMs: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface V2StatusSnapshot {
  overall: "healthy" | "degraded" | "down";
  lastSuccessfulSyncAt: string;
  successRate24h: number;
  fallbackMode: boolean;
  notes: string[];
}

export interface ConfigAssumption {
  key: string;
  value: string;
  rationale: string;
}

export interface WaybillSnapshot {
  waybillNo: string;
  customerName: string;
  receiverName: string;
  receiverPhone: string;
  amount: number;
  status: string;
  warehouseId: string;
  syncedAt: string;
}
