import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SeverityPill } from "@/components/ui-bits";
import { Zap, Bomb, Skull, Bug, Activity, Terminal } from "lucide-react";

const ATTACKS = [
  { id: "sqli",      label: "SQL Injection (OR 1=1)",       icon: Skull,    color: "red"  },
  { id: "union",     label: "SQL UNION SELECT",             icon: Skull,    color: "red"  },
  { id: "xss",       label: "XSS — <script>alert()</script>", icon: Bug,    color: "amber" },
  { id: "traversal", label: "Directory Traversal — /etc/passwd", icon: Bomb, color: "red" },
  { id: "command",   label: "Command Injection — ;cat",     icon: Terminal, color: "amber" },
  { id: "benign",    label: "Benign GET /about",            icon: Activity, color: "blue" },
];

export default function Simulator() {
  const [output, setOutput] = useState([
    { type: "info", line: "[SentinelShield SimAgent v1.0] ready." },
    { type: "info", line: "Click any payload below to fire it against the WAF." },
  ]);
  const [busy, setBusy] = useState("");

  const append = (entries) => setOutput((o) => [...o, ...entries]);

  const fire = async (type) => {
    setBusy(type);
    append([{ type: "cmd", line: `$ simulate --type=${type}` }]);
    try {
      const { data } = await api.post("/simulate", { type });
      const r = data.result;
      const status = r.blocked ? "BLOCKED" : "ALLOWED";
      const cls = r.blocked ? "err" : "ok";
      append([
        { type: cls, line: `→ ${status} | category=${r.matches?.[0]?.category || "Benign"} | score=${r.score} | severity=${r.severity}` },
        { type: "info", line: `   payload: ${data.payload.method} ${data.payload.path}?${data.payload.query}` },
        ...(r.matches?.length
          ? [{ type: "info", line: `   matched rules: ${r.matches.map((m) => m.rule_id).join(", ")}` }]
          : [{ type: "info", line: `   no rule signatures triggered` }]),
        { type: "info", line: `   ip_status=${r.ip_status} ip_score=${r.ip_score}` },
      ]);
    } catch (e) {
      const errData = e.response?.data;
      if (errData?.blocked) {
        append([
          { type: "err", line: `→ BLOCKED | ${errData.matches?.[0]?.category || "Rate Limit"} | severity=${errData.severity}` },
          { type: "info", line: `   ${formatApiError(errData.reason) || ""}` },
        ]);
      } else {
        append([{ type: "err", line: `ERR: ${formatApiError(errData?.detail) || e.message}` }]);
      }
    } finally {
      setBusy("");
    }
  };

  const burst = async () => {
    setBusy("burst");
    append([{ type: "cmd", line: "$ simulate --type=burst --requests=15 --window=10s" }]);
    try {
      const { data } = await api.post("/simulate/burst");
      const blocked = data.results.filter((r) => r.blocked).length;
      append([
        { type: blocked > 0 ? "err" : "ok", line: `→ Fired 15 requests from ${data.spoof_ip}. Blocked: ${blocked}` },
        { type: "info", line: `   rate-limiter engaged after request #${data.results.findIndex((r) => r.blocked) + 1 || "—"}` },
      ]);
    } catch (e) {
      append([{ type: "err", line: `ERR: ${e.message}` }]);
    } finally {
      setBusy("");
    }
  };

  const clear = () => setOutput([{ type: "info", line: "[SentinelShield SimAgent v1.0] cleared." }]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="OFFENSIVE TESTING"
        title="Live Attack Simulator"
        subtitle="Fire crafted payloads against the running WAF to validate detection rules."
        testid="simulator-header"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Attack buttons */}
        <div className="lg:col-span-4 space-y-3" data-testid="simulator-attacks">
          <div className="overline mb-1">// PAYLOAD CATALOG</div>
          {ATTACKS.map((a) => {
            const tone = {
              red:   "border-sentinel-red/40   text-sentinel-red   hover:bg-sentinel-red/10",
              amber: "border-sentinel-amber/40 text-sentinel-amber hover:bg-sentinel-amber/10",
              blue:  "border-sentinel-blue/40  text-sentinel-blue  hover:bg-sentinel-blue/10",
            }[a.color];
            const Icon = a.icon;
            return (
              <button
                key={a.id} onClick={() => fire(a.id)} disabled={busy === a.id}
                data-testid={`sim-${a.id}-btn`}
                className={`w-full flex items-center justify-between gap-3 border bg-sentinel-terminal px-4 py-3 rounded-sm transition-colors ${tone} disabled:opacity-50`}
              >
                <span className="flex items-center gap-3 font-mono text-xs"><Icon className="w-4 h-4" />{a.label}</span>
                <span className="text-[10px] uppercase tracking-wider">{busy === a.id ? "FIRING…" : "FIRE"}</span>
              </button>
            );
          })}

          <button
            onClick={burst} disabled={busy === "burst"}
            data-testid="sim-burst-btn"
            className="w-full flex items-center justify-between gap-3 border border-sentinel-purple/40 text-sentinel-purple bg-sentinel-terminal px-4 py-3 rounded-sm hover:bg-sentinel-purple/10 transition-colors disabled:opacity-50"
          >
            <span className="flex items-center gap-3 font-mono text-xs"><Zap className="w-4 h-4" /> Rate-Limit Burst (15 req)</span>
            <span className="text-[10px] uppercase tracking-wider">{busy === "burst" ? "FIRING…" : "FIRE"}</span>
          </button>
        </div>

        {/* Terminal */}
        <div className="lg:col-span-8 sentinel-terminal rounded-sm flex flex-col" data-testid="simulator-terminal">
          <div className="flex items-center justify-between px-4 py-2 border-b border-sentinel-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sentinel-red" />
              <span className="w-2.5 h-2.5 rounded-full bg-sentinel-amber" />
              <span className="w-2.5 h-2.5 rounded-full bg-sentinel-blue" />
              <span className="ml-2 text-[11px] text-sentinel-muted font-mono">simagent@sentinelshield: ~</span>
            </div>
            <button onClick={clear} data-testid="sim-clear-btn" className="text-[10px] font-mono uppercase tracking-wider text-sentinel-muted hover:text-white">clear</button>
          </div>
          <div className="p-4 text-xs leading-6 h-[480px] overflow-y-auto">
            {output.map((o, i) => {
              const cls = {
                cmd:  "text-sentinel-blue",
                ok:   "text-sentinel-blue",
                err:  "text-sentinel-red",
                info: "text-sentinel-secondary",
              }[o.type];
              return <div key={`${i}-${o.line.slice(0, 32)}`} className={`${cls} font-mono whitespace-pre-wrap`}>{o.line}</div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
