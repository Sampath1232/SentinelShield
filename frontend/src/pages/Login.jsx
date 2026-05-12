import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { ShieldAlert, Terminal, Lock } from "lucide-react";

export default function Login() {
  const { user, login, error } = useAuth();
  const [email, setEmail] = useState("admin@sentinelshield.io");
  const [password, setPassword] = useState("Sentinel@2026");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(email, password);
    setBusy(false);
    if (ok) navigate("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-sentinel-bg">
      {/* Left: Form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 py-12 relative">
        <div className="absolute top-6 left-8 flex items-center gap-2" data-testid="brand-mark">
          <ShieldAlert className="w-5 h-5 text-sentinel-blue" />
          <span className="font-heading font-black tracking-tight text-lg">SENTINEL<span className="text-sentinel-red">SHIELD</span></span>
        </div>

        <div className="max-w-sm w-full">
          <div className="overline mb-3">// SECURE OPERATIONS CONSOLE</div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tighter leading-none">
            Authenticate<br/><span className="text-sentinel-blue text-glow-blue">to deploy</span>.
          </h1>
          <p className="text-sentinel-secondary text-sm mt-4 mb-8 font-mono">
            $ initialize --mode=defensive --role=admin
          </p>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
            <div>
              <label className="overline block mb-2">Operator Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required data-testid="login-email-input"
                className="w-full bg-sentinel-terminal border border-sentinel-border focus:border-sentinel-blue outline-none text-white font-mono text-sm rounded-sm px-3 py-3 transition-colors"
              />
            </div>
            <div>
              <label className="overline block mb-2">Access Key</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required data-testid="login-password-input"
                className="w-full bg-sentinel-terminal border border-sentinel-border focus:border-sentinel-blue outline-none text-white font-mono text-sm rounded-sm px-3 py-3 transition-colors"
              />
            </div>

            {error && (
              <div className="border border-sentinel-red/40 bg-sentinel-red/10 text-sentinel-red text-xs font-mono px-3 py-2" data-testid="login-error">
                ERR: {error}
              </div>
            )}

            <button
              type="submit" disabled={busy} data-testid="login-submit-button"
              className="w-full bg-sentinel-blue text-black font-bold uppercase tracking-widest text-sm rounded-sm px-6 py-3 hover:bg-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {busy ? "Authenticating..." : "Initialize Session"}
            </button>

            <div className="text-xs text-sentinel-muted font-mono pt-2 border-t border-sentinel-border">
              <Terminal className="inline w-3 h-3 mr-1" />
              demo: admin@sentinelshield.io / Sentinel@2026
            </div>
          </form>
        </div>
      </div>

      {/* Right: Cover */}
      <div className="hidden lg:block relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1762279389006-43963a0cee55?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-sentinel-bg/90" />
        <div className="absolute inset-0 terminal-grid opacity-30" />
        <div className="relative h-full flex flex-col justify-end p-12 gap-3">
          <div className="overline">// LIVE THREATSCAPE</div>
          <h2 className="font-heading text-3xl font-black tracking-tight leading-tight max-w-md">
            Inspect every packet. Block every payload. Trust nothing.
          </h2>
          <div className="font-mono text-xs text-sentinel-secondary mt-4 space-y-1">
            <div><span className="text-sentinel-red">▣</span> 1,294 attacks blocked in last 24h</div>
            <div><span className="text-sentinel-blue">▣</span> 20 active detection rules</div>
            <div><span className="text-sentinel-amber">▣</span> Isolation-Forest anomaly engine: ONLINE</div>
          </div>
        </div>
      </div>
    </div>
  );
}
