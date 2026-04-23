"use client";
import { useEffect, useState } from "react";
import { FileAudio, Ticket, CheckCircle2, AlignLeft, Mic, ArrowRight, ChevronRight } from "lucide-react";
import { getStats, getRecordings, Stats, Recording } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface DashboardModuleProps {
  onNavigate?: (tab: string) => void;
  onSelectRecording?: (id: number) => void;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function DashboardModule({ onNavigate, onSelectRecording }: DashboardModuleProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recording[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getRecordings().then((r) => setRecent(r.slice(0, 5))).catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  const statCards = [
    {
      label: "Grabaciones",
      value: stats?.total_recordings ?? "—",
      sub: "total",
      icon: FileAudio,
      color: "violet",
      iconCls: "text-violet-500",
      iconBg: "bg-violet-500/10",
      valueCls: "text-violet-600 dark:text-violet-300",
      bar: "bg-gradient-to-r from-violet-500 to-violet-400",
    },
    {
      label: "Tickets abiertos",
      value: stats?.open_tickets ?? "—",
      sub: "sin resolver",
      icon: Ticket,
      color: "amber",
      iconCls: "text-amber-500",
      iconBg: "bg-amber-500/10",
      valueCls: "text-amber-600 dark:text-amber-300",
      bar: "bg-gradient-to-r from-amber-500 to-amber-400",
    },
    {
      label: "Resueltos",
      value: stats?.closed_tickets ?? "—",
      sub: "completados",
      icon: CheckCircle2,
      color: "emerald",
      iconCls: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      valueCls: "text-emerald-600 dark:text-emerald-300",
      bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    },
    {
      label: "Transcritas",
      value: stats?.transcribed ?? "—",
      sub: "con texto",
      icon: AlignLeft,
      color: "indigo",
      iconCls: "text-indigo-500",
      iconBg: "bg-indigo-500/10",
      valueCls: "text-indigo-600 dark:text-indigo-300",
      bar: "bg-gradient-to-r from-indigo-500 to-indigo-400",
    },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--text-m)" }}>{greeting()}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>
            {firstName ? `Hola, ${firstName} 👋` : "Dashboard"}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-m)" }}>Aquí tienes el resumen de tu actividad</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border overflow-hidden relative group"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.bar}`} />
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconBg}`}>
                  <s.icon className={`w-5 h-5 ${s.iconCls}`} />
                </div>
              </div>
              <div>
                <div className={`text-3xl font-bold leading-none tracking-tight ${s.valueCls}`}>{String(s.value)}</div>
                <div className="text-sm font-medium mt-2" style={{ color: "var(--text-b)" }}>{s.label}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom row: Recientes + Acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* Grabaciones recientes */}
        <div
          className="lg:col-span-3 rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Mic className="w-3.5 h-3.5 text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Grabaciones recientes</h2>
            </div>
            <button
              onClick={() => onNavigate?.("transcriptions")}
              className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors hover:bg-[var(--hover-bg)]"
              style={{ color: "var(--text-m)" }}
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/8 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "var(--text-b)" }}>Sin grabaciones aún</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>Empieza grabando tu primera reunión</p>
                </div>
              </div>
            ) : (
              recent.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => { onSelectRecording?.(r.id); onNavigate?.("transcriptions"); }}
                  className="group flex items-center gap-3.5 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[var(--hover-bg)]"
                  style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
                >
                  <div className="w-9 h-9 rounded-xl bg-violet-500/8 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                    <Mic className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>{r.filename}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>
                      {new Date(r.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold shrink-0 ${
                    r.transcribed
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {r.transcribed ? "Analizado" : "Pendiente"}
                  </span>
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: "var(--text-m)" }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: "var(--text-m)" }}>Acciones rápidas</p>

          <button
            onClick={() => onNavigate?.("audio")}
            className="group relative flex items-center gap-4 rounded-2xl px-5 py-5 text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)", boxShadow: "0 4px 24px rgba(124,58,237,0.35)" }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }} />
            <div className="relative w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">Nueva grabación</p>
              <p className="text-xs mt-0.5 text-white/65">Graba una reunión ahora</p>
            </div>
            <ArrowRight className="relative w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.("tickets")}
            className="group relative flex items-center gap-4 rounded-2xl px-5 py-5 text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", border: "1px solid", boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-h)" }}>Tickets pendientes</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>
                {stats ? (stats.open_tickets > 0 ? `${stats.open_tickets} sin resolver` : "Todo al día ✓") : "Cargando…"}
              </p>
            </div>
            {(stats?.open_tickets ?? 0) > 0 && (
              <span className="text-xs font-bold w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                {stats!.open_tickets}
              </span>
            )}
            <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" style={{ color: "var(--text-m)" }} />
          </button>

          <button
            onClick={() => onNavigate?.("transcriptions")}
            className="group relative flex items-center gap-4 rounded-2xl px-5 py-5 text-left overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", border: "1px solid", boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <AlignLeft className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight" style={{ color: "var(--text-h)" }}>Transcripciones</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>
                {stats ? `${stats.transcribed} grabaciones con texto` : "Cargando…"}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" style={{ color: "var(--text-m)" }} />
          </button>
        </div>

      </div>
    </div>
  );
}
