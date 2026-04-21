"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Completa todos los campos"); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* Decorative blobs animados */}
      <div
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl pointer-events-none animate-pulse"
        style={{ background: "radial-gradient(circle, #0abde3, transparent)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl pointer-events-none animate-pulse"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animationDelay: "1s" }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.03] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0abde3, #7c3aed, transparent)" }}
      />

      <div
        className="w-full max-w-[400px] relative z-10"
        style={{ animation: "loginFadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8" style={{ animation: "loginFadeUp 0.5s 0.05s cubic-bezier(0.16,1,0.3,1) both" }}>
          <div
            className="w-20 h-20 mb-5 drop-shadow-xl transition-transform duration-300 hover:scale-110 cursor-default"
            style={{ animation: "logoBounce 0.6s 0.1s cubic-bezier(0.34,1.56,0.64,1) both" }}
          >
            <Image src="/logo.png" alt="iECO" width={80} height={80} className="w-full h-full object-contain" priority />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "var(--text-h)" }}>
            Bienvenido a <span style={{ color: "#0abde3" }}>iECO</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-m)" }}>
            Análisis inteligente de reuniones con IA
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border p-8 space-y-5"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border-color)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.15), 0 4px 20px -4px rgba(0,0,0,0.10)",
            animation: "loginFadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both",
          }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-h)" }}>
              Iniciar sesión
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-m)" }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {error && (
            <div
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500"
              style={{ animation: "loginFadeUp 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5" style={{ animation: "loginFadeUp 0.5s 0.15s cubic-bezier(0.16,1,0.3,1) both" }}>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                className="w-full px-4 py-3 text-sm rounded-xl border focus:outline-none transition-all duration-200 hover:border-[#0abde360]"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-med)",
                  color: "var(--text-b)",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#0abde3"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,189,227,0.12)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-med)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div className="space-y-1.5" style={{ animation: "loginFadeUp 0.5s 0.2s cubic-bezier(0.16,1,0.3,1) both" }}>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border focus:outline-none transition-all duration-200 hover:border-[#0abde360]"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-med)",
                    color: "var(--text-b)",
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#0abde3"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,189,227,0.12)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-med)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-200 hover:scale-110 hover:opacity-100 opacity-60 rounded-lg p-0.5"
                  style={{ color: "var(--text-m)" }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div style={{ animation: "loginFadeUp 0.5s 0.25s cubic-bezier(0.16,1,0.3,1) both" }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-1 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                style={{
                  background: loading ? "#0abde3cc" : "linear-gradient(135deg, #0abde3 0%, #0097b2 100%)",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(10,189,227,0.4)",
                }}
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>Entrar <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" /></>
                )}
              </button>
            </div>
          </form>

          <div className="pt-1 text-center" style={{ animation: "loginFadeUp 0.5s 0.3s cubic-bezier(0.16,1,0.3,1) both" }}>
            <p className="text-xs" style={{ color: "var(--text-m)" }}>
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-semibold transition-all duration-200 hover:underline hover:brightness-125"
                style={{ color: "#0abde3" }}
              >
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: "var(--text-m)", animation: "loginFadeUp 0.5s 0.35s cubic-bezier(0.16,1,0.3,1) both" }}
        >
          © {new Date().getFullYear()} iECO · Todos los derechos reservados
        </p>
      </div>

      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logoBounce {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
