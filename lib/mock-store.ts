import { randomUUID } from "crypto";
import {
  configAssumptions,
  demoUsers,
  initialApprovals,
  initialScans,
  initialSyncLogs,
  initialTickets,
  v2Status,
  waybillSnapshots,
} from "@/lib/mock-data";
import type {
  ApprovalRecord,
  ActionResult,
  CompensationRecord,
  ConfigAssumption,
  InventoryEvent,
  ScanRecord,
  SessionUser,
  SyncLog,
  TicketRecord,
  TicketStatus,
  V2StatusSnapshot,
  WaybillSnapshot,
} from "@/lib/types";

declare global {
  var __v3MockStore:
    | {
        tickets: TicketRecord[];
        approvals: ApprovalRecord[];
        scans: ScanRecord[];
        syncLogs: SyncLog[];
        compensations: CompensationRecord[];
        inventoryEvents: InventoryEvent[];
      }
    | undefined;
}

const store =
  globalThis.__v3MockStore ??
  (globalThis.__v3MockStore = {
    tickets: [...initialTickets],
    approvals: [...initialApprovals],
    scans: [...initialScans],
    syncLogs: [...initialSyncLogs],
    compensations: [],
    inventoryEvents: [],
  });

export function listDemoUsers() {
  return demoUsers;
}

export function findDemoUserByEmail(email: string) {
  return demoUsers.find((user) => user.email === email);
}

