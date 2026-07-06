"use client";

import { useState } from "react";

const DEMO_USERS = [
  { email: "reporter@v3.demo", role: "上报人" },
  { email: "l1@v3.demo", role: "一级审批人" },
  { email: "l2@v3.demo", role: "二级审批人 / 品控主管" },
  { email: "admin@v3.demo", role: "管理员" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("admin@v3.demo");
  const [password, setPassword] = useState("demo123456");
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = (await response.json()) as { data?: { user: { name: string } }; error?: { message: string } };

    if (!response.ok) {
      setMessage(payload.error?.message ?? "登录失败");
      setSubmitting(false);
      return;
    }

    setMessage(`登录成功，当前用户：${payload.data?.user.name ?? email}。现在可以返回工单页继续操作。`);
    setSubmitting(false);
  }

  return (
    <main className="grid grid-2">
      <section className="card">
        <h2 className="section-title">演示登录</h2>
        <p className="muted">
          当前版本采用独立账号/RBAC。等你提供真实账号体系后，这里可以切换为 Supabase Auth 或企业内部登录映射。
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">邮箱</label>
            <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="split">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? "登录中..." : "登录"}
            </button>
          </div>
          {message ? <div className="callout info">{message}</div> : null}
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">可用演示账号</h2>
        <div className="list">
          {DEMO_USERS.map((user) => (
            <div className="item" key={user.email}>
              <strong>{user.email}</strong>
              <div className="muted">{user.role}</div>
              <div className="meta" style={{ marginTop: 8 }}>
                默认密码：<code className="mono">demo123456</code>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
