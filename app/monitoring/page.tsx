import { formatDateTime } from "@/lib/format";
import { getStore } from "@/lib/data-store";

export default async function MonitoringPage() {
  const store = await getStore();
  const [status, logs] = await Promise.all([store.getV2Status(), store.listSyncLogs()]);

  return (
    <main className="grid">
      <section className="stats">
        <div className="stat">
          <span className="meta">整体状态</span>
          <strong>{status.overall}</strong>
        </div>
        <div className="stat">
          <span className="meta">24h 成功率</span>
          <strong>{status.successRate24h}%</strong>
        </div>
        <div className="stat">
          <span className="meta">最近成功同步</span>
          <strong style={{ fontSize: 18 }}>{formatDateTime(status.lastSuccessfulSyncAt)}</strong>
        </div>
        <div className="stat">
          <span className="meta">降级模式</span>
          <strong>{status.fallbackMode ? "已启用" : "未启用"}</strong>
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">V2 状态说明</h2>
        <div className="list" style={{ marginTop: 16 }}>
          {status.notes.map((note) => (
            <div className="item" key={note}>
              {note}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">同步日志</h2>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>接口</th>
                <th>结果</th>
                <th>耗时</th>
                <th>说明</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="mono">{log.requestId}</td>
                  <td>{log.endpoint}</td>
                  <td>
                    <span className={`status ${log.success ? "completed" : "rejected"}`}>
                      {log.statusCode}
                    </span>
                  </td>
                  <td>{log.durationMs}ms</td>
                  <td>{log.errorMessage ?? log.requestSummary}</td>
                  <td>{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
