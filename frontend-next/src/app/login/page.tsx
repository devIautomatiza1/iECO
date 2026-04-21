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
      {/* Decorative blobs */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #0abde3, transparent)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
      />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo + brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-5 drop-shadow-xl">
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
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.12), 0 4px 20px -4px rgba(0,0,0,0.08)",
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
            <div className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                className="w-full px-4 py-3 text-sm rounded-xl border focus:outline-none transition-all"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border-med)",
                  color: "var(--text-b)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#0abde3")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-med)")}
              />
            </div>

            <div className="space-y-1.5">
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
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border focus:outline-none transition-all"
                  style={{
                    background: "var(--surface)",
                    borderColor: "var(--border-med)",
                    color: "var(--text-b)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#0abde3")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-med)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--text-m)" }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-1 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? "#0abde3cc" : "linear-gradient(135deg, #0abde3 0%, #0097b2 100%)",
                boxShadow: "0 4px 15px rgba(10,189,227,0.35)",
              }}
            >
              {loading ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="pt-1 text-center">
            <p className="text-xs" style={{ color: "var(--text-m)" }}>
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="font-semibold transition-colors"
                style={{ color: "#0abde3" }}
              >
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-m)" }}>
          © {new Date().getFullYear()} iECO · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
