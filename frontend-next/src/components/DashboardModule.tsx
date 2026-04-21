"use client";
import { TrendingUp, FileAudio, Ticket, CheckCircle2, Clock, Mic, ArrowRight } from "lucide-react";

const STATS = [
  { label: "Grabaciones", value: "24", sub: "+3 esta semana", icon: FileAudio,
    iconCls: "text-violet-500", iconBg: "bg-violet-500/12", accent: "from-violet-500 to-violet-400" },
  { label: "Tickets abiertos", value: "8", sub: "3 alta prioridad", icon: Ticket,
    iconCls: "text-amber-500", iconBg: "bg-amber-500/12", accent: "from-amber-500 to-amber-400" },
  { label: "Resueltos", value: "47", sub: "este mes", icon: CheckCircle2,
    iconCls: "text-emerald-500", iconBg: "bg-emerald-500/12", accent: "from-emerald-500 to-emerald-400" },
  { label: "Horas transcritas", value: "12h", sub: "precisión 96%", icon: TrendingUp,
    iconCls: "text-indigo-500", iconBg: "bg-indigo-500/12", accent: "from-indigo-500 to-indigo-400" },
];

const RECENT = [
  { name: "20260415_132659.m4a", dur: "18:42", tickets: 3, status: "Analizado" },
  { name: "reunion_ventas_20260412.wav", dur: "45:10", tickets: 5, status: "Analizado" },
  { name: "call_cliente_premium.m4a", dur: "12:05", tickets: 2, status: "En proceso" },
];

export default function DashboardModule() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Resumen de tu actividad en iECO</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border overflow-hidden flex flex-col"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
          >
            {/* colored accent strip */}
            <div className={`h-[3px] bg-gradient-to-r ${s.accent}`} />
            <div className="p-4 flex flex-col gap-3 flex-1">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.iconBg}`}>
                <s.icon className={`w-4 h-4 ${s.iconCls}`} />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none" style={{ color: "var(--text-h)" }}>{s.value}</div>
                <div className="text-xs font-medium mt-1.5" style={{ color: "var(--text-b)" }}>{s.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: "var(--text-m)" }}>{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Grabaciones recientes */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Grabaciones recientes</h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--surface)", color: "var(--text-m)" }}>{RECENT.length} archivos</span>
        </div>
        <div>
          {RECENT.map((r, i) => (
            <div
              key={r.name}
              className="group flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[var(--hover-bg)]"
              style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
            >
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-violet-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>{r.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>{r.dur} · {r.tickets} tickets</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                r.status === "Analizado"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="group flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all border bg-violet-600/8 hover:bg-violet-600/14 border-violet-500/20 hover:border-violet-500/40"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5 text-violet-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-600 dark:text-violet-300">Nueva grabación</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>Graba una reunión ahora</p>
          </div>
          <ArrowRight className="w-4 h-4 text-violet-500/50 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
        <button
          className="group flex items-center gap-4 rounded-xl px-5 py-4 text-left transition-all border bg-indigo-600/8 hover:bg-indigo-600/14 border-indigo-500/20 hover:border-indigo-500/40"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-600/15 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-300">Tickets pendientes</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>8 abiertos, 3 urgentes</p>
          </div>
          <ArrowRight className="w-4 h-4 text-indigo-500/50 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
}
