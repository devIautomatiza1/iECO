"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mail, MessageCircle, Sparkles, Play, Pause, Volume2,
  Bot, Loader2, FileText, Mic, Ticket, X, Share2, Copy, Check
} from "lucide-react";
import {
  getRecordings, getTranscription, transcribeRecording,
  fetchAudioObjectURL, analyzeOpportunities, generateSummary, Recording,
} from "@/lib/api";

interface TranscriptionModuleProps {
  recordingId: number | null;
  onSelectRecording?: (id: number) => void;
}

const SPEAKER_COLORS = [
  { avatarBg: "bg-violet-600", avatarText: "text-white", accent: "text-violet-500", border: "border-l-violet-500" },
  { avatarBg: "bg-indigo-600", avatarText: "text-white", accent: "text-indigo-500", border: "border-l-indigo-500" },
  { avatarBg: "bg-emerald-600", avatarText: "text-white", accent: "text-emerald-500", border: "border-l-emerald-500" },
  { avatarBg: "bg-amber-600",   avatarText: "text-white", accent: "text-amber-500",   border: "border-l-amber-500"   },
];

function parseTranscription(text: string): { speaker: string; label: string; content: string }[] {
  const lines = text.split("\n").filter((l) => l.trim());
  const speakerMap = new Map<string, number>();
  return lines.map((line) => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const [, speaker, content] = match;
      if (!speakerMap.has(speaker)) speakerMap.set(speaker, speakerMap.size);
      return { speaker: String.fromCharCode(65 + (speakerMap.get(speaker) ?? 0)), label: speaker, content };
    }
    return { speaker: "?", label: "Sistema", content: line };
  });
}

