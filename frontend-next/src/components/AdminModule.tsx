"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Users, UserPlus, Trash2, ToggleLeft, ToggleRight, Shield, RefreshCw, Eye, EyeOff
} from "lucide-react";
import {
  getAdminUsers, createAdminUser, toggleAdminUser, deleteAdminUser, AdminUser,
} from "@/lib/api";

const SUPERADMIN_EMAILS = ["infra@iautomatiza.net", "dev@iautomatiza.net"];

interface AdminModuleProps {
  currentUserEmail: string;
}

export default function AdminModule({ currentUserEmail }: AdminModuleProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Create form state
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newCompany, setNewCompany] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleToggle = async (user: AdminUser) => {
    setActionLoading(user.id);
    try {
      await toggleAdminUser(user.id, !user.active);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: !user.active } : u))
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cambiar estado");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: number) => {
    setActionLoading(userId);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar usuario");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!newEmail.trim() || !newPassword || !newName.trim()) {
      setCreateError("Email, nombre y contraseña son obligatorios");
      return;
    }
    setCreateLoading(true);
    try {
      const created = await createAdminUser({
        email: newEmail.trim(),
        password: newPassword,
        name: newName.trim(),
        role: newRole,
        company: newCompany.trim(),
      });
      setUsers((prev) => [{ ...created, created_at: new Date().toISOString() }, ...prev]);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("user"); setNewCompany("");
      setShowCreateForm(false);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Error al crear usuario");
    } finally {
      setCreateLoading(false);
    }
  };

  const inputStyle = {
    background: "var(--surface)",
    borderColor: "var(--border-med)",
    color: "var(--text-b)",
  };
  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-violet-500/60 transition-colors";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>
            Panel de administración
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>
            Gestión de usuarios del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadUsers}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
            style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(""); }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo usuario
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div
          className="rounded-xl border p-5 space-y-4"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>
              Crear nuevo usuario
            </h3>
          </div>

          {createError && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre *</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre completo"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Email *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Empresa</label>
              <input
                type="text"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Nombre empresa"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Rol</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2 relative">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Contraseña *</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={`${inputClass} pr-10`}
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-m)" }}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="col-span-2 flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setCreateError(""); }}
                className="px-4 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-4 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
              >
                {createLoading ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--border-color)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center gap-2"
          style={{ borderColor: "var(--border-color)" }}
        >
          <Users className="w-4 h-4 text-violet-500" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>
            Usuarios registrados
          </h2>
          <span
            className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: "var(--surface)", color: "var(--text-m)" }}
          >
            {users.length} usuarios
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>
            Cargando usuarios...
          </div>
        ) : users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>
            No hay usuarios registrados
          </div>
        ) : (
          <div>
            {users.map((user, i) => (
              <div key={user.id}>
                <div
                  className="flex items-center gap-4 px-5 py-4"
                  style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-violet-500">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>
                        {user.name}
                      </span>
                      {SUPERADMIN_EMAILS.includes(user.email) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                          superadmin
                        </span>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        user.role === "admin"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-slate-500/15 text-slate-400"
                      }`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-m)" }}>
                      {user.email}
                      {user.company && ` · ${user.company}`}
                    </p>
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      user.active
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-red-500/15 text-red-400"
                    }`}>
                      {user.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {user.email !== currentUserEmail && (
                      <button
                        onClick={() => handleToggle(user)}
                        disabled={actionLoading === user.id}
                        title={user.active ? "Desactivar" : "Activar"}
                        className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)] disabled:opacity-50"
                        style={{ borderColor: "var(--border-color)", color: user.active ? "var(--text-m)" : "text-emerald-400" }}
                      >
                        {user.active
                          ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                          : <ToggleLeft className="w-4 h-4" style={{ color: "var(--text-m)" }} />
                        }
                      </button>
                    )}

                    {!SUPERADMIN_EMAILS.includes(user.email) && user.email !== currentUserEmail && (
                      <button
                        onClick={() => setDeleteConfirm(user.id)}
                        disabled={actionLoading === user.id}
                        title="Eliminar usuario"
                        className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === user.id && (
                  <div
                    className="px-5 py-3 border-t"
                    style={{
                      borderColor: "var(--border-color)",
                      background: "var(--surface)",
                    }}
                  >
                    <p className="text-xs mb-2" style={{ color: "var(--text-b)" }}>
                      ¿Eliminar a <strong>{user.email}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {actionLoading === user.id ? "Eliminando..." : "Sí, eliminar"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                        style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
