"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import DashboardModule from "@/components/DashboardModule";
import AudioModule from "@/components/AudioModule";
import TranscriptionModule from "@/components/TranscriptionModule";
import TicketsModule from "@/components/TicketsModule";
import ChatModule from "@/components/ChatModule";
import AdminModule from "@/components/AdminModule";
import SettingsModule from "@/components/SettingsModule";
import { FileAudio, AlignLeft, MessageSquare, Tag, X } from "lucide-react";

const SUPERADMIN_EMAILS = ["infra@iautomatiza.net", "dev@iautomatiza.net"];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | null>(null);
  const [selectedRecordingName, setSelectedRecordingName] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--app-bg)" }}>
        <div className="w-6 h-6 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const isSuperAdmin = SUPERADMIN_EMAILS.includes(user.email);

  const handleSelectRecording = (id: number, name?: string) => {
    setSelectedRecordingId(id);
    if (name !== undefined) setSelectedRecordingName(name);
  };

  const clearSelection = () => {
    setSelectedRecordingId(null);
    setSelectedRecordingName(null);
  };

  const renderModule = () => {
    switch (activeTab) {
      case "audio":
        return (
          <AudioModule
            onSelectRecording={handleSelectRecording}
            selectedRecordingId={selectedRecordingId}
            onNavigate={setActiveTab}
          />
        );
      case "transcriptions":
        return (
          <TranscriptionModule
            recordingId={selectedRecordingId}
            onSelectRecording={handleSelectRecording}
          />
        );
      case "tickets":
        return (
          <TicketsModule
            recordingId={selectedRecordingId}
            onSelectRecording={handleSelectRecording}
          />
        );
      case "chat":
        return (
          <ChatModule
            recordingId={selectedRecordingId}
            onSelectRecording={handleSelectRecording}
          />
        );
      case "admin":
        return <AdminModule currentUserEmail={user.email} />;
      case "settings":
        return <SettingsModule isSuperAdmin={isSuperAdmin} />;
      default:
        return (
          <DashboardModule
            onNavigate={setActiveTab}
            onSelectRecording={handleSelectRecording}
          />
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto" style={{ color: "var(--text-b)" }}>
        <div className="max-w-4xl mx-auto px-6 pt-18 pb-24 md:pt-8">
          {renderModule()}
        </div>
      </main>

      {/* Indicador de audio seleccionado */}
      {selectedRecordingId && (
        <div
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-xl"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border-med)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          }}
        >
          {/* Dot activo */}
          <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-m)" }}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <FileAudio className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[180px] truncate font-semibold" style={{ color: "var(--text-h)" }}>
              {selectedRecordingName ?? `Audio #${selectedRecordingId}`}
            </span>
          </span>

          {/* Separador */}
          <span className="w-px h-4 shrink-0" style={{ background: "var(--border-med)" }} />

          {/* Accesos rápidos */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("transcriptions")}
              title="Ver transcripción"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "transcriptions"
                  ? "bg-violet-500/15 text-violet-500"
                  : "hover:bg-[var(--hover-bg)]"
              }`}
              style={activeTab !== "transcriptions" ? { color: "var(--text-m)" } : undefined}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Transcripción</span>
            </button>
            <button
              onClick={() => setActiveTab("tickets")}
              title="Ver tickets"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "tickets"
                  ? "bg-violet-500/15 text-violet-500"
                  : "hover:bg-[var(--hover-bg)]"
              }`}
              style={activeTab !== "tickets" ? { color: "var(--text-m)" } : undefined}
            >
              <Tag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tickets</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              title="Chat con IA"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                activeTab === "chat"
                  ? "bg-violet-500/15 text-violet-500"
                  : "hover:bg-[var(--hover-bg)]"
              }`}
              style={activeTab !== "chat" ? { color: "var(--text-m)" } : undefined}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>
          </div>

          {/* Cerrar */}
          <button
            onClick={clearSelection}
            className="p-1 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-colors"
            style={{ color: "var(--text-m)" }}
            title="Deseleccionar audio"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
