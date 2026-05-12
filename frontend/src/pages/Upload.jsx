import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { API_BASE } from "@/lib/api";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui-bits";
import { UploadCloud, FileCheck2, ShieldAlert } from "lucide-react";

export default function Upload() {
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    const { data } = await api.get("/uploads");
    setHistory(data);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const token = localStorage.getItem("ss_token");
      const res = await axios.post(`${API_BASE}/upload`, fd, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true,
      });
      setResult({ ...res.data, status: res.status });
    } catch (e) {
      setResult({ accepted: false, reason: e.message });
    } finally {
      setBusy(false);
      load();
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6">
      <PageHeader
        overline="DEFENSIVE UPLOAD"
        title="Magic-Number File Validator"
        subtitle="True file-type detection via libmagic. Disguised executables are rejected."
        testid="upload-header"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => fileRef.current?.click()}
            data-testid="upload-dropzone"
            className={`sentinel-card cursor-pointer p-10 text-center border-2 border-dashed transition-colors ${drag ? "border-sentinel-blue bg-sentinel-blue/5" : "border-sentinel-border-active"}`}
          >
            <UploadCloud className="w-8 h-8 mx-auto text-sentinel-blue mb-3" />
            <div className="font-heading text-lg font-bold">Drop a file or click to select</div>
            <div className="text-xs text-sentinel-muted font-mono mt-2">Allowed: PNG · JPG · PDF (max 5MB)</div>
            <input type="file" ref={fileRef} onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" data-testid="upload-input" />
          </div>

          {busy && <div className="text-xs font-mono text-sentinel-blue animate-pulse">$ inspecting bytes…</div>}

          {result && (
            <div className={`sentinel-card p-5 ${result.accepted ? "border-l-2 border-l-sentinel-blue" : "border-l-2 border-l-sentinel-red"}`} data-testid="upload-result">
              <div className="flex items-center gap-2 mb-3">
                {result.accepted
                  ? <FileCheck2 className="w-5 h-5 text-sentinel-blue" />
                  : <ShieldAlert className="w-5 h-5 text-sentinel-red" />}
                <div className="font-heading text-lg font-bold">{result.accepted ? "Accepted" : "Rejected"}</div>
              </div>
              <dl className="text-xs font-mono space-y-1.5">
                <Row k="filename"     v={result.filename} />
                <Row k="declared_mime" v={result.declared_mime} />
                <Row k="detected_mime" v={result.detected_mime} tone={result.accepted ? "blue" : "red"} />
                <Row k="size"         v={`${result.size} B`} />
                {result.reason && <Row k="reason" v={result.reason} tone="red" />}
              </dl>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 sentinel-card" data-testid="upload-history">
          <div className="px-5 py-3 border-b border-sentinel-border">
            <div className="overline">// AUDIT LOG</div>
            <h3 className="font-heading text-xl font-bold mt-1">Upload History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-sentinel-muted uppercase tracking-wider">
                <tr><th className="text-left px-5 py-2">When</th><th className="text-left">Filename</th><th className="text-left">Declared</th><th className="text-left">Detected</th><th className="text-left">Result</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className={`border-t border-sentinel-border hover:bg-white/5 ${h.accepted ? "" : "border-l-2 border-l-sentinel-red"}`}>
                    <td className="px-5 py-2 text-sentinel-secondary">{new Date(h.uploaded_at).toLocaleString()}</td>
                    <td className="text-white truncate max-w-[160px]" title={h.filename}>{h.filename}</td>
                    <td className="text-sentinel-secondary">{h.declared_mime}</td>
                    <td className="text-sentinel-secondary">{h.detected_mime}</td>
                    <td><span className={`severity-pill rounded-sm ${h.accepted ? "text-sentinel-blue border-sentinel-blue/40" : "text-sentinel-red border-sentinel-red/60 bg-sentinel-red/10"}`}>{h.accepted ? "accepted" : "rejected"}</span></td>
                  </tr>
                ))}
                {history.length === 0 && <tr><td colSpan={5} className="text-center text-sentinel-muted py-10">No uploads yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, tone }) {
  const tcls = { red: "text-sentinel-red", blue: "text-sentinel-blue" }[tone] || "text-white";
  return (
    <div className="flex justify-between gap-4 border-b border-sentinel-border/50 py-1">
      <span className="text-sentinel-muted">{k}</span>
      <span className={tcls + " text-right truncate max-w-[260px]"} title={String(v)}>{String(v)}</span>
    </div>
  );
}
