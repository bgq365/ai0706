import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getStore } from "@/lib/data-store";

export default async function HomePage() {
  const store = await getStore();
  const { tickets, scans, syncLogs, v2Status, assumptions } = await store.getSeedData();
  const pendingCount = tickets.filter((ticket) =>
    ["pending", "level1_reviewing", "level2_reviewing"].includes(ticket.status),
  ).length;
  const heldCount = scans.filter((scan) => scan.holdStatus === "held").length;

  return (
    <main className="grid">
      <section className="stats">
        <div className="stat">
          <span className="meta">异常工单总数</span>
          <strong>{tickets.length}</strong>
        </div>
        <div className="stat">
          <span className="meta">待处理工单</span>
          <strong>{pendingCount}</strong>
        </div>
        <div className="stat">
          <span className="meta">品控暂扣批次</span>
          <strong>{heldCount}</strong>
        </div>
        <div className="stat">
          <span className="meta">V2 24h 成功率</span>
          <strong>{v2Status.successRate24h}%</strong>
        </div>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <h2 className="section-title">实施状态</h2>
          <div className="badge-row">
            <span className="chip">Next.js App Router</span>
            <span className="chip">独立 RBAC</span>
            <span className="chip">V2 API 客户端</span>
            <span className="chip">Supabase SQL 草案</span>
          </div>
          <div className="list" style={{ marginTop: 20 }}>
            <div className="item">
              <strong>已落地</strong>
              <p className="muted">工单列表/详情、扫描录入、登录入口、同步监控、规则假设页、内部 API 骨架。</p>
            </div>
            <div className="item">
              <strong>待接真实环境</strong>
              <p className="muted">
                V2 Base URL / token、Supabase 实例、Vercel 环境变量与正式登录账号体系。
              </p>
            </div>
            <div className="item">
              <strong>当前策略</strong>
              <p className="muted">关键动作保留实时校验接点；未接 V2 时使用本地快照回退，不伪装成真实线上对接。</p>
            </div>
          </div>
        </article>

        <article className="card">
          <h2 className="section-title">交付提醒</h2>
          <div className="callout warn">
            题目明确要求 V3 必须独立部署到 Vercel，并且通过 HTTP API 与 V2 交互，不能直接连 V2 数据库。
          </div>
          <div className="list" style={{ marginTop: 20 }}>
            <div className="item">
              <strong>下一步需要你协助</strong>
              <p className="muted">登录 V2 测试环境，确认真实接口、鉴权方式、运单查询与 SKU 校验路径。</p>
            </div>
            <div className="item">
              <strong>环境变量准备</strong>
              <p className="muted">
                在 <code className="mono">.env.local</code> 中配置 JWT、V2 token、Supabase key。
              </p>
            </div>
            <div className="item">
              <strong>上线检查</strong>
              <p className="muted">Vercel 需要能访问 V2 公网域名，否则只能先做本地联调。</p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid grid-2">
        <article className="card">
          <div className="split" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">最新工单</h2>
            <Link className="button-secondary" href="/tickets">
              查看全部
            </Link>
          </div>
          <div className="table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>工单号</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>金额</th>
                  <th>来源</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 5).map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <Link href={`/tickets/${ticket.id}`}>{ticket.ticketNo}</Link>
                    </td>
                    <td>{ticket.subtype}</td>
                    <td>
                      <span className={`status ${ticket.status}`}>{ticket.status}</span>
                    </td>
                    <td>{formatCurrency(ticket.amount)}</td>
                    <td>{ticket.dataSource === "v2-live" ? "实时 V2" : `快照 ${formatDateTime(ticket.snapshotSyncedAt)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <div className="split" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">最近 V2 调用日志</h2>
            <Link className="button-secondary" href="/monitoring">
              查看监控
            </Link>
          </div>
          <div className="list" style={{ marginTop: 16 }}>
            {syncLogs.slice(0, 3).map((log) => (
              <div className="item" key={log.id}>
                <div className="split" style={{ justifyContent: "space-between" }}>
                  <strong>{log.endpoint}</strong>
                  <span className={`status ${log.success ? "completed" : "rejected"}`}>
                    {log.success ? `${log.statusCode} OK` : `${log.statusCode} FAIL`}
                  </span>
                </div>
                <div className="muted">{log.requestSummary}</div>
                <div className="meta" style={{ marginTop: 8 }}>
                  {log.requestId} · {formatDateTime(log.createdAt)} · {log.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card">
        <div className="split" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h2 className="section-title">留白规则默认假设</h2>
          <Link className="button-secondary" href="/config">
            进入规则页
          </Link>
        </div>
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          {assumptions.map((assumption) => (
            <div className="item" key={assumption.key}>
              <strong>{assumption.key}</strong>
              <p style={{ margin: "8px 0 4px 0" }}>{assumption.value}</p>
              <span className="muted">{assumption.rationale}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
