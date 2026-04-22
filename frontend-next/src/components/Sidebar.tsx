"use client";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import {
  Mic, LayoutDashboard, FileText, Ticket,
  MessageSquare, Settings, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, User, ShieldCheck, Menu, X
} from "lucide-react";

const SUPERADMIN_EMAILS = ["infra@iautomatiza.net", "dev@iautomatiza.net"];

const baseNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Mic, label: "Grabaciones", id: "audio" },
  { icon: FileText, label: "Transcripciones", id: "transcriptions" },
  { icon: Ticket, label: "Tickets", id: "tickets" },
  { icon: MessageSquare, label: "Asistente IA", id: "chat" },
  { icon: Settings, label: "Ajustes", id: "settings" },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const isSuperAdmin = user && SUPERADMIN_EMAILS.includes(user.email);
  const navItems = isSuperAdmin
    ? [...baseNavItems, { icon: ShieldCheck, label: "Admin", id: "admin" }]
    : baseNavItems;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ===== MÓVIL: barra superior + drawer ===== */}
      <div className="md:hidden">
        {/* Barra superior fija */}
        <div
          className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <Image src="/logo.png" alt="iECO" width={32} height={32} className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-h)" }}>iECO</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg transition-all hover:bg-[var(--hover-bg)]"
            style={{ color: "var(--text-b)" }}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Overlay oscuro */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Panel del drawer */}
        <div
          className={`fixed top-0 left-0 z-40 h-full w-64 flex flex-col border-r transform transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-color)" }}
        >
          {/* Cabecera del drawer */}
          <div
            className="flex items-center justify-between px-4 py-5 border-b"
            style={{ borderColor: "var(--border-color)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
                <Image src="/logo.png" alt="iECO" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-h)" }}>iECO</span>
            </div>
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg hover:bg-[var(--hover-bg)]"
              style={{ color: "var(--text-m)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                onClick={() => handleTabChange(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  activeTab === id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "hover:bg-[var(--hover-bg)]"
                }`}
                style={activeTab !== id ? { color: "var(--text-b)" } : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Footer del drawer */}
          <div
            className="px-2 pb-3 border-t pt-3 space-y-1"
            style={{ borderColor: "var(--border-color)" }}
          >
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <User className="w-3 h-3 text-violet-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-h)" }}>{user.name || user.email}</p>
                  {user.company && <p className="text-[10px] truncate" style={{ color: "var(--text-m)" }}>{user.company}</p>}
                </div>
              </div>
            )}
            {mounted && (
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                title={isDark ? "Modo claro" : "Modo oscuro"}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[var(--hover-bg)]"
                style={{ color: "var(--text-m)" }}
              >
                {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
                <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:text-red-500 hover:bg-red-500/10 transition-all"
              style={{ color: "var(--text-m)" }}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== TABLET / ESCRITORIO: sidebar izquierdo ===== */}
      <aside
        className={`relative hidden md:flex flex-col h-screen border-r transition-all duration-300 shrink-0 ${
          collapsed ? "w-16" : "w-56"
        }`}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--border-color)" }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-4 py-5 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
            <Image src="/logo.png" alt="iECO" width={32} height={32} className="w-full h-full object-contain" />
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
                  ? "bg-violet-600 text-white shadow-sm"
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
          {user && !collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-h)" }}>{user.name || user.email}</p>
                {user.company && <p className="text-[10px] truncate" style={{ color: "var(--text-m)" }}>{user.company}</p>}
              </div>
            </div>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              title={isDark ? "Modo claro" : "Modo oscuro"}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:bg-[var(--hover-bg)]"
              style={{ color: "var(--text-m)" }}
            >
              {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
              {!collapsed && <span>{isDark ? "Modo claro" : "Modo oscuro"}</span>}
            </button>
          )}
          <button
            onClick={handleLogout}
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
    </>
  );
}

