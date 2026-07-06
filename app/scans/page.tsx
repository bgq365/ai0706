"use client";

import { useState } from "react";

export default function ScansPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    const response = await fetch("/api/v1/scans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json()) as { data?: { record: { id: string }; ticket?: { ticketNo: string } | null }; error?: { message: string } };

    if (!response.ok) {
      setMessage(payload.error?.message ?? "扫描提交失败");
      setSubmitting(false);
      return;
    }

    const suffix = payload.data?.ticket ? `并自动关联工单 ${payload.data.ticket.ticketNo}` : "，未触发工单";
    setMessage(`扫描记录已创建：${payload.data?.record.id}${suffix}`);
    event.currentTarget.reset();
    setSubmitting(false);
  }

  return (
    <main className="grid grid-2">
      <section className="card">
        <h2 className="section-title">扫描录入</h2>
        <p className="muted">
          题目允许用手工输入模拟扫描枪。当前页面会先做 V2/快照校验，再根据扫描结果决定是否自动创建品控异常工单。
        </p>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="waybillNo">运单号</label>
            <input id="waybillNo" name="waybillNo" placeholder="WB20260706001" required />
          </div>
          <div className="field">
            <label htmlFor="skuCode">SKU</label>
            <input id="skuCode" name="skuCode" placeholder="SKU-GLASS-01" required />
          </div>
          <div className="field">
            <label htmlFor="operatorName">操作人</label>
            <input id="operatorName" name="operatorName" defaultValue="仓内演示员" required />
          </div>
          <div className="field">
            <label htmlFor="result">扫描结果</label>
            <select id="result" name="result" defaultValue="passed">
              <option value="passed">通过</option>
              <option value="abnormal">异常</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="abnormalReason">异常描述</label>
            <textarea
              id="abnormalReason"
              name="abnormalReason"
              placeholder="例如：外观破损 / 数量不符 / 标签错误"
            />
          </div>
          <button className="button" disabled={submitting} type="submit">
            {submitting ? "提交中..." : "提交扫描"}
          </button>
          {message ? <div className="callout info">{message}</div> : null}
        </form>
      </section>

      <section className="card">
        <h2 className="section-title">规则说明</h2>
        <div className="list">
          <div className="item">
            <strong>真实性校验</strong>
            <p className="muted">录入时必须先校验运单存在，再校验 SKU 归属，不能扫描不存在的 SKU。</p>
          </div>
          <div className="item">
            <strong>品控暂扣分离</strong>
            <p className="muted">扫描记录与异常工单是 1:N 关联，暂扣状态与工单状态不合并。</p>
          </div>
          <div className="item">
            <strong>自动建单</strong>
            <p className="muted">扫描异常时自动创建品控工单，并将批次状态置为 held。</p>
          </div>
        </div>
      </section>
    </main>
  );
}
