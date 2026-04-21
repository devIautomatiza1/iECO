"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardModule from "@/components/DashboardModule";
import AudioModule from "@/components/AudioModule";
import TranscriptionModule from "@/components/TranscriptionModule";
import TicketsModule from "@/components/TicketsModule";
import ChatModule from "@/components/ChatModule";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");

  const renderModule = () => {
    switch (activeTab) {
      case "audio": return <AudioModule />;
      case "transcriptions": return <TranscriptionModule />;
      case "tickets": return <TicketsModule />;
      case "chat": return <ChatModule />;
      case "settings": return <div className="flex items-center justify-center h-64 text-slate-500 text-sm">Ajustes proximamente</div>;
      default: return <DashboardModule />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0b0f1a]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {renderModule()}
        </div>
      </main>
    </div>
  );
}