import type { Metadata } from "next";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "V3 运单异常审批系统",
  description: "独立部署的 V3 异常运单审批与品控协同原型。",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html lang="zh-CN">
      <body>
        <div className="shell">
          <header className="hero" style={{ marginBottom: 24 }}>
            <div className="split" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="meta">AI0706 · V3 异常运单审批系统</div>
                <h1 style={{ marginTop: 8 }}>独立部署、独立数据库、通过 V2 API 做真实性校验</h1>
                <p style={{ maxWidth: 860 }}>
                  当前版本先提供可运行的原型骨架：独立账号/RBAC、工单状态机、品控扫描、V2
                  数据来源标注、同步日志与监控页都已就位。后续只需补真实 V2 / Supabase / Vercel
                  配置即可联调。
                </p>
              </div>
              <div className="card" style={{ minWidth: 280, padding: 18 }}>
                <div className="meta">当前会话</div>
                {user ? (
                  <div className="stack">
                    <strong>{user.name}</strong>
                    <span className="muted">{user.email}</span>
                    <span className="muted">仓库：{user.warehouseId}</span>
                    <span className="muted">角色：{user.roles.join(" / ")}</span>
                  </div>
                ) : (
                  <div className="stack">
                    <strong>未登录</strong>
                    <span className="muted">使用演示账号登录后可走审批与扫描流程。</span>
                  </div>
                )}
              </div>
            </div>
            <nav className="nav">
              <Link href="/">总览</Link>
              <Link href="/login">登录</Link>
              <Link href="/tickets">异常工单</Link>
              <Link href="/scans">扫描录入</Link>
              <Link href="/monitoring">V2 监控</Link>
              <Link href="/config">规则假设</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