export default function TranscriptionModule({ recordingId, onSelectRecording }: TranscriptionModuleProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [transcribeError, setTranscribeError] = useState("");
  const [analyzeMsg, setAnalyzeMsg] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioURLRef = useRef<string | null>(null);

  const activeRecording = recordings.find((r) => r.id === recordingId) ?? null;

  // Load recordings list for selector
  useEffect(() => {
    getRecordings().then(setRecordings).catch(() => {});
  }, []);

  // Load transcription + audio when recordingId changes
  const loadData = useCallback(async () => {
    if (!recordingId) return;
    setTranscription(null);
    setTranscribeError("");
    setAudioURL(null);
    if (audioURLRef.current) { URL.revokeObjectURL(audioURLRef.current); audioURLRef.current = null; }

    try {
      const t = await getTranscription(recordingId);
      setTranscription(t.transcription ?? null);
    } catch { setTranscription(null); }

    try {
      const url = await fetchAudioObjectURL(recordingId);
      audioURLRef.current = url;
      setAudioURL(url);
    } catch { /* audio optional */ }
  }, [recordingId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => () => { if (audioURLRef.current) URL.revokeObjectURL(audioURLRef.current); }, []);

  // Audio controls
  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else audio.play();
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const fmtTime = (s: number) => {
    if (!s || !isFinite(s)) return "--:--";
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  // Transcribe
  const handleTranscribe = async () => {
    if (!recordingId) return;
    setTranscribing(true);
    setTranscribeError("");
    try {
      const res = await transcribeRecording(recordingId);
      setTranscription(res.transcription);
      setRecordings((prev) => prev.map((r) => r.id === recordingId ? { ...r, transcribed: true } : r));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al transcribir";
      const friendly = msg.includes("429") || msg.toLowerCase().includes("resource exhausted")
        ? "Cuota de Gemini AI agotada. Espera unos minutos y vuelve a intentarlo."
        : msg;
      setTranscribeError(friendly);
    } finally {
      setTranscribing(false);
    }
  };

  // Analyze opportunities
  const handleAnalyze = async () => {
    if (!recordingId) return;
    setAnalyzing(true);
    setAnalyzeMsg("");
    try {
      const res = await analyzeOpportunities(recordingId);
      setAnalyzeMsg(`✓ Se crearon ${res.count} ticket${res.count !== 1 ? "s" : ""}`);
    } catch (err: unknown) {
      setAnalyzeMsg(err instanceof Error ? err.message : "Error al analizar");
    } finally {
      setAnalyzing(false);
    }
  };

  // Share helpers
  const shareEmail = () => {
    if (!transcription) return;
    window.open(`mailto:?subject=Transcripci%C3%B3n%20de%20reuni%C3%B3n&body=${encodeURIComponent(transcription)}`);
  };
  const shareWhatsApp = () => {
    if (!transcription) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(transcription)}`);
  };

  const handleCopy = async () => {
    if (!transcription) return;
    try {
      await navigator.clipboard.writeText(transcription);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard API no disponible */ }
  };

  // Summary helpers
  const handleGenerateSummary = async () => {
    if (!recordingId) return;
    setGeneratingSummary(true);
    setSummaryError("");
    try {
      const res = await generateSummary(recordingId);
      setSummary(res.summary);
      setShowSummary(true);
    } catch (err: unknown) {
      setSummaryError(err instanceof Error ? err.message : "Error al generar resumen");
    } finally {
      setGeneratingSummary(false);
    }
  };
  const shareSummaryEmail = () => {
    if (!summary) return;
    window.open(`mailto:?subject=Resumen%20de%20reuni%C3%B3n&body=${encodeURIComponent(summary)}`);
  };
  const shareSummaryWhatsApp = () => {
    if (!summary) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`);
  };

  const parsed = transcription ? parseTranscription(transcription) : [];

  if (!recordingId) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Transcripción</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Selecciona una grabación para transcribir</p>
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
                {r.transcribed && <span className="ml-auto text-[10px] font-semibold text-emerald-600 border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">Transcrito</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2 rounded-2xl border border-dashed" style={{ borderColor: "var(--border-color)" }}>
            <FileText className="w-8 h-8" style={{ color: "var(--text-m)" }} />
            <p className="text-sm" style={{ color: "var(--text-m)" }}>No hay grabaciones. Ve a Grabaciones para subir audio.</p>
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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Transcripción</h1>
          <p className="text-sm mt-1 truncate max-w-xs" style={{ color: "var(--text-b)" }}>
            {activeRecording?.filename ?? `#${recordingId}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {transcription && (
            <>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  copied
                    ? "bg-emerald-600/10 border-emerald-500/25 text-emerald-500"
                    : "bg-slate-500/10 border-slate-500/25 text-slate-500 hover:bg-slate-500/20"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button onClick={shareEmail} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600/10 border border-indigo-500/25 text-indigo-500 hover:bg-indigo-600/20 transition-all">
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
              <button onClick={shareWhatsApp} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-600/20 transition-all">
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={generatingSummary}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-sky-600/10 border border-sky-500/25 text-sky-500 hover:bg-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {generatingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {generatingSummary ? "Generando…" : "Resumen IA"}
              </button>
            </>
          )}
          <button
            onClick={handleAnalyze}
            disabled={!transcription || analyzing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600/10 border border-violet-500/25 text-violet-500 hover:bg-violet-600/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ticket className="w-3.5 h-3.5" />}
            {analyzing ? "Analizando…" : "Crear tickets"}
          </button>
        </div>
      </div>

      {analyzeMsg && (
        <div className={`text-xs px-3 py-2 rounded-lg border ${analyzeMsg.startsWith("✓") ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600" : "bg-red-500/10 border-red-500/25 text-red-500"}`}>
          {analyzeMsg}
        </div>
      )}

      {summaryError && (
        <div className="text-xs px-3 py-2 rounded-lg border bg-red-500/10 border-red-500/25 text-red-500">
          {summaryError}
        </div>
      )}

      {/* Audio player */}
      {audioURL && (
        <>
          <audio
            ref={audioRef}
            src={audioURL}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
            onTimeUpdate={(e) => {
              const a = e.target as HTMLAudioElement;
              setProgress(duration ? (a.currentTime / duration) * 100 : 0);
            }}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
          <div
            className="sticky top-4 z-10 backdrop-blur-md rounded-2xl px-5 py-4 border"
            style={{ background: "var(--player-bg)", borderColor: "var(--border-med)", boxShadow: "var(--shadow-lift)" }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 flex items-center justify-center transition-all shrink-0 shadow-md shadow-violet-600/25"
              >
                {playing ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="relative w-full h-2 rounded-full cursor-pointer" style={{ background: "var(--player-track)" }} onClick={handleSeek}>
                  <div className="bg-violet-500 h-2 rounded-full relative" style={{ width: `${progress}%` }}>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-violet-500 border-2 border-white dark:border-[var(--card-bg)] shadow translate-x-1.5" />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-mono" style={{ color: "var(--text-m)" }}>
                  <span>{fmtTime((progress / 100) * duration)}</span>
                  <span>{fmtTime(duration)}</span>
                </div>
              </div>
              <Volume2 className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
            </div>
          </div>
        </>
      )}

      {/* Transcribir button or content */}
      {!transcription ? (
        <div
          className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-dashed"
          style={{ borderColor: "var(--border-color)" }}
        >
          <FileText className="w-10 h-10" style={{ color: "var(--text-m)" }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--text-h)" }}>Sin transcripción</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-m)" }}>Haz clic para procesar el audio con IA (archivos largos pueden tardar varios minutos)</p>
          </div>
          {transcribeError && <p className="text-xs text-red-500">{transcribeError}</p>}
          <button
            onClick={handleTranscribe}
            disabled={transcribing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm shadow-violet-600/30"
          >
            {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {transcribing ? "Procesando en servidor…" : "Transcribir con IA"}
          </button>
          {transcribing && (
            <p className="text-xs" style={{ color: "var(--text-m)" }}>
              Enviando audio a Gemini AI… no cierres esta pestaña
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {parsed.map((line, i) => {
            const colorIdx = line.speaker.charCodeAt(0) - 65;
            const color = SPEAKER_COLORS[colorIdx % SPEAKER_COLORS.length] ?? SPEAKER_COLORS[0];

            if (line.speaker === "?") {
              return (
                <div key={i} className="flex items-center gap-3 py-1">
                  <div className="w-9 flex justify-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                  </div>
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20">
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-300 italic">{line.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={i} className="flex gap-3 group">
                <div className="flex flex-col items-center shrink-0 w-9">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${color.avatarBg} ${color.avatarText} shadow-sm`}>
                    {line.speaker}
                  </div>
                </div>
                <div
                  className={`flex-1 rounded-xl border-l-2 px-4 py-3 transition-all group-hover:shadow-sm ${color.border}`}
                  style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-b)" }}
                >
                  <div className={`text-[11px] font-semibold mb-1.5 ${color.accent}`}>{line.label}</div>
                  <p className="text-sm leading-relaxed">{line.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Panel */}
      {showSummary && summary && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Resumen ejecutivo</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={shareSummaryEmail}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-600/10 border border-indigo-500/25 text-indigo-500 hover:bg-indigo-600/20 transition-all"
              >
                <Mail className="w-3 h-3" /> Email
              </button>
              <button
                onClick={shareSummaryWhatsApp}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-600/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-600/20 transition-all"
              >
                <Share2 className="w-3 h-3" /> WhatsApp
              </button>
              <button
                onClick={() => setShowSummary(false)}
                className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/10 text-red-500 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div
            className="text-sm leading-relaxed whitespace-pre-wrap rounded-xl p-4 border"
            style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}
          >
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}

