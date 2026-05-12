export function PageHeader({ overline, title, subtitle, right, testid }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 pb-4 border-b border-sentinel-border" data-testid={testid}>
      <div>
        {overline && <div className="overline mb-2">// {overline}</div>}
        <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tighter leading-none">{title}</h1>
        {subtitle && <p className="text-sentinel-secondary text-sm mt-2">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SeverityPill({ severity }) {
  const map = {
    critical: "text-sentinel-red border-sentinel-red bg-sentinel-red/10",
    high:     "text-sentinel-red border-sentinel-red/60 bg-sentinel-red/5",
    medium:   "text-sentinel-amber border-sentinel-amber/60 bg-sentinel-amber/10",
    low:      "text-sentinel-blue border-sentinel-blue/40 bg-sentinel-blue/5",
    none:     "text-sentinel-secondary border-sentinel-border bg-transparent",
  };
  const cls = map[severity?.toLowerCase()] || map.none;
  return <span className={`severity-pill rounded-sm ${cls}`}>{severity || "none"}</span>;
}

export function ActionPill({ action }) {
  const ok = action === "allowed";
  return (
    <span className={`severity-pill rounded-sm ${ok ? "text-sentinel-blue border-sentinel-blue/40 bg-sentinel-blue/5" : "text-sentinel-red border-sentinel-red/60 bg-sentinel-red/10"}`}>
      {action}
    </span>
  );
}
