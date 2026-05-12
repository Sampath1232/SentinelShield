import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui-bits";
import { ShieldOff, ShieldCheck } from "lucide-react";

export default function IpReputation() {
  const [ips, setIps] = useState([]);

  const load = useCallback(async () => {
    const { data } = await api.get("/ip-reputation");
    setIps(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (ip, kind) => {
    await api.post(`/ip-reputation/${kind}`, { ip });
    load();
  };

  const statusTone = {
    ok: "text-sentinel-blue border-sentinel-blue/40",
    temp_banned: "text-sentinel-amber border-sentinel-amber/40",
    blacklisted: "text-sentinel-red border-sentinel-red/40",
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="REPUTATION ENGINE"
        title="IP Threat Intelligence"
        subtitle="Cumulative scoring & ban enforcement per origin IP."
        testid="ip-header"
      />

      <div className="sentinel-card overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead className="text-sentinel-muted uppercase tracking-wider bg-sentinel-terminal/60">
            <tr>
              <th className="text-left px-4 py-3">IP</th>
              <th className="text-left">Status</th>
              <th className="text-left">Score</th>
              <th className="text-left">Hits</th>
              <th className="text-left">Last Category</th>
              <th className="text-left">Last Action</th>
              <th className="text-left">Updated</th>
              <th className="text-right pr-4">Controls</th>
            </tr>
          </thead>
          <tbody data-testid="ip-tbody">
            {ips.map((ip) => (
              <tr key={ip.ip} className="border-t border-sentinel-border hover:bg-white/5">
                <td className="px-4 py-2 text-white">{ip.ip}</td>
                <td><span className={`severity-pill rounded-sm ${statusTone[ip.status] || statusTone.ok}`}>{ip.status}</span></td>
                <td className="text-sentinel-amber">{ip.score}</td>
                <td className="text-sentinel-secondary">{ip.hits}</td>
                <td className="text-sentinel-secondary">{ip.last_category || "—"}</td>
                <td className="text-sentinel-secondary">{ip.last_action || "—"}</td>
                <td className="text-sentinel-muted">{ip.updated_at ? new Date(ip.updated_at).toLocaleString() : "—"}</td>
                <td className="pr-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => act(ip.ip, "unblock")} data-testid={`unblock-${ip.ip}`}
                      className="inline-flex items-center gap-1 border border-sentinel-blue/40 text-sentinel-blue hover:bg-sentinel-blue/10 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />Unblock
                    </button>
                    <button onClick={() => act(ip.ip, "blacklist")} data-testid={`blacklist-${ip.ip}`}
                      className="inline-flex items-center gap-1 border border-sentinel-red/40 text-sentinel-red hover:bg-sentinel-red/10 px-2 py-1 rounded-sm text-[10px] uppercase tracking-wider">
                      <ShieldOff className="w-3 h-3" />Blacklist
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {ips.length === 0 && (
              <tr><td colSpan={8} className="text-center text-sentinel-muted py-10">No IPs tracked yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
