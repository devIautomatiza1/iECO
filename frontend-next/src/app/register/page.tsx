"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import { register as apiRegister, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password || !name.trim()) {
      setError("Email, nombre y contraseña son obligatorios");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      const res = await apiRegister(email.trim(), password, name.trim(), company.trim());
      setToken(res.token);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  const focusTeal = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#0abde3";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,189,227,0.12)";
  };
  const blurReset = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "var(--border-med)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden"
      style={{ background: "var(--app-bg)" }}
    >
      {/* Decorative blobs animados */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl pointer-events-none animate-pulse"
        style={{ background: "radial-gradient(circle, #0abde3, transparent)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl pointer-events-none animate-pulse"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)", animationDelay: "1s" }}
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
            Únete a <span style={{ color: "#0abde3" }}>iECO</span>
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-m)" }}>
            Crea tu cuenta y empieza a analizar reuniones
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
              Crear cuenta
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--text-m)" }}>
              Los campos con * son obligatorios
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
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Nombre completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                className="w-full px-4 py-3 text-sm rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
                onFocus={focusTeal}
                onBlur={blurReset}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Correo electrónico *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                autoComplete="email"
                className="w-full px-4 py-3 text-sm rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
                onFocus={focusTeal}
                onBlur={blurReset}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Empresa
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de tu empresa"
                autoComplete="organization"
                className="w-full px-4 py-3 text-sm rounded-xl border focus:outline-none transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
                onFocus={focusTeal}
                onBlur={blurReset}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="w-full px-4 py-3 pr-11 text-sm rounded-xl border focus:outline-none transition-all"
                  style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
                  onFocus={focusTeal}
                  onBlur={blurReset}
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
                <>Crear cuenta <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <div className="pt-1 text-center">
            <p className="text-xs" style={{ color: "var(--text-m)" }}>
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold transition-all duration-200 hover:underline hover:brightness-125"
                style={{ color: "#0abde3" }}
              >
                Inicia sesión
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
    </div>
  );
}
