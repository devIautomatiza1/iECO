"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Zap, Eye, EyeOff } from "lucide-react";

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
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--app-bg)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-600/30">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>
              iECO
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-m)" }}>
              Análisis de reuniones con IA
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border p-6 space-y-4"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-lift)",
          }}
        >
          <h2 className="text-base font-semibold" style={{ color: "var(--text-h)" }}>
            Iniciar sesión
          </h2>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:border-violet-500/60 transition-colors"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-med)",
                  color: "var(--text-b)",
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 text-sm rounded-xl border focus:outline-none focus:border-violet-500/60 transition-colors"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-med)",
                    color: "var(--text-b)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-m)" }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm shadow-violet-600/30"
          >
            {loading ? "Iniciando sesión..." : "Entrar"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--text-m)" }}>
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
