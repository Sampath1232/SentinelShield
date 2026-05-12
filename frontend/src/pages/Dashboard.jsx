import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader, SeverityPill, ActionPill } from "@/components/ui-bits";
import { Activity, ShieldX, ShieldCheck, AlertTriangle, Zap } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import { Link } from "react-router-dom";

const CAT_COLORS = {
  "SQL Injection": "#E95420",
  "Cross-Site Scripting": "#BF5AF2",
  "Directory Traversal": "#FF3B30",
  "Command Injection": "#FF9F0A",
  "Rate Limit": "#00D4FF",
  "Behavioral Anomaly": "#7C5CFF",
  "Malicious Upload": "#FF6B6B",
  "Benign": "#2A2536",
};

function Kpi({ icon: Icon, label, value, accent, testid, sub }) {
  const tone = {
    blue: "text-sentinel-blue border-sentinel-blue/40",
    red: "text-sentinel-red border-sentinel-red/40",
    amber: "text-sentinel-amber border-sentinel-amber/40",
    white: "text-white border-sentinel-border",
  }[accent];
  return (
    <div className="sentinel-card p-5 relative overflow-hidden" data-testid={testid}>
      <div className="absolute inset-0 terminal-grid opacity-30 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="overline">{label}</div>
          <div className="font-mono text-4xl font-medium mt-3 tracking-tighter">{value?.toLocaleString?.() ?? value}</div>
          {sub && <div className="text-xs text-sentinel-muted mt-1 font-mono">{sub}</div>}
        </div>
        <div className={`w-9 h-9 grid place-items-center border ${tone} rounded-sm`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([api.get("/stats"), api.get("/logs?limit=15")]);
    setStats(s.data);
    setLogs(l.data);
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  if (!stats) {
    return <div className="p-8 font-mono text-sentinel-blue animate-pulse">$ loading telemetry...</div>;
  }

  const pieData = (stats.categories || [])
  .filter(c => c.category !== "Benign")
  .map(c => ({
    name: c.category,
    value: c.count
  }));

  const trendData = (stats.trend || [])
    .map(t => ({
      hour: t.hour.slice(-2) + ":00",
      blocked: t.blocked,
      allowed: t.allowed
    }));
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="SOC OVERVIEW"
        title="Threat Operations"
        subtitle="Real-time defensive posture and attack telemetry."
        testid="dashboard-header"
        right={
          <Link to="/simulator" data-testid="header-simulate-link"
            className="hidden sm:inline-flex items-center gap-2 bg-sentinel-blue text-black font-bold uppercase tracking-wider text-xs px-4 py-2 rounded-sm hover:bg-white transition-colors">
            <Zap className="w-3.5 h-3.5" /> Run Simulation
          </Link>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi icon={Activity}    label="Total Requests"  value={stats.total}   accent="white" testid="metric-total" />
        <Kpi icon={ShieldX}     label="Blocked"          value={stats.blocked} accent="red"   testid="metric-blocked" sub={`${stats.total ? Math.round((stats.blocked/stats.total)*100) : 0}% of traffic`} />
        <Kpi icon={ShieldCheck} label="Allowed"          value={stats.allowed} accent="blue"  testid="metric-allowed" />
        <Kpi icon={AlertTriangle} label="Active Threats" value={stats.active_threats} accent="amber" testid="metric-threats" sub={`${stats.critical} critical · ${stats.high} high`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
        {/* Trend (8 cols) */}
        <div className="sentinel-card p-5 lg:col-span-8" data-testid="chart-trend">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline">// REQUEST TRENDS · LAST 24H</div>
              <h3 className="font-heading text-xl font-bold mt-1">Block vs Allow Timeline</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="#2A2536" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="hour" tick={{ fill: "#A29DB0", fontFamily: "JetBrains Mono", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#A29DB0", fontFamily: "JetBrains Mono", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#050408", border: "1px solid #2A2536", fontFamily: "JetBrains Mono", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 11, color: "#A29DB0" }} />
              <Line type="monotone" dataKey="blocked" stroke="#FF3B30" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="allowed" stroke="#00D4FF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie (4 cols) */}
        <div className="sentinel-card p-5 lg:col-span-4" data-testid="chart-categories">
          <div className="overline">// ATTACK CATEGORIES</div>
          <h3 className="font-heading text-xl font-bold mt-1 mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="#0D0A10">
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] || "#7C5CFF"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#050408", border: "1px solid #2A2536", fontFamily: "JetBrains Mono", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {pieData.slice(0, 5).map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-2 text-sentinel-secondary"><span className="w-2 h-2" style={{ background: CAT_COLORS[d.name] || "#7C5CFF" }} />{d.name}</span>
                <span className="text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top IPs + Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="sentinel-card p-5 lg:col-span-5" data-testid="chart-top-ips">
          <div className="overline">// TOP HOSTILE IPs</div>
          <h3 className="font-heading text-xl font-bold mt-1 mb-4">Blocked Origins</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.top_ips || []} layout="vertical" margin={{ left: 50, right: 10 }}>
              <CartesianGrid stroke="#2A2536" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#A29DB0", fontFamily: "JetBrains Mono", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="ip" type="category" tick={{ fill: "#A29DB0", fontFamily: "JetBrains Mono", fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ background: "#050408", border: "1px solid #2A2536", fontFamily: "JetBrains Mono", fontSize: 11 }} />
              <Bar dataKey="count" fill="#FF3B30" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sentinel-card lg:col-span-7" data-testid="recent-activity">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sentinel-border">
            <div>
              <div className="overline">// LIVE FEED</div>
              <h3 className="font-heading text-xl font-bold mt-1">Recent Activity</h3>
            </div>
            <Link to="/logs" className="text-xs font-mono uppercase tracking-wider text-sentinel-blue hover:underline">view all →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-sentinel-muted uppercase tracking-wider">
                <tr><th className="text-left px-5 py-2">Time</th><th className="text-left">IP</th><th className="text-left">Category</th><th className="text-left">Severity</th><th className="text-left">Action</th></tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((l) => (
                  <tr key={`${l.timestamp}-${l.ip}-${l.rule_id || "x"}`} className={`border-t border-sentinel-border hover:bg-white/5 ${l.action === "blocked" ? "border-l-2 border-l-sentinel-red" : ""}`}>
                    <td className="px-5 py-2 text-sentinel-secondary">{new Date(l.timestamp).toLocaleTimeString()}</td>
                    <td className="text-white">{l.ip}</td>
                    <td className="text-sentinel-secondary">{l.category}</td>
                    <td><SeverityPill severity={l.severity} /></td>
                    <td><ActionPill action={l.action} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
