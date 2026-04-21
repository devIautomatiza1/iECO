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

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRecordingId, setSelectedRecordingId] = useState<number | null>(null);

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

  const handleSelectRecording = (id: number) => {
    setSelectedRecordingId(id);
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
        return (
          <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-m)" }}>
            Ajustes próximamente
          </div>
        );
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
        <div className="max-w-4xl mx-auto px-6 py-8">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}
