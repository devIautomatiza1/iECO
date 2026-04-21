"use client";
import { useState } from "react";
import { Mail, MessageCircle, Sparkles, Play, Pause, Volume2 } from "lucide-react";

const SPEAKERS = [
  { id: "A", name: "Ana García", color: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  { id: "B", name: "Carlos López", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" },
  { id: "C", name: "Sistema", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
];

const MOCK_TRANSCRIPT = [
  { speaker: "A", time: "00:12", text: "Buenos días a todos, empecemos con el repaso de los KPIs del trimestre. Hemos superado el objetivo de ventas en un 18%." },
  { speaker: "B", time: "00:34", text: "Excelente resultado. El cliente premium que comentamos la semana pasada está listo para firmar el contrato. Necesito que alguien del equipo técnico prepare la demo." },
  { speaker: "A", time: "00:52", text: "Perfecto. Asignamos eso a Miguel. Carlos, ¿puedes coordinarlo? Necesitamos tenerlo listo antes del viernes." },
  { speaker: "B", time: "01:05", text: "Confirmado, me ocupo. También quería mencionar el pipeline de Q2: tenemos 3 oportunidades en fase de negociación avanzada por un total de 240.000€." },
  { speaker: "A", time: "01:28", text: "Muy bien. Vamos a priorizar el seguimiento de esas tres. Necesito un informe detallado para el lunes." },
  { speaker: "C", time: "01:45", text: "[IA detectó: Tarea asignada a Miguel - Demo técnica cliente premium - Deadline: viernes]" },
  { speaker: "B", time: "02:01", text: "De acuerdo. Respecto al presupuesto de marketing, tenemos un 15% sin asignar. Propongo invertirlo en LinkedIn Ads para el segmento enterprise." },
  { speaker: "A", time: "02:22", text: "Tiene sentido. Prepara una propuesta con proyección de ROI y la revisamos el jueves en la reunión de dirección." },
];

export default function TranscriptionModule() {
  const [playing, setPlaying] = useState(false);
  const [progress] = useState(35);

  const getSpeaker = (id: string) => SPEAKERS.find((s) => s.id === id) ?? SPEAKERS[0];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>Transcripción</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>20260415_132659.m4a · 18 min 42 seg · Español</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-colors">
            <Mail className="w-3.5 h-3.5" /> Email
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/30 transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </button>
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Resumen
          </button>
        </div>
      </div>

      {/* Reproductor sticky */}
      <div className="sticky top-4 z-10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 border" style={{ background: "var(--player-bg)", borderColor: "var(--border-med)" }}>
        <button
          onClick={() => setPlaying(!playing)}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center transition-colors shrink-0"
        >
          {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="w-full rounded-full h-1.5" style={{ background: "var(--player-track)" }}>
            <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>06:32</span>
            <span>18:42</span>
          </div>
        </div>
        <Volume2 className="w-4 h-4 text-slate-500 shrink-0" />
      </div>

      {/* Transcripción */}
      <div className="space-y-3">
        {MOCK_TRANSCRIPT.map((line, i) => {
          const sp = getSpeaker(line.speaker);
          return (
            <div key={i} className="flex gap-3 group">
              <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold ${sp.color}`}>
                  {line.speaker}
                </div>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-m)" }}>{line.time}</span>
              </div>
              <div
                className={`flex-1 rounded-xl px-4 py-3 text-sm leading-relaxed border transition-all ${
                  line.speaker === "C"
                    ? "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-200/80 italic"
                    : "border group-hover:border-[var(--border-med)]"
                }`}
                style={line.speaker !== "C" ? { background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-b)" } : undefined}
              >
                <div className={`text-[11px] font-semibold mb-1 ${sp.color.split(" ")[1]}`}>{sp.name}</div>
                {line.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
