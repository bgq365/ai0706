import {
  approveTicket,
  createTicket,
  disableDemoUser,
  findOpenQcTicketByWaybill,
  findDemoUserById,
  fastReleaseQcTicket,
  getSeedData,
  getTicket,
  processApprovalTimeouts,
  reassignDisabledApproverTickets,
  listApprovals,
  listCompensations,
  listInventoryEvents,
  rejectTicket,
  resetMockStore,
  submitTicket,
} from "@/lib/mock-store";
import type { SessionUser } from "@/lib/types";

const reporter: SessionUser = {
  id: "reporter-1",
  name: "测试上报人",
  email: "reporter@test.local",
  warehouseId: "wh-sh-01",
  roles: ["reporter"],
};

const approverL1: SessionUser = {
  id: "approver-l1",
  name: "一级审批",
  email: "l1@test.local",
  warehouseId: "wh-sh-01",
  roles: ["level1_approver"],
};

const approverL2: SessionUser = {
  id: "approver-l2",
  name: "二级审批",
  email: "l2@test.local",
  warehouseId: "wh-sh-01",
  roles: ["level2_approver", "qc_supervisor"],
};

describe("mock-store rubric behaviors", () => {
  beforeEach(() => {
    resetMockStore();
  });

  it("deduplicates open tickets with the same waybill/category/subtype", () => {
    const first = createTicket({
      waybillNo: "WB20260706001",
      title: "客户拒收待审批",
      category: "logistics",
      subtype: "客户拒收",
      amount: 500,
      summary: "第一次创建",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
    });

    const second = createTicket({
      waybillNo: "WB20260706001",
      title: "客户拒收待审批",
      category: "logistics",
      subtype: "客户拒收",
      amount: 500,
      summary: "重复创建",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
    });

    expect(second.id).toBe(first.id);
  });

  it("prevents concurrent approval by version conflict", () => {
    const target = getTicket("ticket-002");
    expect(target).not.toBeNull();
    const version = target!.version;

    const first = approveTicket("ticket-002", approverL1, "通过", version, "token-first-001");
    const second = approveTicket("ticket-002", approverL1, "重复通过", version, "token-second-001");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.code).toBe("version_conflict");
  });

  it("keeps approval idempotent for repeated request token", () => {
    const target = getTicket("ticket-002");
    expect(target).not.toBeNull();

    const version = target!.version;
    const first = approveTicket("ticket-002", approverL1, "通过", version, "token-same-001");
    const second = approveTicket("ticket-002", approverL1, "通过", version, "token-same-001");

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(listApprovals("ticket-002").filter((record) => record.requestToken === "token-same-001")).toHaveLength(1);
  });

  it("creates compensation and inventory traces when approval completes execution", () => {
    const ticket = createTicket({
      waybillNo: "WB20260706003",
      title: "物流异常待审批",
      category: "logistics",
      subtype: "超时未签收",
      amount: 320,
      summary: "执行联动测试",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
      dedupeOpenSameType: false,
    });

    submitTicket(ticket.id, reporter, "提交审批");
    const afterSubmit = getTicket(ticket.id)!;
    const result = approveTicket(ticket.id, approverL1, "一级通过", afterSubmit.version, "exec-token-001");

    expect(result.ok).toBe(true);
    expect(getTicket(ticket.id)?.status).toBe("completed");
    expect(listCompensations(ticket.id)).toHaveLength(1);
    expect(listInventoryEvents(ticket.id)).toHaveLength(1);
    expect(listInventoryEvents(ticket.id)[0]?.approvalRecordId).toBeTruthy();
  });

  it("reuses an open qc ticket for repeated abnormal scans on the same waybill", () => {
    const existing = findOpenQcTicketByWaybill("WB20260706001");
    expect(existing).not.toBeNull();
    expect(existing?.category).toBe("quality_control");
  });

  it("closes ticket after exceeding retry limit", () => {
    const ticket = createTicket({
      waybillNo: "WB20260706002",
      title: "拒收重提测试",
      category: "logistics",
      subtype: "客户拒收-重提",
      amount: 300,
      summary: "测试重提次数上限",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
      dedupeOpenSameType: false,
    });

    submitTicket(ticket.id, reporter, "第一次提交");
    let current = getTicket(ticket.id)!;
    rejectTicket(ticket.id, approverL1, "驳回1", current.version, "reject-001");

    submitTicket(ticket.id, reporter, "第二次提交");
    current = getTicket(ticket.id)!;
    rejectTicket(ticket.id, approverL1, "驳回2", current.version, "reject-002");

    submitTicket(ticket.id, reporter, "第三次提交");
    current = getTicket(ticket.id)!;
    rejectTicket(ticket.id, approverL1, "驳回3", current.version, "reject-003");

    expect(getTicket(ticket.id)?.status).toBe("closed");
  });

  it("routes high-value tickets to level 2 before completion", () => {
    const ticket = createTicket({
      waybillNo: "WB20260706002",
      title: "高金额测试",
      category: "logistics",
      subtype: "破损高额",
      amount: 1800,
      summary: "需要二级审批",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
      dedupeOpenSameType: false,
    });

    submitTicket(ticket.id, reporter, "提交");
    const current = getTicket(ticket.id)!;
    const firstApproval = approveTicket(ticket.id, approverL1, "升级二级", current.version, "lv2-001");

    expect(firstApproval.ok).toBe(true);
    expect(getTicket(ticket.id)?.status).toBe("level2_reviewing");
    expect(getTicket(ticket.id)?.currentApproverLevel).toBe(2);

    const secondCurrent = getTicket(ticket.id)!;
    const secondApproval = approveTicket(ticket.id, approverL2, "二级通过", secondCurrent.version, "lv2-002");

    expect(secondApproval.ok).toBe(true);
    expect(getTicket(ticket.id)?.status).toBe("completed");
  });

  it("exposes execution traces in seed data", () => {
    const seed = getSeedData();
    expect(Array.isArray(seed.tickets)).toBe(true);
    expect(Array.isArray(seed.syncLogs)).toBe(true);
    expect(Array.isArray(seed.compensations)).toBe(true);
    expect(Array.isArray(seed.inventoryEvents)).toBe(true);
  });

  it("escalates overdue level 1 approvals to level 2", () => {
    const ticket = createTicket({
      waybillNo: "WB20260706003",
      title: "超时升级测试",
      category: "logistics",
      subtype: "超时升级-唯一",
      amount: 200,
      summary: "测试审批超时升级",
      reporter,
      dataSource: "snapshot",
      snapshotSyncedAt: new Date().toISOString(),
      dedupeOpenSameType: false,
    });
    submitTicket(ticket.id, reporter, "提交");

    const current = getTicket(ticket.id)!;
    current.dueAt = new Date(Date.now() - 60_000).toISOString();

    const result = processApprovalTimeouts(new Date());

    expect(result.escalatedToLevel2).toContain(ticket.id);
    expect(getTicket(ticket.id)?.status).toBe("level2_reviewing");
    expect(getTicket(ticket.id)?.currentApproverLevel).toBe(2);
  });

  it("auto closes overdue level 2 approvals", () => {
    const current = getTicket("ticket-001")!;
    current.dueAt = new Date(Date.now() - 60_000).toISOString();

    const result = processApprovalTimeouts(new Date());

    expect(result.autoClosed).toContain("ticket-001");
    expect(getTicket("ticket-001")?.status).toBe("closed");
  });

  it("reassigns tickets from a disabled approver to a fallback approver", () => {
    disableDemoUser("user-l1-01");
    const outcome = reassignDisabledApproverTickets(
      "user-l1-01",
      "user-admin-01",
      approverL2,
      "一级审批人已禁用，转交管理员兜底处理。",
    );

    expect(outcome.ok).toBe(true);
    expect(findDemoUserById("user-l1-01")?.isActive).toBe(false);
    expect(getTicket("ticket-002")?.assignedApproverId).toBe("user-admin-01");
    expect(listApprovals("ticket-002")[0]?.action).toBe("reassign");
  });

  it("allows qc supervisor fast release and unlocks held scans", () => {
    const ticket = getTicket("ticket-001")!;
    const result = fastReleaseQcTicket(
      ticket.id,
      approverL2,
      "品控主管确认误判，快速放行。",
      ticket.version,
      "qc-fast-001",
    );

    expect(result.ok).toBe(true);
    expect(getTicket(ticket.id)?.status).toBe("completed");
    expect(listApprovals(ticket.id)[0]?.action).toBe("fast_release");
    expect(getSeedData().scans.find((scan) => scan.ticketId === ticket.id)?.holdStatus).toBe("released");
  });
});
