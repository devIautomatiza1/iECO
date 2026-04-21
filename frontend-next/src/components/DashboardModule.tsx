"use client";
import { TrendingUp, FileAudio, Ticket, CheckCircle2, Clock, Mic } from "lucide-react";

const STATS = [
  { label: "Grabaciones", value: "24", sub: "+3 esta semana", icon: FileAudio, color: "text-violet-400 bg-violet-500/10" },
  { label: "Tickets abiertos", value: "8", sub: "3 alta prioridad", icon: Ticket, color: "text-amber-400 bg-amber-500/10" },
  { label: "Resueltos", value: "47", sub: "este mes", icon: CheckCircle2, color: "text-green-400 bg-green-500/10" },
  { label: "Horas transcritas", value: "12h", sub: "precisión 96%", icon: TrendingUp, color: "text-indigo-400 bg-indigo-500/10" },
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
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Resumen de tu actividad en iECO</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4 flex flex-col gap-3"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>{s.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>{s.label}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-m)" }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Grabaciones recientes */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border-color)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Grabaciones recientes</h2>
          <span className="text-xs" style={{ color: "var(--text-m)" }}>{RECENT.length} archivos</span>
        </div>
        <div>
          {RECENT.map((r, i) => (
            <div
              key={r.name}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--hover-bg)]"
              style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <Mic className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: "var(--text-h)" }}>{r.name}</p>
                <p className="text-xs" style={{ color: "var(--text-m)" }}>{r.dur} · {r.tickets} tickets</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                r.status === "Analizado"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button className="flex items-center gap-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-xl px-4 py-3.5 transition-colors text-left">
          <Mic className="w-5 h-5 text-violet-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-violet-600 dark:text-violet-300">Nueva grabación</p>
            <p className="text-xs" style={{ color: "var(--text-m)" }}>Graba una reunión ahora</p>
          </div>
        </button>
        <button className="flex items-center gap-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl px-4 py-3.5 transition-colors text-left">
          <Clock className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">Ver tickets pendientes</p>
            <p className="text-xs" style={{ color: "var(--text-m)" }}>8 abiertos, 3 urgentes</p>
          </div>
        </button>
      </div>
    </div>
  );
}
