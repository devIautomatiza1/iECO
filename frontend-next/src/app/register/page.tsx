"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
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

  const inputClass =
    "w-full px-3 py-2.5 text-sm rounded-xl border focus:outline-none focus:border-violet-500/60 transition-colors";
  const inputStyle = {
    background: "var(--surface)",
    borderColor: "var(--border-med)",
    color: "var(--text-b)",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--app-bg)" }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
            <Image src="/logo.png" alt="iECO" width={64} height={64} className="w-full h-full object-contain" />
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
            Crear cuenta
          </h2>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Nombre completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Empresa
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nombre de tu empresa"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputClass} pr-10`}
                  style={inputStyle}
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
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="text-center text-xs" style={{ color: "var(--text-m)" }}>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
