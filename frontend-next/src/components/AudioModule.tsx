"use client";
import { useState, useRef } from "react";
import { Mic, MicOff, Upload, CloudUpload, ChevronDown, Play } from "lucide-react";

const MOCK_RECORDINGS = [
  "20260415_132659.m4a",
  "reunion_ventas_20260412.wav",
  "call_cliente_premium_20260408.mp3",
  "meeting_estrategia_q2.m4a",
];

export default function AudioModule() {
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setIsRecording(true);
      setTimer(0);
      intervalRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    }
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Grabaciones</h1>
        <p className="text-slate-400 text-sm mt-1">Graba en vivo o sube un archivo de audio para transcribir</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Grabadora en vivo */}
        <div className="bg-[#0e1421] rounded-2xl border border-white/[0.06] p-6 flex flex-col items-center gap-5">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Grabadora en vivo</p>
            <p className="text-slate-400 text-sm">Pulsa para comenzar a grabar desde el micrófono</p>
          </div>

          {/* Botón grabación */}
          <button
            onClick={toggleRecording}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              isRecording
                ? "bg-red-500/20 border-2 border-red-500"
                : "bg-violet-600/20 border-2 border-violet-500 hover:bg-violet-600/30"
            }`}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-40" />
            )}
            {isRecording ? (
              <MicOff className="w-10 h-10 text-red-400" />
            ) : (
              <Mic className="w-10 h-10 text-violet-300" />
            )}
          </button>

          {/* Ondas simuladas */}
          <div className="flex items-end gap-1 h-10">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${isRecording ? "bg-violet-400" : "bg-slate-700"}`}
                style={{
                  height: isRecording ? `${Math.random() * 32 + 8}px` : "8px",
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>

          <div className="font-mono text-2xl font-bold text-slate-200">{fmt(timer)}</div>
          <p className="text-xs text-slate-500">{isRecording ? "Grabando…" : "Listo para grabar"}</p>
        </div>

        {/* Subir archivo */}
        <div className="bg-[#0e1421] rounded-2xl border border-white/[0.06] p-6 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Subir archivo</p>
            <p className="text-slate-400 text-sm">Arrastra un archivo o haz clic para seleccionarlo</p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) setSelectedFile(file.name);
            }}
            className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all ${
              dragOver
                ? "border-violet-400 bg-violet-500/10"
                : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
            }`}
          >
            <CloudUpload className={`w-10 h-10 ${dragOver ? "text-violet-400" : "text-slate-600"}`} />
            {selectedFile ? (
              <p className="text-sm text-violet-300 font-medium">{selectedFile}</p>
            ) : (
              <>
                <p className="text-sm text-slate-400">Arrastra aquí tu archivo</p>
                <p className="text-xs text-slate-600">MP3, WAV, M4A, OGG · Máx 500MB</p>
              </>
            )}
          </div>

          <button className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
            <Upload className="w-4 h-4" />
            Seleccionar archivo
          </button>

          {/* Selector de grabación existente */}
          <div className="relative">
            <select
              value={selectedRecording}
              onChange={(e) => setSelectedRecording(e.target.value)}
              className="w-full appearance-none bg-[#151d2e] border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-slate-300 pr-8 focus:outline-none focus:border-violet-500"
            >
              <option value="">— Seleccionar grabación existente —</option>
              {MOCK_RECORDINGS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {selectedRecording && (
            <button className="flex items-center justify-center gap-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 font-medium py-2.5 rounded-lg transition-colors text-sm">
              <Play className="w-4 h-4" />
              Analizar {selectedRecording}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