export function listTickets() {
  return [...store.tickets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getTicket(ticketId: string) {
  return store.tickets.find((ticket) => ticket.id === ticketId) ?? null;
}

export function listApprovals(ticketId: string) {
  return store.approvals.filter((approval) => approval.ticketId === ticketId);
}

export function listCompensations(ticketId?: string) {
  return ticketId
    ? store.compensations.filter((record) => record.ticketId === ticketId)
    : [...store.compensations];
}

export function listInventoryEvents(ticketId?: string) {
  return ticketId
    ? store.inventoryEvents.filter((record) => record.ticketId === ticketId)
    : [...store.inventoryEvents];
}

export function listScans() {
  return [...store.scans].sort((a, b) => b.scannedAt.localeCompare(a.scannedAt));
}

export function listSyncLogs() {
  return [...store.syncLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listWaybills() {
  return waybillSnapshots;
}

export function findWaybill(waybillNo: string) {
  return waybillSnapshots.find((waybill) => waybill.waybillNo === waybillNo) ?? null;
}

export function getV2Status() {
  return v2Status;
}

export function getConfigAssumptions() {
  return configAssumptions;
}

export function createTicket(input: {
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
}) {
  if (input.dedupeOpenSameType !== false) {
    const existing = store.tickets.find(
      (ticket) =>
        ticket.waybillNo === input.waybillNo &&
        ticket.category === input.category &&
        ticket.subtype === input.subtype &&
        !["completed", "closed"].includes(ticket.status),
    );

    if (existing) {
      return existing;
    }
  }

  const nextStatus: TicketStatus = "pending";
  const ticket: TicketRecord = {
    id: randomUUID(),
    ticketNo: `EX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(
      store.tickets.length + 1,
    ).padStart(3, "0")}`,
    waybillNo: input.waybillNo,
    title: input.title,
    category: input.category,
    subtype: input.subtype,
    status: nextStatus,
    amount: input.amount,
    warehouseId: input.reporter.warehouseId,
    reporterId: input.reporter.id,
    reporterName: input.reporter.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary: input.summary,
    dataSource: input.dataSource,
    snapshotSyncedAt: input.snapshotSyncedAt,
    currentApproverLevel: null,
    retryCount: 0,
    version: 1,
    executionStatus: "not_started",
    closedAt: null,
  };

  store.tickets.unshift(ticket);
  return ticket;
}

export function submitTicket(ticketId: string, actor: SessionUser, comment: string) {
  const ticket = getTicket(ticketId);
  if (!ticket) {
    return null;
  }

  if (ticket.status !== "pending") {
    return null;
  }

  ticket.status = "level1_reviewing";
  ticket.currentApproverLevel = 1;
  ticket.updatedAt = new Date().toISOString();
  ticket.version += 1;
  store.approvals.unshift({
    id: randomUUID(),
    ticketId,
    level: 1,
    action: "submit",
    actorId: actor.id,
    actorName: actor.name,
    comment,
    createdAt: new Date().toISOString(),
  });

  return ticket;
}

function createExecutionSideEffects(ticket: TicketRecord, approvalRecordId: string) {
  if (ticket.executionStatus === "completed") {
    return;
  }

  const isQc = ticket.category === "quality_control";
  store.compensations.unshift({
    id: randomUUID(),
    ticketId: ticket.id,
    approvalRecordId,
    amount: ticket.amount,
    direction: isQc ? "supplier_recovery" : "customer_compensation",
    status: "created",
    createdAt: new Date().toISOString(),
  });

  store.inventoryEvents.unshift({
    id: randomUUID(),
    ticketId: ticket.id,
    approvalRecordId,
    eventType: isQc ? "hold_release" : "reship",
    skuCode: null,
    deltaQty: isQc ? 0 : -1,
    warehouseId: ticket.warehouseId,
    createdAt: new Date().toISOString(),
  });

  if (ticket.category === "quality_control") {
    store.scans
      .filter((scan) => scan.ticketId === ticket.id && scan.holdStatus === "held")
      .forEach((scan) => {
        scan.holdStatus = "released";
      });
  }

  ticket.executionStatus = "completed";
}

function findApprovalByToken(ticketId: string, requestToken?: string) {
  if (!requestToken) {
    return null;
  }
  return store.approvals.find((approval) => approval.ticketId === ticketId && approval.requestToken === requestToken) ?? null;
}

export function approveTicket(
  ticketId: string,
  actor: SessionUser,
  comment: string,
  expectedVersion?: number,
  requestToken?: string,
) {
  const ticket = getTicket(ticketId);
  if (!ticket) {
    return { ok: false, code: "not_found", message: "Ticket not found." } satisfies ActionResult;
  }

  if (requestToken) {
    const existingApproval = findApprovalByToken(ticketId, requestToken);
    if (existingApproval) {
      return { ok: true };
    }
  }

  if (expectedVersion !== undefined && ticket.version !== expectedVersion) {
    return {
      ok: false,
      code: "version_conflict",
      message: "This ticket has already been updated by someone else. Please refresh.",
    } satisfies ActionResult;
  }

  if (!["level1_reviewing", "level2_reviewing"].includes(ticket.status)) {
    return {
      ok: false,
      code: "invalid_state",
      message: "Ticket is not in an approvable state.",
    } satisfies ActionResult;
  }

  const currentLevel = ticket.currentApproverLevel ?? 1;
  const threshold = 1000;

  if (currentLevel === 1 && ticket.amount >= threshold) {
    ticket.status = "level2_reviewing";
    ticket.currentApproverLevel = 2;
  } else if (currentLevel === 1) {
    ticket.status = "executing";
    ticket.currentApproverLevel = null;
  } else {
    ticket.status = "executing";
    ticket.currentApproverLevel = null;
  }

  ticket.updatedAt = new Date().toISOString();
  ticket.version += 1;

  const approvalRecord: ApprovalRecord = {
    id: randomUUID(),
    ticketId,
    level: currentLevel,
    action: "approve",
    actorId: actor.id,
    actorName: actor.name,
    comment,
    createdAt: new Date().toISOString(),
    requestToken: requestToken ?? null,
  };
  store.approvals.unshift(approvalRecord);

  if (ticket.status === "executing") {
    createExecutionSideEffects(ticket, approvalRecord.id);
    ticket.status = "completed";
    ticket.closedAt = new Date().toISOString();
    ticket.version += 1;
  }

  return { ok: true };
}

export function rejectTicket(
  ticketId: string,
  actor: SessionUser,
  comment: string,
  expectedVersion?: number,
  requestToken?: string,
) {
  const ticket = getTicket(ticketId);
  if (!ticket) {
    return { ok: false, code: "not_found", message: "Ticket not found." } satisfies ActionResult;
  }

  if (requestToken) {
    const existingApproval = findApprovalByToken(ticketId, requestToken);
    if (existingApproval) {
      return { ok: true };
    }
  }

  if (expectedVersion !== undefined && ticket.version !== expectedVersion) {
    return {
      ok: false,
      code: "version_conflict",
      message: "This ticket has already been updated by someone else. Please refresh.",
    } satisfies ActionResult;
  }

  if (!["level1_reviewing", "level2_reviewing"].includes(ticket.status)) {
    return {
      ok: false,
      code: "invalid_state",
      message: "Ticket is not in a rejectable state.",
    } satisfies ActionResult;
  }

  const currentLevel = ticket.currentApproverLevel ?? 1;
  ticket.status = "pending";
  ticket.currentApproverLevel = null;
  ticket.retryCount += 1;
  ticket.updatedAt = new Date().toISOString();
  ticket.version += 1;

  if (ticket.retryCount > 2) {
    ticket.status = "closed";
    ticket.closedAt = new Date().toISOString();
  }

  store.approvals.unshift({
    id: randomUUID(),
    ticketId,
    level: currentLevel,
    action: "reject",
    actorId: actor.id,
    actorName: actor.name,
    comment,
    createdAt: new Date().toISOString(),
    requestToken: requestToken ?? null,
  });

  return { ok: true };
}

export function createScan(input: {
  waybillNo: string;
  skuCode: string;
  operatorName: string;
  warehouseId: string;
  result: ScanRecord["result"];
  abnormalReason: string | null;
  holdStatus: ScanRecord["holdStatus"];
  ticketId: string | null;
}) {
  const record: ScanRecord = {
    id: randomUUID(),
    waybillNo: input.waybillNo,
    skuCode: input.skuCode,
    operatorName: input.operatorName,
    warehouseId: input.warehouseId,
    scannedAt: new Date().toISOString(),
    result: input.result,
    abnormalReason: input.abnormalReason,
    holdStatus: input.holdStatus,
    ticketId: input.ticketId,
    ruleId: input.holdStatus === "held" ? "qc-rule-damage-default" : null,
  };

  store.scans.unshift(record);
  return record;
}

export function appendSyncLog(log: Omit<SyncLog, "id" | "createdAt">) {
  const full: SyncLog = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...log,
  };
  store.syncLogs.unshift(full);
  return full;
}

export function findOpenTicketByWaybillAndSubtype(
  waybillNo: string,
  category: TicketRecord["category"],
  subtype: string,
) {
  return (
    store.tickets.find(
      (ticket) =>
        ticket.waybillNo === waybillNo &&
        ticket.category === category &&
        ticket.subtype === subtype &&
        !["completed", "closed"].includes(ticket.status),
    ) ?? null
  );
}

export function findOpenQcTicketByWaybill(waybillNo: string) {
  return (
    store.tickets.find(
      (ticket) =>
        ticket.waybillNo === waybillNo &&
        ticket.category === "quality_control" &&
        !["completed", "closed"].includes(ticket.status),
    ) ?? null
  );
}

export function resetMockStore() {
  globalThis.__v3MockStore = {
    tickets: [...initialTickets.map((ticket) => ({ ...ticket }))],
    approvals: [...initialApprovals.map((approval) => ({ ...approval }))],
    scans: [...initialScans.map((scan) => ({ ...scan }))],
    syncLogs: [...initialSyncLogs.map((log) => ({ ...log }))],
    compensations: [],
    inventoryEvents: [],
  };
}

export function hasRole(user: SessionUser, role: SessionUser["roles"][number]) {
  return user.roles.includes(role);
}

export function canAccessWarehouse(user: SessionUser, warehouseId: string) {
  return user.roles.includes("admin") || user.warehouseId === warehouseId;
}

export function getSeedData(): {
  tickets: TicketRecord[];
  approvals: ApprovalRecord[];
  scans: ScanRecord[];
  syncLogs: SyncLog[];
  compensations: CompensationRecord[];
  inventoryEvents: InventoryEvent[];
  waybills: WaybillSnapshot[];
  v2Status: V2StatusSnapshot;
  assumptions: ConfigAssumption[];
} {
  return {
    tickets: listTickets(),
    approvals: [...store.approvals],
    scans: listScans(),
    syncLogs: listSyncLogs(),
    compensations: listCompensations(),
    inventoryEvents: listInventoryEvents(),
    waybills: listWaybills(),
    v2Status,
    assumptions: configAssumptions,
  };
}
