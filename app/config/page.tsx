import { getStore } from "@/lib/data-store";

export default async function ConfigPage() {
  const store = await getStore();
  const assumptions = await store.getConfigAssumptions();

  return (
    <main className="card">
      <h2 className="section-title">留白规则与默认假设</h2>
      <p className="muted">
        这里先把题目要求必须识别并补全的留白点显式写出来。真实接入后台后，这些内容应落表并可配置，而不是藏在代码里。
      </p>
      <div className="grid grid-2" style={{ marginTop: 20 }}>
        {assumptions.map((assumption) => (
          <div className="item" key={assumption.key}>
            <strong>{assumption.key}</strong>
            <p>{assumption.value}</p>
            <span className="muted">{assumption.rationale}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
