import { formatDateTime } from "@/lib/format";
import { getStore } from "@/lib/data-store";

export default async function OperationsPage() {
  const store = await getStore();
  const [{ tickets }, users] = await Promise.all([store.getSeedData(), store.listDemoUsers()]);
  const operationalTickets = tickets.filter((ticket) =>
    ["level1_reviewing", "level2_reviewing"].includes(ticket.status),
  );

  return (
    <main className="grid grid-2">
      <section className="card">
        <h2 className="section-title">审批运维面板</h2>
        <p className="muted">
          这一区域对应高分项里的“审批超时自动流转”和“审批人禁用兜底转交”。当前以原型方式展示逻辑和状态，后续可接定时任务与正式后台入口。
        </p>
        <div className="list" style={{ marginTop: 16 }}>
          {operationalTickets.map((ticket) => (
            <div className="item" key={ticket.id}>
              <div className="split" style={{ justifyContent: "space-between" }}>
                <strong>{ticket.ticketNo}</strong>
                <span className={`status ${ticket.status}`}>{ticket.status}</span>
              </div>
              <div className="muted">{ticket.title}</div>
              <div className="meta" style={{ marginTop: 8 }}>
                当前处理人：{ticket.assignedApproverName ?? "未分配"} · 截止时间：
                {ticket.dueAt ? formatDateTime(ticket.dueAt) : "无"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">审批人状态</h2>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.roles.join(" / ")}</td>
                  <td>
                    <span className={`status ${user.isActive === false ? "rejected" : "completed"}`}>
                      {user.isActive === false ? "disabled" : "active"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
