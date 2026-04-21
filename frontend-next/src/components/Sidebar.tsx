"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Mic, LayoutDashboard, FileText, Ticket,
  MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight, Zap,
  Sun, Moon, Monitor
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Mic, label: "Grabaciones", id: "audio" },
  { icon: FileText, label: "Transcripciones", id: "transcriptions" },
  { icon: Ticket, label: "Tickets", id: "tickets" },
  { icon: MessageSquare, label: "Asistente IA", id: "chat" },
  { icon: Settings, label: "Ajustes", id: "settings" },
];

const THEME_CYCLE: Record<string, { next: string; icon: React.ElementType; label: string }> = {
  light:  { next: "dark",   icon: Moon,    label: "Modo oscuro"   },
  dark:   { next: "system", icon: Monitor, label: "Según sistema" },
  system: { next: "light",  icon: Sun,     label: "Modo claro"    },
};

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const current = theme ?? "system";
  const cycleInfo = THEME_CYCLE[current] ?? THEME_CYCLE.system;
  const ThemeIcon = cycleInfo.icon;

  return (
    <aside
      className={`relative flex flex-col h-screen border-r transition-all duration-300 shrink-0 ${
        collapsed ? "w-16" : "w-56"
      }`}
      style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-h)" }}>iECO</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, id }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === id
                ? "bg-violet-600/20 text-violet-600 dark:text-violet-300 border border-violet-600/30"
                : "hover:bg-[var(--hover-bg)]"
            }`}
            style={activeTab !== id ? { color: "var(--text-b)" } : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-2 pb-3 border-t pt-3 space-y-1"
        style={{ borderColor: "var(--border-color)" }}
      >
        {/* Toggle de tema */}
        {mounted && (
          <button
            onClick={() => setTheme(cycleInfo.next)}
            title={cycleInfo.label}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[var(--hover-bg)]"
            style={{ color: "var(--text-m)" }}
          >
            <ThemeIcon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{cycleInfo.label}</span>}
          </button>
        )}

        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:text-red-500 hover:bg-red-500/10 transition-all"
          style={{ color: "var(--text-m)" }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full border flex items-center justify-center transition-colors z-10 hover:text-violet-500"
        style={{
          background: "var(--collapse-btn-bg)",
          borderColor: "var(--border-med)",
          color: "var(--text-m)",
        }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
