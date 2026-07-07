import { notFound } from "next/navigation";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getStore } from "@/lib/data-store";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: TicketDetailPageProps) {
  const store = await getStore();
  const { id } = await params;
  const ticket = await store.getTicket(id);
  if (!ticket) {
    notFound();
  }

  const approvals = await store.listApprovals(ticket.id);
  const waybill = await store.findWaybill(ticket.waybillNo);

  return (
    <main className="grid grid-2">
      <section className="card">
        <h2 className="section-title">{ticket.title}</h2>
        <div className="badge-row">
          <span className={`status ${ticket.status}`}>{ticket.status}</span>
          <span className="chip">{ticket.category === "quality_control" ? "品控异常" : "物流异常"}</span>
          <span className="chip">{ticket.subtype}</span>
        </div>
        <div className="grid grid-2" style={{ marginTop: 20 }}>
          <div className="item">
            <strong>工单号</strong>
            <div className="mono">{ticket.ticketNo}</div>
          </div>
          <div className="item">
            <strong>运单号</strong>
            <div className="mono">{ticket.waybillNo}</div>
          </div>
          <div className="item">
            <strong>金额</strong>
            <div>{formatCurrency(ticket.amount)}</div>
          </div>
          <div className="item">
            <strong>上报人</strong>
            <div>{ticket.reporterName}</div>
          </div>
          <div className="item">
            <strong>当前处理人</strong>
            <div>{ticket.assignedApproverName ?? "未分配"}</div>
          </div>
          <div className="item">
            <strong>审批截止时间</strong>
            <div>{ticket.dueAt ? formatDateTime(ticket.dueAt) : "无"}</div>
          </div>
        </div>
        <div className="callout info" style={{ marginTop: 20 }}>
          当前运单信息来源：
          {ticket.dataSource === "v2-live"
            ? " 实时获取自 V2。"
            : ` 使用本地快照，最近同步于 ${formatDateTime(ticket.snapshotSyncedAt)}。`}
        </div>
        <p style={{ marginTop: 20 }}>{ticket.summary}</p>
      </section>

      <section className="card">
        <h2 className="section-title">关联运单快照</h2>
        {waybill ? (
          <div className="list">
            <div className="item">
              <strong>客户</strong>
              <div>{waybill.customerName}</div>
            </div>
            <div className="item">
              <strong>收件人</strong>
              <div>
                {waybill.receiverName} · {waybill.receiverPhone}
              </div>
            </div>
            <div className="item">
              <strong>V2 状态</strong>
              <div>{waybill.status}</div>
            </div>
            <div className="item">
              <strong>最近同步</strong>
              <div>{formatDateTime(waybill.syncedAt)}</div>
            </div>
          </div>
        ) : (
          <div className="callout warn">当前没有可用的本地快照，真实接入后应显示 V2 实时详情或降级提示。</div>
        )}
      </section>

      <section className="card" style={{ gridColumn: "1 / -1" }}>
        <h2 className="section-title">审批轨迹</h2>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>层级</th>
                <th>动作</th>
                <th>审批人</th>
                <th>意见</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((approval) => (
                <tr key={approval.id}>
                  <td>L{approval.level}</td>
                  <td>{approval.action}</td>
                  <td>{approval.actorName}</td>
                  <td>{approval.comment}</td>
                  <td>{formatDateTime(approval.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
