import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader, SeverityPill, ActionPill } from "@/components/ui-bits";
import { RefreshCw, Filter } from "lucide-react";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ action: "", category: "", severity: "" });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    p.set("limit", "200");
    if (filters.action) p.set("action", filters.action);
    if (filters.category) p.set("category", filters.category);
    if (filters.severity) p.set("severity", filters.severity);
    const { data } = await api.get(`/logs?${p.toString()}`);
    setLogs(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const Sel = ({ name, options, testid }) => (
    <select
      data-testid={testid}
      value={filters[name]}
      onChange={(e) => setFilters({ ...filters, [name]: e.target.value })}
      className="bg-sentinel-terminal border border-sentinel-border text-xs font-mono text-white px-2 py-2 focus:border-sentinel-blue outline-none rounded-sm"
    >
      <option value="">ALL {name.toUpperCase()}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="EVENT JOURNAL"
        title="Threat Logs"
        subtitle="Structured JSON events captured by the WAF inspection pipeline."
        testid="logs-header"
        right={
          <button onClick={load} data-testid="logs-refresh-button"
            className="inline-flex items-center gap-2 border border-sentinel-border hover:border-sentinel-blue text-xs font-mono uppercase tracking-wider px-3 py-2 rounded-sm transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> refresh
          </button>
        }
      />

      <div className="sentinel-card mb-4">
        <div className="flex flex-wrap gap-2 p-4 border-b border-sentinel-border items-center" data-testid="logs-filters">
          <Filter className="w-3.5 h-3.5 text-sentinel-muted" />
          <Sel name="action" options={["allowed", "blocked"]} testid="filter-action" />
          <Sel name="severity" options={["critical", "high", "medium", "low", "none"]} testid="filter-severity" />
          <Sel name="category" options={["SQL Injection", "Cross-Site Scripting", "Directory Traversal", "Command Injection", "Rate Limit", "Behavioral Anomaly", "Malicious Upload", "Benign"]} testid="filter-category" />
          <div className="ml-auto text-xs font-mono text-sentinel-muted">{logs.length} events</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead className="text-sentinel-muted uppercase tracking-wider bg-sentinel-terminal/60">
              <tr>
                <th className="text-left px-4 py-3">Timestamp</th>
                <th className="text-left">IP</th>
                <th className="text-left">Method</th>
                <th className="text-left">Path</th>
                <th className="text-left">Category</th>
                <th className="text-left">Rule</th>
                <th className="text-left">Severity</th>
                <th className="text-left">Score</th>
                <th className="text-left">Action</th>
              </tr>
            </thead>
            <tbody data-testid="logs-tbody">
              {logs.map((l) => (
                <tr key={`${l.timestamp}-${l.ip}-${l.rule_id || "x"}`} className={`border-t border-sentinel-border hover:bg-white/5 ${l.action === "blocked" ? "border-l-2 border-l-sentinel-red" : ""}`}>
                  <td className="px-4 py-2 text-sentinel-secondary whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="text-white">{l.ip}</td>
                  <td className="text-sentinel-secondary">{l.method}</td>
                  <td className="text-sentinel-secondary max-w-[280px] truncate" title={l.path + (l.query ? "?" + l.query : "")}>{l.path}{l.query ? `?${l.query}` : ""}</td>
                  <td className="text-white">{l.category}</td>
                  <td className="text-sentinel-secondary">{l.rule_id || "—"}</td>
                  <td><SeverityPill severity={l.severity} /></td>
                  <td className="text-sentinel-amber">{l.score}</td>
                  <td><ActionPill action={l.action} /></td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={9} className="text-center text-sentinel-muted py-10">No events match the current filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
