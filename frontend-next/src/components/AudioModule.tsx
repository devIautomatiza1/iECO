"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, MicOff, Upload, Trash2, FileAudio, RefreshCw,
  ChevronRight, CheckCircle2, Clock, Edit2, Check, X,
  CheckSquare, Square
} from "lucide-react";
import {
  getRecordings, uploadRecording, deleteRecording, renameRecording,
  Recording,
} from "@/lib/api";

interface AudioModuleProps {
  onSelectRecording: (id: number, name?: string) => void;
  selectedRecordingId: number | null;
  onNavigate: (tab: string) => void;
}

export default function AudioModule({ onSelectRecording, selectedRecordingId, onNavigate }: AudioModuleProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Recording live
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingError, setRecordingError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rename state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  // Batch delete state
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecordings = useCallback(async () => {
    setLoadingRecordings(true);
    try {
      const data = await getRecordings();
      setRecordings(data);
    } catch {
      // ignore
    } finally {
      setLoadingRecordings(false);
    }
  }, []);

  useEffect(() => { loadRecordings(); }, [loadRecordings]);

  // â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

  const handleFile = async (file: File) => {
    setUploadError("");
    if (file.size > MAX_FILE_SIZE) {
      setUploadError("El archivo supera el límite de 500 MB");
      return;
    }
    setUploading(true);
    try {
      await uploadRecording(file);
      await loadRecordings();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // â”€â”€ Live recording â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startRecording = async () => {
    setRecordingError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const mr = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes("webm") ? "webm" : "ogg";
        const filename = `grabacion_${new Date().toISOString().replace(/[:.]/g, "-")}.${ext}`;
        const file = new File([blob], filename, { type: mimeType });
        setUploading(true);
        try {
          await uploadRecording(file);
          await loadRecordings();
        } catch (err: unknown) {
          setUploadError(err instanceof Error ? err.message : "Error al guardar grabaciÃ³n");
        } finally {
          setUploading(false);
        }
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      setRecordingError("No se pudo acceder al micrÃ³fono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // â”€â”€ Delete â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (id: number) => {
    if (!confirm("Â¿Eliminar esta grabaciÃ³n?")) return;
    try {
      await deleteRecording(id);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecordingId === id) onSelectRecording(recordings.find((r) => r.id !== id)?.id ?? 0);
    } catch { /* ignore */ }
  };

  const toggleBatchSelect = (id: number) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (batchSelected.size === 0) return;
    if (!confirm(`¿Eliminar ${batchSelected.size} grabación(es) seleccionadas?`)) return;
    setBatchDeleting(true);
    const ids = Array.from(batchSelected);
    for (const id of ids) {
      try { await deleteRecording(id); } catch { /* ignore */ }
    }
    setRecordings((prev) => prev.filter((r) => !batchSelected.has(r.id)));
    if (selectedRecordingId && batchSelected.has(selectedRecordingId)) onSelectRecording(0);
    setBatchSelected(new Set());
    setBatchMode(false);
    setBatchDeleting(false);
  };

  // â”€â”€ Rename â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startEdit = (r: Recording) => { setEditingId(r.id); setEditName(r.filename); };
  const cancelEdit = () => { setEditingId(null); setEditName(""); };
  const confirmEdit = async (id: number) => {
    if (!editName.trim()) return;
    try {
      await renameRecording(id, editName.trim());
      setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, filename: editName.trim() } : r));
      cancelEdit();
    } catch { /* ignore */ }
  };

  // â”€â”€ Select + navigate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSelectAndNavigate = (id: number, name: string, tab: string) => {
    onSelectRecording(id, name);
    onNavigate(tab);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Grabaciones</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Sube audios o graba directamente desde el navegador</p>
      </div>

      {/* Top row: Recorder + Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live recorder */}
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Grabadora en vivo</span>
          </div>

          {recordingError && (
            <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/25">{recordingError}</p>
          )}

          <div className="flex flex-col items-center gap-4 py-4">
            {isRecording && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-mono font-bold text-red-500">{formatTime(recordingSeconds)}</span>
              </div>
            )}

            {/* Waveform visual */}
            <div className="flex items-center gap-0.5 h-8">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${isRecording ? "bg-violet-500" : ""}`}
                  style={{
                    background: isRecording ? undefined : "var(--wave-inactive)",
                    height: isRecording
                      ? `${20 + Math.sin((Date.now() / 200 + i) * 0.8) * 12 + Math.random() * 8}px`
                      : `${6 + Math.sin(i * 0.8) * 4}px`,
                    animation: isRecording ? `none` : undefined,
                  }}
                />
              ))}
            </div>

            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={uploading}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md disabled:opacity-50 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-400 shadow-red-500/30"
                  : "bg-violet-600 hover:bg-violet-500 shadow-violet-600/30"
              }`}
            >
              {isRecording ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
            </button>
            <p className="text-xs" style={{ color: "var(--text-m)" }}>
              {isRecording ? "Toca para detener y guardar" : "Toca para empezar a grabar"}
            </p>
          </div>
        </div>

        {/* Upload */}
        <div
          className={`rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
            isDragging ? "border-violet-500 bg-violet-500/5" : ""
          }`}
          style={!isDragging ? { borderColor: "var(--upload-border)", background: "var(--card-bg)" } : undefined}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.flac,.webm" className="hidden" onChange={handleFileInput} />
          <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center">
            <Upload className="w-5 h-5 text-violet-500" />
          </div>
          {uploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm" style={{ color: "var(--text-m)" }}>Subiendoâ€¦</span>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-center" style={{ color: "var(--text-b)" }}>
                Arrastra tu audio aquÃ­<br />
                <span style={{ color: "var(--text-m)" }}>o haz clic para seleccionar</span>
              </p>
              <p className="text-xs" style={{ color: "var(--text-m)" }}>MP3, WAV, M4A, OGG, FLAC, WEBM</p>
            </>
          )}
          {uploadError && <p className="text-xs text-red-500 text-center">{uploadError}</p>}
        </div>
      </div>

      {/* Recordings list */}
      <div className="space-y-3">
          <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>
            Audios guardados <span className="font-normal" style={{ color: "var(--text-m)" }}>({recordings.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setBatchMode((b) => !b); setBatchSelected(new Set()); }}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                batchMode ? "border-red-500/50 text-red-500 bg-red-500/5" : "hover:bg-[var(--hover-bg)]"
              }`}
              style={!batchMode ? { borderColor: "var(--border-color)", color: "var(--text-m)" } : undefined}
            >
              <CheckSquare className="w-3 h-3" /> {batchMode ? "Cancelar" : "Seleccionar"}
            </button>
            <button
              onClick={loadRecordings}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all hover:bg-[var(--hover-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
            >
              <RefreshCw className="w-3 h-3" /> Actualizar
            </button>
          </div>
        </div>

        {loadingRecordings ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recordings.length === 0 ? (
          <div
            className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-12 gap-2"
            style={{ borderColor: "var(--border-color)" }}
          >
            <FileAudio className="w-8 h-8" style={{ color: "var(--text-m)" }} />
            <p className="text-sm" style={{ color: "var(--text-m)" }}>No hay grabaciones aÃºn</p>
          </div>
        ) : (
          <>
          {/* Batch delete bar */}
          {batchMode && batchSelected.size > 0 && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl border"
              style={{ background: "var(--surface)", borderColor: "var(--border-med)" }}
            >
              <span className="text-sm font-medium" style={{ color: "var(--text-h)" }}>
                {batchSelected.size} grabación{batchSelected.size !== 1 ? "es" : ""} seleccionada{batchSelected.size !== 1 ? "s" : ""}
              </span>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleting}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {batchDeleting ? (
                  <span className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                Eliminar seleccionados
              </button>
            </div>
          )}

          <div className="space-y-2">
            {recordings.map((r) => (
              <div
                key={r.id}
                className={`rounded-xl border flex items-center gap-3 px-4 py-3 transition-all ${
                  batchSelected.has(r.id)
                    ? "border-red-500/40 bg-red-500/5 cursor-pointer"
                    : selectedRecordingId === r.id ? "border-violet-500/50 bg-violet-500/5" : batchMode ? "cursor-pointer" : ""
                }`}
                style={!batchSelected.has(r.id) && selectedRecordingId !== r.id
                  ? { background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }
                  : { boxShadow: "var(--shadow-card)" }}
                onClick={batchMode ? () => toggleBatchSelect(r.id) : undefined}
              >
                {batchMode ? (
                  batchSelected.has(r.id)
                    ? <CheckSquare className="w-4 h-4 shrink-0 text-red-500" />
                    : <Square className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                ) : (
                  <FileAudio className="w-4 h-4 shrink-0 text-violet-400" />
                )}

                {editingId === r.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(r.id); if (e.key === "Escape") cancelEdit(); }}
                      className="flex-1 text-sm px-2 py-1 rounded-lg border focus:outline-none focus:border-violet-500/50"
                      style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
                      autoFocus
                    />
                    <button onClick={() => confirmEdit(r.id)} className="text-emerald-500 hover:text-emerald-400"><Check className="w-4 h-4" /></button>
                    <button onClick={cancelEdit} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>{r.filename}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-m)" }}>
                      {new Date(r.created_at).toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}

                {/* Badge transcrito */}
                {r.transcribed && editingId !== r.id && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Transcrito
                  </span>
                )}
                {!r.transcribed && editingId !== r.id && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/25 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> Pendiente
                  </span>
                )}

                {/* Actions */}
                {editingId !== r.id && !batchMode && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSelectAndNavigate(r.id, r.filename, "transcriptions")}
                      title="Transcribir"
                      className="p-1.5 rounded-lg hover:bg-violet-500/10 hover:text-violet-500 transition-colors"
                      style={{ color: "var(--text-m)" }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEdit(r)}
                      title="Renombrar"
                      className="p-1.5 rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                      style={{ color: "var(--text-m)" }}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      title="Eliminar"
                      className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      style={{ color: "var(--text-m)" }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}

