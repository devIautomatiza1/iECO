"use client";
import { useState } from "react";
import { Mail, MessageCircle, Sparkles, Play, Pause, Volume2, Bot } from "lucide-react";

const SPEAKERS: Record<string, { name: string; avatarBg: string; avatarText: string; accent: string; borderAccent: string }> = {
  A: { name: "Ana García",   avatarBg: "bg-violet-600", avatarText: "text-white", accent: "text-violet-600 dark:text-violet-400", borderAccent: "border-l-violet-500" },
  B: { name: "Carlos López", avatarBg: "bg-indigo-600", avatarText: "text-white", accent: "text-indigo-600 dark:text-indigo-400", borderAccent: "border-l-indigo-500"  },
};

const MOCK_TRANSCRIPT = [
  { speaker: "A", time: "00:12", text: "Buenos días a todos, empecemos con el repaso de los KPIs del trimestre. Hemos superado el objetivo de ventas en un 18%." },
  { speaker: "B", time: "00:34", text: "Excelente resultado. El cliente premium que comentamos la semana pasada está listo para firmar el contrato. Necesito que alguien del equipo técnico prepare la demo." },
  { speaker: "A", time: "00:52", text: "Perfecto. Asignamos eso a Miguel. Carlos, ¿puedes coordinarlo? Necesitamos tenerlo listo antes del viernes." },
  { speaker: "B", time: "01:05", text: "Confirmado, me ocupo. También quería mencionar el pipeline de Q2: tenemos 3 oportunidades en fase de negociación avanzada por un total de 240.000€." },
  { speaker: "A", time: "01:28", text: "Muy bien. Vamos a priorizar el seguimiento de esas tres. Necesito un informe detallado para el lunes." },
  { speaker: "C", time: "01:45", text: "Tarea asignada a Miguel — Demo técnica cliente premium — Deadline: viernes" },
  { speaker: "B", time: "02:01", text: "De acuerdo. Respecto al presupuesto de marketing, tenemos un 15% sin asignar. Propongo invertirlo en LinkedIn Ads para el segmento enterprise." },
  { speaker: "A", time: "02:22", text: "Tiene sentido. Prepara una propuesta con proyección de ROI y la revisamos el jueves en la reunión de dirección." },
];

export default function TranscriptionModule() {
  const [playing, setPlaying] = useState(false);
  const [progress] = useState(35);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Transcripción</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>
            20260415_132659.m4a · 18 min 42 seg · Español
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-500/40 transition-all">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-600/20 hover:border-emerald-500/40 transition-all">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600/10 border border-violet-500/25 text-violet-600 dark:text-violet-300 hover:bg-violet-600/20 hover:border-violet-500/40 transition-all">
            <Sparkles className="w-3.5 h-3.5" /> Resumen
          </button>
        </div>
      </div>

      {/* Reproductor */}
      <div
        className="sticky top-4 z-10 backdrop-blur-md rounded-2xl px-5 py-4 border"
        style={{ background: "var(--player-bg)", borderColor: "var(--border-med)", boxShadow: "var(--shadow-lift)" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPlaying(!playing)}
            className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 flex items-center justify-center transition-all shrink-0 shadow-md shadow-violet-600/25"
          >
            {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>

          <div className="flex-1 flex flex-col gap-1.5">
            <div className="relative w-full h-2 rounded-full cursor-pointer" style={{ background: "var(--player-track)" }}>
              <div className="bg-violet-500 h-2 rounded-full relative" style={{ width: `${progress}%` }}>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-violet-500 border-2 border-white dark:border-[var(--card-bg)] shadow translate-x-1.5" />
              </div>
            </div>
            <div className="flex justify-between text-[11px] font-mono" style={{ color: "var(--text-m)" }}>
              <span>06:32</span>
              <span>18:42</span>
            </div>
          </div>

          <Volume2 className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
        </div>
      </div>

      {/* Transcripción */}
      <div className="space-y-2">
        {MOCK_TRANSCRIPT.map((line, i) => {
          if (line.speaker === "C") {
            return (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="flex flex-col items-center shrink-0 w-9">
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-[10px] font-mono mt-1" style={{ color: "var(--text-m)" }}>{line.time}</span>
                </div>
                <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/70 shrink-0">IA</span>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 italic">{line.text}</span>
                </div>
              </div>
            );
          }

          const sp = SPEAKERS[line.speaker] ?? SPEAKERS["A"];
          return (
            <div key={i} className="flex gap-3 group">
              <div className="flex flex-col items-center shrink-0 w-9">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sp.avatarBg} ${sp.avatarText} shadow-sm`}>
                  {line.speaker}
                </div>
                <span className="text-[10px] font-mono mt-1" style={{ color: "var(--text-m)" }}>{line.time}</span>
              </div>
              <div
                className={`flex-1 rounded-xl border-l-2 px-4 py-3 transition-all border group-hover:shadow-sm ${sp.borderAccent}`}
                style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-b)" }}
              >
                <div className={`text-[11px] font-semibold mb-1.5 ${sp.accent}`}>{sp.name}</div>
                <p className="text-sm leading-relaxed">{line.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
