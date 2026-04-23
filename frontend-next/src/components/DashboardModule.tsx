"use client";
import { useEffect, useState } from "react";
import {
  FileAudio, Ticket, CheckCircle2, AlignLeft, Mic,
  ArrowRight, ChevronRight, AlertCircle, Clock, TrendingUp,
} from "lucide-react";
import { getStats, getRecordings, getRecentTickets, Stats, Recording, RecentTicket } from "@/lib/api";
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

const PRIORITY_LABEL: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };
const PRIORITY_CLASS: Record<string, string> = {
  high: "bg-red-500/10 text-red-500",
  medium: "bg-amber-500/10 text-amber-500",
  low: "bg-emerald-500/10 text-emerald-500",
};

export default function DashboardModule({ onNavigate, onSelectRecording }: DashboardModuleProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Recording[]>([]);
  const [tickets, setTickets] = useState<RecentTicket[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getRecordings().then((r) => setRecent(r.slice(0, 4))).catch(() => {});
    getRecentTickets(5).then(setTickets).catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  const statCards = [
    { label: "Grabaciones",      value: stats?.total_recordings ?? "—", icon: FileAudio,    glow: "rgba(124,58,237,0.14)",  gradient: "linear-gradient(135deg,#7c3aed,#8b5cf6)" },
    { label: "Tickets abiertos", value: stats?.open_tickets ?? "—",     icon: Ticket,       glow: "rgba(245,158,11,0.14)",   gradient: "linear-gradient(135deg,#d97706,#f59e0b)" },
    { label: "Resueltos",        value: stats?.closed_tickets ?? "—",   icon: CheckCircle2, glow: "rgba(16,185,129,0.14)",   gradient: "linear-gradient(135deg,#059669,#10b981)" },
    { label: "Transcritas",      value: stats?.transcribed ?? "—",      icon: AlignLeft,    glow: "rgba(99,102,241,0.14)",   gradient: "linear-gradient(135deg,#4f46e5,#6366f1)" },
  ];

  const transcPct = stats && stats.total_recordings > 0
    ? Math.round((stats.transcribed / stats.total_recordings) * 100)
    : 0;
  const resolvedPct = stats && (stats.open_tickets + stats.closed_tickets) > 0
    ? Math.round((stats.closed_tickets / (stats.open_tickets + stats.closed_tickets)) * 100)
    : 0;

  return (
    <div className="space-y-4 max-w-5xl">

      {/* Header */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest mb-0.5" style={{ color: "var(--text-m)" }}>{greeting()}</p>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>
          {firstName ? `Hola, ${firstName}` : "Dashboard"}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>Resumen de tu actividad</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: `0 2px 12px ${s.glow}` }}
          >
            <div className="px-4 py-3.5 flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: s.gradient, boxShadow: `0 2px 8px ${s.glow}` }}
              >
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none" style={{ color: "var(--text-h)", fontVariantNumeric: "tabular-nums" }}>
                  {String(s.value)}
                </div>
                <div className="text-[11px] font-medium mt-1 truncate" style={{ color: "var(--text-m)" }}>{s.label}</div>
              </div>
            </div>
            <div className="h-px w-full" style={{ background: s.gradient, opacity: 0.5 }} />
          </div>
        ))}
      </div>

      {/* Main row: grabaciones + acciones */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Grabaciones recientes */}
        <div
          className="lg:col-span-3 rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                <Mic className="w-3 h-3 text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Grabaciones recientes</h2>
            </div>
            <button
              onClick={() => onNavigate?.("transcriptions")}
              className="text-[11px] font-medium flex items-center gap-0.5 px-2 py-1 rounded-lg transition-colors hover:bg-(--hover-bg)"
              style={{ color: "var(--text-m)" }}
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-9 h-9 rounded-xl bg-violet-500/8 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-xs" style={{ color: "var(--text-m)" }}>Sin grabaciones aún</p>
              </div>
            ) : (
              recent.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => { onSelectRecording?.(r.id); onNavigate?.("transcriptions"); }}
                  className="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-(--hover-bg)"
                  style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
                >
                  <div className="w-7 h-7 rounded-lg bg-violet-500/8 flex items-center justify-center shrink-0 group-hover:bg-violet-500/15 transition-colors">
                    <Mic className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-h)" }}>{r.filename}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-m)" }}>
                      {new Date(r.created_at).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                    r.transcribed ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {r.transcribed ? "Analizado" : "Pendiente"}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: "var(--text-m)" }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="lg:col-span-2 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-0.5" style={{ color: "var(--text-m)" }}>Acciones rápidas</p>

          <button
            onClick={() => onNavigate?.("audio")}
            className="group relative flex items-center gap-3 rounded-xl px-4 py-3.5 text-left overflow-hidden transition-all hover:brightness-110 active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}
          >
            <div className="relative w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="text-xs font-bold text-white leading-tight">Nueva grabación</p>
              <p className="text-[11px] mt-0.5 text-white/60">Graba una reunión ahora</p>
            </div>
            <ArrowRight className="relative w-3.5 h-3.5 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <button
            onClick={() => onNavigate?.("tickets")}
            className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-left border transition-all hover:bg-(--hover-bg) active:scale-[0.99]"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <Ticket className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-h)" }}>Tickets pendientes</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-m)" }}>
                {stats ? (stats.open_tickets > 0 ? `${stats.open_tickets} sin resolver` : "Todo al día") : "—"}
              </p>
            </div>
            {(stats?.open_tickets ?? 0) > 0 && (
              <span className="text-[11px] font-bold w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                {stats!.open_tickets}
              </span>
            )}
            <ArrowRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all shrink-0" style={{ color: "var(--text-m)" }} />
          </button>

          <button
            onClick={() => onNavigate?.("transcriptions")}
            className="group flex items-center gap-3 rounded-xl px-4 py-3.5 text-left border transition-all hover:bg-(--hover-bg) active:scale-[0.99]"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <AlignLeft className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-h)" }}>Transcripciones</p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--text-m)" }}>
                {stats ? `${stats.transcribed} con texto` : "—"}
              </p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all shrink-0" style={{ color: "var(--text-m)" }} />
          </button>
        </div>

      </div>

      {/* Second row: últimos tickets + progreso */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

        {/* Últimos tickets */}
        <div
          className="lg:col-span-3 rounded-xl border overflow-hidden flex flex-col"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-color)" }}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-3 h-3 text-amber-500" />
              </div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Últimos tickets</h2>
            </div>
            <button
              onClick={() => onNavigate?.("tickets")}
              className="text-[11px] font-medium flex items-center gap-0.5 px-2 py-1 rounded-lg transition-colors hover:bg-(--hover-bg)"
              style={{ color: "var(--text-m)" }}
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex-1">
            {tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/8 flex items-center justify-center">
                  <Ticket className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs" style={{ color: "var(--text-m)" }}>Sin tickets aún</p>
              </div>
            ) : (
              tickets.map((t, i) => (
                <div
                  key={t.id}
                  onClick={() => onNavigate?.("tickets")}
                  className="group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-(--hover-bg)"
                  style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-h)" }}>{t.title}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-m)" }}>
                      {t.recording_filename}
                      {t.assignee ? ` · ${t.assignee}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PRIORITY_CLASS[t.priority] ?? "bg-slate-500/10 text-slate-500"}`}>
                      {PRIORITY_LABEL[t.priority] ?? t.priority}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      t.status === "open" ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                    }`}>
                      {t.status === "open" ? "Abierto" : "Cerrado"}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: "var(--text-m)" }} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progreso */}
        <div className="lg:col-span-2 flex flex-col gap-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest px-0.5" style={{ color: "var(--text-m)" }}>Progreso</p>

          {/* Transcripción */}
          <div
            className="rounded-xl border px-4 py-3.5 flex flex-col gap-2.5"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <AlignLeft className="w-3 h-3 text-violet-500" />
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--text-h)" }}>Transcripción</span>
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-h)" }}>{transcPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${transcPct}%`, background: "linear-gradient(90deg,#7c3aed,#6366f1)" }}
              />
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-m)" }}>
              {stats ? `${stats.transcribed} de ${stats.total_recordings} grabaciones` : "—"}
            </p>
          </div>

          {/* Resolución de tickets */}
          <div
            className="rounded-xl border px-4 py-3.5 flex flex-col gap-2.5"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--text-h)" }}>Resolución</span>
              </div>
              <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-h)" }}>{resolvedPct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-color)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${resolvedPct}%`, background: "linear-gradient(90deg,#059669,#10b981)" }}
              />
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-m)" }}>
              {stats ? `${stats.closed_tickets} resueltos · ${stats.open_tickets} abiertos` : "—"}
            </p>
          </div>

          {/* Alta prioridad */}
          {(stats?.high_priority ?? 0) > 0 && (
            <button
              onClick={() => onNavigate?.("tickets")}
              className="group flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-all hover:bg-(--hover-bg) active:scale-[0.99]"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-h)" }}>Alta prioridad</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--text-m)" }}>
                  {stats!.high_priority} ticket{stats!.high_priority !== 1 ? "s" : ""} urgente{stats!.high_priority !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-[11px] font-bold w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                {stats!.high_priority}
              </span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
