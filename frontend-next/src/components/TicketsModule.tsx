"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Circle, AlertCircle, CheckCircle2, Clock, User, Calendar, Mic2, Zap } from "lucide-react";

const MOCK_TICKETS = [
  {
    id: "T-001",
    title: "Demo técnica cliente premium",
    description: "Preparar demo completa para el cliente enterprise. Miguel debe coordinar con Carlos para tenerla lista antes del viernes.",
    status: "open",
    priority: "high",
    assignee: "Miguel R.",
    deadline: "Viernes 25 abr",
    source: "Ana García · 00:52",
  },
  {
    id: "T-002",
    title: "Propuesta ROI LinkedIn Ads enterprise",
    description: "Preparar propuesta de inversión del 15% del presupuesto de marketing en LinkedIn Ads para segmento enterprise, con proyección de ROI.",
    status: "open",
    priority: "medium",
    assignee: "Carlos L.",
    deadline: "Jueves 24 abr",
    source: "Carlos López · 02:22",
  },
  {
    id: "T-003",
    title: "Informe pipeline Q2 — 3 oportunidades",
    description: "Informe detallado de las 3 oportunidades en negociación avanzada (240.000€ totales) para presentar el lunes.",
    status: "open",
    priority: "high",
    assignee: "Carlos L.",
    deadline: "Lunes 28 abr",
    source: "Ana García · 01:28",
  },
  {
    id: "T-004",
    title: "Revisión KPIs Q1 — +18% ventas",
    description: "Documentar el análisis de KPIs del trimestre y preparar comparativa vs objetivo para el informe ejecutivo.",
    status: "closed",
    priority: "low",
    assignee: "Ana G.",
    deadline: "Completado",
    source: "Ana García · 00:12",
  },
];

const PRIORITY_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: "Alta",  cls: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25",     dot: "bg-red-500"   },
  medium: { label: "Media", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25", dot: "bg-amber-500" },
  low:    { label: "Baja",  cls: "text-slate-500 bg-slate-500/10 border-slate-500/25",                  dot: "bg-slate-400" },
};

const LEFT_ACCENT: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-amber-500",
  low: "border-l-slate-400",
};

export default function TicketsModule() {
  const [openIds, setOpenIds] = useState<string[]>(["T-001"]);
  const [filter, setFilter] = useState("all");

  const toggle = (id: string) =>
    setOpenIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = MOCK_TICKETS.filter(
    (t) => filter === "all" || t.status === filter
  );

  const counts = {
    all: MOCK_TICKETS.length,
    open: MOCK_TICKETS.filter(t => t.status === "open").length,
    closed: MOCK_TICKETS.filter(t => t.status === "closed").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Tickets</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Oportunidades y acciones detectadas por IA</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border-color)" }}>
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f
                  ? "bg-violet-600 text-white shadow-sm"
                  : "hover:bg-[var(--hover-bg)]"
              }`}
              style={filter !== f ? { color: "var(--text-b)" } : undefined}
            >
              {f === "all" ? "Todos" : f === "open" ? "Abiertos" : "Cerrados"}
              <span className={`ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                filter === f ? "bg-white/20 text-white" : "bg-[var(--border-color)]"
              }`} style={filter !== f ? { color: "var(--text-m)" } : undefined}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Ticket list */}
      <div className="space-y-2">
        {filtered.map((ticket) => {
          const isExpanded = openIds.includes(ticket.id);
          const prio = PRIORITY_CONFIG[ticket.priority];
          const isClosed = ticket.status === "closed";

          return (
            <div
              key={ticket.id}
              className={`rounded-xl border-l-2 border overflow-hidden transition-all ${LEFT_ACCENT[ticket.priority]} ${isClosed ? "opacity-60" : ""}`}
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border-color)",
                boxShadow: isExpanded ? "var(--shadow-lift)" : "var(--shadow-card)",
              }}
            >
              {/* Row */}
              <button
                onClick={() => toggle(ticket.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--hover-bg)] transition-colors"
              >
                {/* Status icon */}
                <div className="shrink-0">
                  {isClosed
                    ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    : <Circle className="w-4.5 h-4.5 text-violet-400" />
                  }
                </div>

                {/* ID badge */}
                <span
                  className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: "var(--surface)", color: "var(--text-m)" }}
                >
                  {ticket.id}
                </span>

                {/* Title */}
                <span
                  className={`flex-1 text-sm font-medium truncate ${isClosed ? "line-through" : ""}`}
                  style={{ color: isClosed ? "var(--text-m)" : "var(--text-h)" }}
                >
                  {ticket.title}
                </span>

                {/* Priority pill */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${prio.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                  {prio.label}
                </span>

                {/* Chevron */}
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                  : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                }
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 space-y-4 border-t"
                  style={{ borderColor: "var(--border-color)" }}
                >
                  <p className="text-sm leading-relaxed pt-3" style={{ color: "var(--text-b)" }}>
                    {ticket.description}
                  </p>

                  {/* Meta chips */}
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}>
                      <User className="w-3 h-3 shrink-0" style={{ color: "var(--text-m)" }} />
                      <span style={{ color: "var(--text-m)" }}>Asignado a</span>
                      <span className="font-semibold" style={{ color: "var(--text-h)" }}>{ticket.assignee}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}>
                      <Calendar className="w-3 h-3 shrink-0" style={{ color: "var(--text-m)" }} />
                      <span style={{ color: "var(--text-m)" }}>Deadline</span>
                      <span className="font-semibold" style={{ color: "var(--text-h)" }}>{ticket.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/8">
                      <Mic2 className="w-3 h-3 text-violet-500 shrink-0" />
                      <span className="text-violet-600 dark:text-violet-400">{ticket.source}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isClosed && (
                    <div className="flex gap-2 pt-1">
                      <button
                        className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-all hover:bg-[var(--hover-bg)]"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-b)" }}
                      >
                        Editar
                      </button>
                      <button className="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all flex items-center gap-1.5">
                        <Zap className="w-3 h-3" />
                        Marcar completado
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
