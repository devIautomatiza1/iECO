"use client";
import { useState, useRef } from "react";
import { Send, Sparkles, User, RotateCcw, FileAudio } from "lucide-react";

interface Message {
  role: "assistant" | "user";
  content: string;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "Hola, soy tu asistente de análisis. Estoy aquí para ayudarte a entender tu reunión y extraer información relevante. Cuéntame qué te gustaría analizar.",
    time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
  },
];

const MOCK_RESPONSES: Record<string, string> = {
  default: "He analizado la transcripción. Detecté 3 tareas asignadas, 2 decisiones estratégicas y 1 oportunidad de venta por valor de 240.000€. ¿Quieres que profundice en algún aspecto concreto?",
  resumen: "Resumen ejecutivo:\n\n• ✅ KPIs Q1: +18% sobre objetivo\n• 🎯 3 oportunidades en pipeline avanzado (240K€)\n• 📋 Demo técnica para cliente premium (deadline viernes)\n• 📊 Propuesta LinkedIn Ads enterprise para jueves\n• 📄 Informe pipeline Q2 para el lunes",
  tarea: "Las tareas detectadas son:\n1. Miguel R. → Demo técnica cliente premium (viernes)\n2. Carlos L. → Propuesta ROI LinkedIn Ads (jueves)\n3. Carlos L. → Informe pipeline Q2 (lunes)",
};

const QUICK_PROMPTS = ["Resumen ejecutivo", "Tareas asignadas", "Oportunidades de venta", "Próximos pasos"];

const getResponse = (msg: string): string => {
  const lower = msg.toLowerCase();
  if (lower.includes("resumen")) return MOCK_RESPONSES.resumen;
  if (lower.includes("tarea") || lower.includes("asign")) return MOCK_RESPONSES.tarea;
  return MOCK_RESPONSES.default;
};

export default function ChatModule() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg: Message = {
      role: "user",
      content,
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const aiMsg: Message = {
      role: "assistant",
      content: getResponse(content),
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Asistente IA</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border" style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-m)" }}>
              <FileAudio className="w-3 h-3" />
              20260415_132659.m4a
            </span>
          </div>
        </div>
        <button
          onClick={() => setMessages(INITIAL_MESSAGES)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:bg-[var(--hover-bg)]"
          style={{ borderColor: "var(--border-color)", color: "var(--text-m)", background: "var(--surface)" }}
        >
          <RotateCcw className="w-3 h-3" /> Nueva conversación
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-sm shadow-violet-600/30">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-tr-sm shadow-sm shadow-violet-600/30"
                  : "rounded-tl-sm border"
              }`}
              style={msg.role !== "user"
                ? { background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-b)", boxShadow: "var(--shadow-card)" }
                : undefined}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
              <p className={`text-[10px] mt-2 ${msg.role === "user" ? "text-violet-200/60 text-right" : ""}`}
                style={msg.role === "assistant" ? { color: "var(--text-m)" } : undefined}>
                {msg.time}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 border" style={{ background: "var(--surface)", borderColor: "var(--border-color)" }}>
                <User className="w-3.5 h-3.5" style={{ color: "var(--text-m)" }} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-600/30">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3.5 flex gap-1.5 items-center border"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
            >
              {[0, 1, 2].map((j) => (
                <span
                  key={j}
                  className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce opacity-60"
                  style={{ animationDelay: `${j * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 pb-3">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-xl border font-medium transition-all hover:bg-[var(--hover-bg)] hover:border-violet-500/30"
              style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-b)" }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-2 rounded-2xl border" style={{ background: "var(--card-bg)", borderColor: "var(--border-med)", boxShadow: "var(--shadow-card)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Escribe tu pregunta o solicitud de análisis…"
          className="flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none placeholder:text-[var(--text-m)]"
          style={{ color: "var(--text-b)" }}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0 shadow-sm shadow-violet-600/30"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
