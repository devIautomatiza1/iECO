"use client";
import { useState, useRef } from "react";
import { Send, Sparkles, User, RotateCcw } from "lucide-react";

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
  resumen: "**Resumen ejecutivo:**\n\n• ✅ KPIs Q1: +18% sobre objetivo\n• 🎯 3 oportunidades en pipeline avanzado (240K€)\n• 📋 Demo técnica para cliente premium (deadline viernes)\n• 📊 Propuesta LinkedIn Ads enterprise para jueves\n• 📄 Informe pipeline Q2 para el lunes",
  tarea: "Las tareas detectadas son:\n1. **Miguel R.** → Demo técnica cliente premium (viernes)\n2. **Carlos L.** → Propuesta ROI LinkedIn Ads (jueves)\n3. **Carlos L.** → Informe pipeline Q2 (lunes)",
};

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

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      role: "user",
      content: input.trim(),
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const aiMsg: Message = {
      role: "assistant",
      content: getResponse(userMsg.content),
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-h)" }}>Asistente IA</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>Conversando sobre: 20260415_132659.m4a</p>
        </div>
        <button
          onClick={() => setMessages(INITIAL_MESSAGES)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
          style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
        >
          <RotateCcw className="w-3.5 h-3.5" /> Nueva conversación
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm border-transparent"
                  : "rounded-bl-sm"
              }`}
              style={msg.role !== "user" ? { background: "var(--card-bg)", borderColor: "var(--border-color)", color: "var(--text-b)" } : undefined}
            >
              <p className="whitespace-pre-line">{msg.content}</p>
              <p className={`text-[10px] mt-1.5 ${msg.role === "user" ? "text-violet-200/60 text-right" : "text-slate-600"}`}>
                {msg.time}
              </p>
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "var(--surface)" }}>
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center border"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-3 pt-3 border-t" style={{ borderColor: "var(--border-color)" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Escribe tu pregunta o solicitud de análisis…"
          className="flex-1 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-colors border placeholder:text-[var(--text-m)]"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
