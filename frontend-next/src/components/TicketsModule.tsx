"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Circle, AlertCircle, CheckCircle2, Clock } from "lucide-react";

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

const PRIORITY_STYLES: Record<string, string> = {
  high: "text-red-400 bg-red-500/10 border-red-500/20",
  medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  low: "text-slate-400 bg-slate-500/10 border-slate-500/20",
};
const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };

const STATUS_ICON: Record<string, React.ReactElement> = {
  open: <Circle className="w-4 h-4 text-violet-400" />,
  "in-progress": <Clock className="w-4 h-4 text-amber-400" />,
  closed: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  blocked: <AlertCircle className="w-4 h-4 text-red-400" />,
};

export default function TicketsModule() {
  const [open, setOpen] = useState<string[]>(["T-001"]);
  const [filter, setFilter] = useState("all");

  const toggle = (id: string) =>
    setOpen((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filtered = MOCK_TICKETS.filter(
    (t) => filter === "all" || t.status === filter
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>Tickets</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Oportunidades y acciones detectadas por IA</p>
        </div>
        <div className="flex gap-2">
          {["all", "open", "closed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                filter === f
                  ? "bg-violet-600/20 border-violet-500/30 text-violet-300"
                  : "border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
              }`}
            >
              {f === "all" ? "Todos" : f === "open" ? "Abiertos" : "Cerrados"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((ticket) => {
          const isOpen = open.includes(ticket.id);
          return (
            <div
              key={ticket.id}
              className={`rounded-xl border transition-all ${
                ticket.status === "closed"
                  ? "opacity-70"
                  : ""
              }`}
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
            >
              <button
                onClick={() => toggle(ticket.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
              >
                {STATUS_ICON[ticket.status] ?? STATUS_ICON["open"]}
                <span className={`text-xs font-mono text-slate-600 shrink-0`}>{ticket.id}</span>
                <span
                  className={`flex-1 text-sm font-medium ${
                    ticket.status === "closed"
                      ? "line-through"
                      : ""
                  }`}
                  style={{ color: ticket.status === "closed" ? "var(--text-m)" : "var(--text-h)" }}
                >
                  {ticket.title}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[ticket.priority]}`}>
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                )}
              </button>

              {isOpen && (
                  <div
                    className="px-4 pb-4 pt-0 space-y-3 border-t"
                    style={{ borderColor: "var(--border-color)" }}
                  >
                  <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--text-b)" }}>{ticket.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--text-m)" }}>Asignado a</span>
                      <span className="font-medium" style={{ color: "var(--text-h)" }}>{ticket.assignee}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--text-m)" }}>Deadline</span>
                      <span className="font-medium" style={{ color: "var(--text-h)" }}>{ticket.deadline}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: "var(--text-m)" }}>Origen</span>
                      <span className="font-medium text-violet-500 dark:text-violet-400">{ticket.source}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                      style={{ background: "var(--btn-bg)", borderColor: "var(--border-color)", color: "var(--text-b)" }}
                    >
                      Editar
                    </button>
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-green-600/10 hover:bg-green-600/20 text-green-400 border border-green-500/20 transition-colors">
                      Marcar completado
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
