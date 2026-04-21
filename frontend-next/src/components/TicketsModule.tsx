"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronUp, Circle, CheckCircle2,
  User, Calendar, RefreshCw, Loader2, Mic2, Zap, Trash2, Mic
} from "lucide-react";
import {
  getOpportunities, updateOpportunity, deleteOpportunity, getRecordings,
  Opportunity, Recording,
} from "@/lib/api";

interface TicketsModuleProps {
  recordingId: number | null;
  onSelectRecording?: (id: number) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: "Alta",  cls: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25",         dot: "bg-red-500"   },
  medium: { label: "Media", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25", dot: "bg-amber-500" },
  low:    { label: "Baja",  cls: "text-slate-500 bg-slate-500/10 border-slate-500/25",                     dot: "bg-slate-400" },
};

const LEFT_ACCENT: Record<string, string> = {
  high:   "border-l-red-500",
  medium: "border-l-amber-500",
  low:    "border-l-slate-400",
};

export default function TicketsModule({ recordingId, onSelectRecording }: TicketsModuleProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [tickets, setTickets] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

  // Load recording list for selector
  useEffect(() => { getRecordings().then(setRecordings).catch(() => {}); }, []);

  const loadTickets = useCallback(async () => {
    if (!recordingId) return;
    setLoading(true);
    try {
      const data = await getOpportunities(recordingId);
      setTickets(data);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [recordingId]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const toggle = (id: number) =>
    setOpenIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleComplete = async (id: number) => {
    try {
      await updateOpportunity(id, { status: "closed" });
      setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: "closed" } : t));
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este ticket?")) return;
    try {
      await deleteOpportunity(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch { /* ignore */ }
  };

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);
  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status === "open").length,
    closed: tickets.filter((t) => t.status === "closed").length,
  };

  // No recording selected
  if (!recordingId) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Tickets</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Selecciona una grabación para ver sus tickets</p>
        </div>
        {recordings.length > 0 ? (
          <div className="space-y-2">
            {recordings.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRecording?.(r.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border hover:border-violet-500/40 hover:bg-violet-500/5 transition-all"
                style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
              >
                <Mic className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="text-sm truncate" style={{ color: "var(--text-h)" }}>{r.filename}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed" style={{ borderColor: "var(--border-color)" }}>
            <p className="text-sm" style={{ color: "var(--text-m)" }}>No hay grabaciones aún</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Tickets</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Oportunidades y acciones detectadas por IA</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadTickets}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:bg-[var(--hover-bg)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border-color)" }}>
            {(["all", "open", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                  filter === f ? "bg-violet-600 text-white shadow-sm" : "hover:bg-[var(--hover-bg)]"
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
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed" style={{ borderColor: "var(--border-color)" }}>
          <p className="text-sm" style={{ color: "var(--text-m)" }}>
            {tickets.length === 0
              ? "No hay tickets. Ve a Transcripciones → Crear tickets."
              : "No hay tickets con este filtro."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket) => {
            const isExpanded = openIds.includes(ticket.id);
            const prio = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.low;
            const isClosed = ticket.status === "closed";
            const leftAccent = LEFT_ACCENT[ticket.priority] ?? LEFT_ACCENT.low;

            return (
              <div
                key={ticket.id}
                className={`rounded-xl border-l-2 border overflow-hidden transition-all ${leftAccent} ${isClosed ? "opacity-60" : ""}`}
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
                  <div className="shrink-0">
                    {isClosed
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <Circle className="w-4 h-4 text-violet-400" />
                    }
                  </div>

                  <span
                    className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ background: "var(--surface)", color: "var(--text-m)" }}
                  >
                    T-{String(ticket.id).padStart(3, "0")}
                  </span>

                  <span
                    className={`flex-1 text-sm font-medium truncate ${isClosed ? "line-through" : ""}`}
                    style={{ color: isClosed ? "var(--text-m)" : "var(--text-h)" }}
                  >
                    {ticket.title}
                  </span>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${prio.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                    {prio.label}
                  </span>

                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                    : <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                  }
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "var(--border-color)" }}>
                    <p className="text-sm leading-relaxed pt-3" style={{ color: "var(--text-b)" }}>
                      {ticket.description}
                    </p>

                    {ticket.notes && (
                      <p className="text-xs italic px-3 py-2 rounded-lg border" style={{ borderColor: "var(--border-color)", background: "var(--surface)", color: "var(--text-m)" }}>
                        {ticket.notes}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {ticket.assignee && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}>
                          <User className="w-3 h-3 shrink-0" style={{ color: "var(--text-m)" }} />
                          <span style={{ color: "var(--text-m)" }}>Asignado a</span>
                          <span className="font-semibold" style={{ color: "var(--text-h)" }}>{ticket.assignee}</span>
                        </div>
                      )}
                      {ticket.deadline && (
                        <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border" style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}>
                          <Calendar className="w-3 h-3 shrink-0" style={{ color: "var(--text-m)" }} />
                          <span style={{ color: "var(--text-m)" }}>Deadline</span>
                          <span className="font-semibold" style={{ color: "var(--text-h)" }}>{ticket.deadline}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-violet-500/20 bg-violet-500/8">
                        <Mic2 className="w-3 h-3 text-violet-500 shrink-0" />
                        <span className="text-violet-600 dark:text-violet-400 text-[11px]">Grabación #{ticket.recording_id}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      {!isClosed && (
                        <button
                          onClick={() => handleComplete(ticket.id)}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all flex items-center gap-1.5"
                        >
                          <Zap className="w-3 h-3" /> Marcar completado
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/25 transition-all flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

