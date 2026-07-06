import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { listTickets } from "@/lib/mock-store";

export default function TicketsPage() {
  const tickets = listTickets();

  return (
    <main className="card">
      <div className="split" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 className="section-title">异常工单列表</h2>
          <p className="muted">当前是 offset 分页前的列表骨架，后续接真实数据库时可直接升级为条件筛选与分页接口。</p>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>工单号</th>
              <th>运单号</th>
              <th>分类</th>
              <th>状态</th>
              <th>金额</th>
              <th>上报人</th>
              <th>更新时间</th>
              <th>数据来源</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr key={ticket.id}>
                <td>
                  <Link href={`/tickets/${ticket.id}`}>{ticket.ticketNo}</Link>
                </td>
                <td className="mono">{ticket.waybillNo}</td>
                <td>
                  {ticket.category === "quality_control" ? "品控异常" : "物流异常"}
                  <div className="muted">{ticket.subtype}</div>
                </td>
                <td>
                  <span className={`status ${ticket.status}`}>{ticket.status}</span>
                </td>
                <td>{formatCurrency(ticket.amount)}</td>
                <td>{ticket.reporterName}</td>
                <td>{formatDateTime(ticket.updatedAt)}</td>
                <td>{ticket.dataSource === "v2-live" ? "实时 V2" : "本地快照"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
