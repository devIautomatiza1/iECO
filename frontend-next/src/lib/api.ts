/** api.ts — Cliente centralizado para la FastAPI de iECO */

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── helpers ──────────────────────────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ieco_token");
}

export function setToken(t: string) {
  localStorage.setItem("ieco_token", t);
}

export function removeToken() {
  localStorage.removeItem("ieco_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(String(err.detail ?? "Error de servidor"));
  }
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  company: string;
  role: string;
}

export interface Recording {
  id: number;
  filename: string;
  transcribed: boolean;
  created_at: string;
}

export interface Opportunity {
  id: number;
  recording_id: number;
  title: string;
  description: string;
  status: string;      // 'open' | 'closed'
  priority: string;    // 'high' | 'medium' | 'low'
  assignee: string;
  deadline: string;
  notes: string;
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  time?: string;
}

export interface Stats {
  total_recordings: number;
  transcribed: number;
  open_tickets: number;
  closed_tickets: number;
  high_priority: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  request<{ token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (email: string, password: string, name: string, company: string) =>
  request<{ token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, name, company }),
  });

export const getMe = () => request<User>("/api/auth/me");

// ─── Stats ────────────────────────────────────────────────────────────────────
export const getStats = () => request<Stats>("/api/stats");

// ─── Recordings ───────────────────────────────────────────────────────────────
export const getRecordings = () => request<Recording[]>("/api/recordings");

export async function uploadRecording(file: File): Promise<{ id: number; filename: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API}/api/recordings/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(String(err.detail ?? "Error al subir"));
  }
  return res.json();
}

/** Descarga el audio como Blob y devuelve una objectURL para el <audio> element */
export async function fetchAudioObjectURL(recordingId: number): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API}/api/recordings/${recordingId}/audio`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo cargar el audio");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export const deleteRecording = (id: number) =>
  request<{ ok: boolean }>(`/api/recordings/${id}`, { method: "DELETE" });

export const renameRecording = (id: number, filename: string) =>
  request<{ ok: boolean }>(`/api/recordings/${id}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ filename }),
  });

// ─── Transcription ────────────────────────────────────────────────────────────
export const getTranscription = (recordingId: number) =>
  request<{ transcription: string }>(`/api/recordings/${recordingId}/transcription`);

export async function transcribeRecording(recordingId: number): Promise<{ transcription: string }> {
  // Inicia el job en background (devuelve inmediatamente sin timeout de proxy)
  const { job_id } = await request<{ job_id: string; status: string }>(
    `/api/recordings/${recordingId}/transcribe`,
    { method: "POST" },
  );
  // Polling cada 5s hasta 10 minutos
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const job = await request<{ status: string; transcription?: string; error?: string }>(
      `/api/transcription-jobs/${job_id}`,
    );
    if (job.status === "completed" && job.transcription) return { transcription: job.transcription };
    if (job.status === "error") throw new Error(job.error ?? "Error al transcribir");
  }
  throw new Error("Tiempo agotado. El archivo es muy largo, intenta de nuevo.");
}

// ─── Opportunities / Tickets ──────────────────────────────────────────────────
export const getOpportunities = (recordingId: number) =>
  request<Opportunity[]>(`/api/recordings/${recordingId}/opportunities`);

export const analyzeOpportunities = (recordingId: number) =>
  request<{ tickets: Opportunity[]; count: number }>(
    `/api/recordings/${recordingId}/analyze`,
    { method: "POST" },
  );

export const updateOpportunity = (id: number, data: Partial<Opportunity>) =>
  request<{ ok: boolean }>(`/api/opportunities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteOpportunity = (id: number) =>
  request<{ ok: boolean }>(`/api/opportunities/${id}`, { method: "DELETE" });

// ─── Chat ─────────────────────────────────────────────────────────────────────
export const sendChatMessage = (
  question: string,
  recordingId?: number,
  history?: ChatMessage[],
) =>
  request<{ response: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ question, recording_id: recordingId, history }),
  });

// ─── Admin ────────────────────────────────────────────────────────────────────
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  company: string;
  active: boolean;
  created_at: string;
}

export const getAdminUsers = () => request<AdminUser[]>("/api/admin/users");

export const createAdminUser = (data: {
  email: string; password: string; name: string; role: string; company: string;
}) => request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(data) });

export const toggleAdminUser = (id: number, active: boolean) =>
  request<{ ok: boolean }>(`/api/admin/users/${id}/toggle`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });

export const deleteAdminUser = (id: number) =>
  request<{ ok: boolean }>(`/api/admin/users/${id}`, { method: "DELETE" });

// ─── Summary ──────────────────────────────────────────────────────────────────
export const generateSummary = (recordingId: number) =>
  request<{ summary: string }>(`/api/recordings/${recordingId}/summary`, { method: "POST" });

// ─── Keywords Dictionary ──────────────────────────────────────────────────────
export interface KeywordCategory {
  prioridad: "high" | "medium" | "low";
  descripcion: string;
  variantes: string[];
}

export interface KeywordsConfig {
  modelo_gemini: string;
  idioma_analisis: string;
  detectar_intenciones: boolean;
  minimo_confianza: number;
}

export interface KeywordsDict {
  temas_de_interes: Record<string, KeywordCategory>;
  configuracion: KeywordsConfig;
}

export const getKeywords = () => request<KeywordsDict>("/api/keywords");

export const updateKeywords = (data: KeywordsDict) =>
  request<{ ok: boolean }>("/api/keywords", {
    method: "PUT",
    body: JSON.stringify(data),
  });
