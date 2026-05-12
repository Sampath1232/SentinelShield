import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SeverityPill } from "@/components/ui-bits";

export default function Rules() {
  const [rules, setRules] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    api.get("/rules").then(({ data }) => setRules(data));
  }, []);

  const filtered = rules.filter((r) =>
    `${r.rule_id} ${r.category} ${r.pattern} ${r.description || ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const grouped = filtered.reduce((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="DETECTION ENGINE"
        title="Rule Signatures"
        subtitle={`${rules.length} active rules across SQLi, XSS, Traversal, Command Injection, LFI, RCE.`}
        testid="rules-header"
        right={
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="search rules…"
            data-testid="rules-search-input"
            className="bg-sentinel-terminal border border-sentinel-border focus:border-sentinel-blue outline-none text-xs font-mono text-white rounded-sm px-3 py-2 w-56"
          />
        }
      />

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat} className="sentinel-card" data-testid={`rules-group-${cat.replace(/\s+/g, '-').toLowerCase()}`}>
            <div className="px-5 py-3 border-b border-sentinel-border flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold tracking-tight">{cat}</h3>
              <span className="font-mono text-xs text-sentinel-muted">{list.length} signatures</span>
            </div>
            <div className="divide-y divide-sentinel-border">
              {list.map((r) => (
                <div key={r.rule_id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center hover:bg-white/5 transition-colors">
                  <div className="col-span-2 font-mono text-xs text-sentinel-blue">{r.rule_id}</div>
                  <div className="col-span-5 font-mono text-xs text-sentinel-secondary truncate" title={r.pattern}>{r.pattern}</div>
                  <div className="col-span-3 text-xs text-white">{r.description}</div>
                  <div className="col-span-1"><SeverityPill severity={r.severity} /></div>
                  <div className="col-span-1 text-right font-mono text-xs text-sentinel-amber">+{r.score}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sentinel-muted py-10 font-mono text-sm">No rules match "{q}"</div>
        )}
      </div>
    </div>
  );
}
