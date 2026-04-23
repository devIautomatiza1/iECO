"use client";
import { useState, useEffect, FormEvent } from "react";
import {
  Users, UserPlus, Trash2, ToggleLeft, ToggleRight, Shield, RefreshCw,
  Eye, EyeOff, Building2, PlusCircle, ShieldCheck, Pencil, Inbox, CheckCircle, XCircle, X, Mail, Calendar, User, Building, Search,
} from "lucide-react";
import {
  getAdminUsers, createAdminUser, toggleAdminUser, deleteAdminUser, updateAdminUser, AdminUser,
  getCompanies, createCompany, updateCompany, deleteCompany, Company,
  getRegistrationRequests, approveRequest, rejectRequest, deleteRegistrationRequest, RegistrationRequest,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

// ─── helpers ──────────────────────────────────────────────────────────────────
function roleBadge(role: string) {
  const map: Record<string, string> = {
    superadmin: "bg-violet-500/15 text-violet-400",
    company_admin: "bg-amber-500/15 text-amber-400",
    company_user: "bg-slate-500/15 text-slate-400",
  };
  const labels: Record<string, string> = {
    superadmin: "superadmin",
    company_admin: "admin",
    company_user: "usuario",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${map[role] ?? "bg-slate-500/15 text-slate-400"}`}>
      {labels[role] ?? role}
    </span>
  );
}


export default function AdminModule() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "superadmin";

  const [tab, setTab] = useState<"users" | "companies" | "requests">("requests");

  // ── Users state ──────────────────────────────────────────────────────────
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("company_user");
  const [newCompanyId, setNewCompanyId] = useState<number | "">("");
  const [showPwd, setShowPwd] = useState(false);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState("");

  const [userSearch, setUserSearch] = useState("");

  // ── Edit user state ────────────────────────────────────────────────────
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editCompanyId, setEditCompanyId] = useState<number | "">("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  // ── Companies state ────────────────────────────────────────────────────
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState("");
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanySlug, setNewCompanySlug] = useState("");
  const [createCompanyLoading, setCreateCompanyLoading] = useState(false);
  const [createCompanyError, setCreateCompanyError] = useState("");
  const [companyActionLoading, setCompanyActionLoading] = useState<number | null>(null);
  const [deleteCompanyConfirm, setDeleteCompanyConfirm] = useState<number | null>(null);

  // ── Requests state ────────────────────────────────────────────────────
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [requestModal, setRequestModal] = useState<RegistrationRequest | null>(null);
  const [approveEditName, setApproveEditName] = useState("");
  const [approveEditEmail, setApproveEditEmail] = useState("");
  const [approveEditRole, setApproveEditRole] = useState("company_user");
  const [approveEditCompanyId, setApproveEditCompanyId] = useState<number | "">("");
  const [approveLoading, setApproveLoading] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [modalRejectConfirm, setModalRejectConfirm] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState<number | null>(null);

  const inputClass = "w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:border-violet-500/60 transition-colors";
  const inputStyle = { background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" };

  // ── Load data ─────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setUsersLoading(true); setUsersError("");
    try { setUsers(await getAdminUsers()); }
    catch (e: unknown) { setUsersError(e instanceof Error ? e.message : "Error al cargar usuarios"); }
    finally { setUsersLoading(false); }
  };

  const loadCompanies = async () => {
    if (!isSuperAdmin) return;
    setCompaniesLoading(true); setCompaniesError("");
    try { setCompanies(await getCompanies()); }
    catch (e: unknown) { setCompaniesError(e instanceof Error ? e.message : "Error al cargar empresas"); }
    finally { setCompaniesLoading(false); }
  };

  const loadRequests = async () => {
    setRequestsLoading(true); setRequestsError("");
    try { setRequests(await getRegistrationRequests()); }
    catch (e: unknown) { setRequestsError(e instanceof Error ? e.message : "Error al cargar solicitudes"); }
    finally { setRequestsLoading(false); }
  };

  useEffect(() => {
    loadUsers();
    loadRequests();
    if (isSuperAdmin) loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  // ── User actions ───────────────────────────────────────────────────────
  const handleToggleUser = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await toggleAdminUser(u.id, !u.active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
    } catch (e: unknown) { setUsersError(e instanceof Error ? e.message : "Error al cambiar estado"); }
    finally { setActionLoading(null); }
  };

  const handleDeleteUser = async (userId: number) => {
    setActionLoading(userId);
    try {
      await deleteAdminUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirm(null);
    } catch (e: unknown) { setUsersError(e instanceof Error ? e.message : "Error al eliminar usuario"); }
    finally { setActionLoading(null); }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault(); setCreateUserError("");
    if (!newEmail.trim() || !newPassword || !newName.trim()) {
      setCreateUserError("Email, nombre y contraseña son obligatorios"); return;
    }
    if (isSuperAdmin && newCompanyId === "") {
      setCreateUserError("Debes seleccionar una empresa"); return;
    }
    setCreateUserLoading(true);
    try {
      const created = await createAdminUser({
        email: newEmail.trim(), password: newPassword, name: newName.trim(), role: newRole,
        company_id: isSuperAdmin ? (newCompanyId as number) : currentUser?.company_id ?? null,
      });
      setUsers((prev) => [{ ...created, created_at: new Date().toISOString() }, ...prev]);
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("company_user"); setNewCompanyId("");
      setShowCreateUser(false);
    } catch (e: unknown) { setCreateUserError(e instanceof Error ? e.message : "Error al crear usuario"); }
    finally { setCreateUserLoading(false); }
  };

  const openRequestModal = (req: RegistrationRequest) => {
    setRequestModal(req);
    setApproveEditName(req.name);
    setApproveEditEmail(req.email);
    setApproveEditRole("company_user");
    setApproveEditCompanyId("");
    setApproveError("");
    setModalRejectConfirm(false);
  };

  const closeRequestModal = () => {
    setRequestModal(null);
    setApproveError("");
    setModalRejectConfirm(false);
  };

  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!approveEditName.trim() || !approveEditEmail.trim()) {
      setApproveError("Nombre y email son obligatorios"); return;
    }
    if (isSuperAdmin && approveEditCompanyId === "") {
      setApproveError("Debes seleccionar una empresa"); return;
    }
    setApproveLoading(true); setApproveError("");
    try {
      await approveRequest(requestModal!.id, {
        name: approveEditName.trim(),
        email: approveEditEmail.trim(),
        role: approveEditRole,
        company_id: isSuperAdmin ? Number(approveEditCompanyId) : undefined,
      });
      setRequests((prev) => prev.map((r) => r.id === requestModal!.id ? { ...r, status: "approved" as const } : r));
      closeRequestModal();
      loadUsers();
    } catch (e: unknown) { setApproveError(e instanceof Error ? e.message : "Error al aprobar"); }
    finally { setApproveLoading(false); }
  };

  const handleReject = async (id: number) => {
    setRequestActionLoading(id);
    try {
      await rejectRequest(id);
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected" as const } : r));
      closeRequestModal();
    } catch (e: unknown) { setRequestsError(e instanceof Error ? e.message : "Error al rechazar"); }
    finally { setRequestActionLoading(null); }
  };

  const handleDeleteRequest = async (id: number) => {
    setRequestActionLoading(id);
    try {
      await deleteRegistrationRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: unknown) { setRequestsError(e instanceof Error ? e.message : "Error al eliminar"); }
    finally { setRequestActionLoading(null); }
  };

  const openEdit = (u: AdminUser) => {
    setEditUserId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditCompanyId(u.company_id ?? "");
    setEditError("");
    setDeleteConfirm(null);
  };

  const handleEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !editEmail.trim()) {
      setEditError("Nombre y email son obligatorios"); return;
    }
    setEditLoading(true); setEditError("");
    try {
      const updated = await updateAdminUser(editUserId!, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        company_id: isSuperAdmin ? (editCompanyId === "" ? null : Number(editCompanyId)) : undefined,
      });
      setUsers((prev) => prev.map((u) => (u.id === editUserId ? { ...u, ...updated } : u)));
      setEditUserId(null);
    } catch (e: unknown) { setEditError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setEditLoading(false); }
  };

  // ── Company actions ────────────────────────────────────────────────────
  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault(); setCreateCompanyError("");
    if (!newCompanyName.trim() || !newCompanySlug.trim()) {
      setCreateCompanyError("Nombre y slug son obligatorios"); return;
    }
    setCreateCompanyLoading(true);
    try {
      const created = await createCompany(newCompanyName.trim(), newCompanySlug.trim());
      setCompanies((prev) => [created, ...prev]);
      setNewCompanyName(""); setNewCompanySlug(""); setShowCreateCompany(false);
    } catch (e: unknown) { setCreateCompanyError(e instanceof Error ? e.message : "Error al crear empresa"); }
    finally { setCreateCompanyLoading(false); }
  };

  const handleToggleCompany = async (company: Company) => {
    setCompanyActionLoading(company.id);
    try {
      await updateCompany(company.id, { active: !company.active });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, active: !company.active } : c)));
    } catch (e: unknown) { setCompaniesError(e instanceof Error ? e.message : "Error al actualizar empresa"); }
    finally { setCompanyActionLoading(null); }
  };

  const handleDeleteCompany = async (companyId: number) => {
    setCompanyActionLoading(companyId);
    try {
      await deleteCompany(companyId);
      setCompanies((prev) => prev.filter((c) => c.id !== companyId));
      setDeleteCompanyConfirm(null);
    } catch (e: unknown) { setCompaniesError(e instanceof Error ? e.message : "Error al eliminar empresa"); }
    finally { setCompanyActionLoading(null); }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>
          Panel de administración
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>
          {isSuperAdmin ? "Gestión de empresas y usuarios" : "Gestión de usuarios de tu empresa"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface)" }}>
        {/* Solicitudes — visible a todos los admins */}
        <button onClick={() => setTab("requests")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            tab === "requests" ? "bg-violet-600 text-white shadow-sm" : "hover:bg-[var(--hover-bg)]"
          }`}
          style={tab !== "requests" ? { color: "var(--text-m)" } : {}}>
          <Inbox className="w-4 h-4" />
          Solicitudes
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              tab === "requests" ? "bg-white/25 text-white" : "bg-violet-600 text-white"
            }`}>
              {requests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>
        {/* Usuarios */}
        <button onClick={() => setTab("users")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all ${
            tab === "users" ? "bg-violet-600 text-white shadow-sm" : "hover:bg-[var(--hover-bg)]"
          }`}
          style={tab !== "users" ? { color: "var(--text-m)" } : {}}>
          <Users className="w-4 h-4" /> Usuarios
        </button>
        {/* Empresas — solo superadmin */}
        {isSuperAdmin && (
          <button onClick={() => setTab("companies")}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              tab === "companies" ? "bg-violet-600 text-white shadow-sm" : "hover:bg-[var(--hover-bg)]"
            }`}
            style={tab !== "companies" ? { color: "var(--text-m)" } : {}}>
            <Building2 className="w-4 h-4" /> Empresas
          </button>
        )}
      </div>

      {/* ════ USERS TAB ════ */}
      {tab === "users" && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-m)" }} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar por nombre, email o empresa..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:border-violet-500/60 transition-colors"
                style={{ background: "var(--surface)", borderColor: "var(--border-med)", color: "var(--text-b)" }}
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
            <button onClick={loadUsers}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
            <button onClick={() => { setShowCreateUser(!showCreateUser); setCreateUserError(""); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium">
              <UserPlus className="w-3.5 h-3.5" /> Nuevo usuario
            </button>
            </div>
          </div>

          {usersError && <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{usersError}</div>}

          {/* Create user form */}
          {showCreateUser && (
            <div className="rounded-xl border p-5 space-y-4"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Crear nuevo usuario</h3>
              </div>
              {createUserError && <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{createUserError}</div>}
              <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre *</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nombre completo" className={inputClass} style={inputStyle} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Email *</label>
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="usuario@empresa.com" className={inputClass} style={inputStyle} />
                </div>
                {isSuperAdmin ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Empresa *</label>
                    <select value={newCompanyId}
                      onChange={(e) => setNewCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputClass} style={inputStyle}>
                      <option value="">— Selecciona empresa —</option>
                      {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Empresa</label>
                    <div className="px-3 py-2 text-sm rounded-lg border" style={{ ...inputStyle, opacity: 0.7 }}>
                      {currentUser?.company || "Tu empresa"}
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Rol</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    className={inputClass} style={inputStyle}>
                    {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                    <option value="company_admin">Admin de empresa</option>
                    <option value="company_user">Usuario</option>
                  </select>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Contraseña *</label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                      className={`${inputClass} pr-10`} style={inputStyle} />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-m)" }}>
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="col-span-2 flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => { setShowCreateUser(false); setCreateUserError(""); }}
                    className="px-4 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                  <button type="submit" disabled={createUserLoading}
                    className="px-4 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors">
                    {createUserLoading ? "Creando..." : "Crear usuario"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Users list */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-color)" }}>
              <Users className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Usuarios registrados</h2>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface)", color: "var(--text-m)" }}>
                {userSearch
                  ? `${users.filter(u => [u.name, u.email, u.company_name ?? ""].some(f => f.toLowerCase().includes(userSearch.toLowerCase()))).length} / ${users.length} usuarios`
                  : `${users.length} usuarios`}
              </span>
            </div>
            {usersLoading ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>Cargando usuarios...</div>
            ) : users.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>No hay usuarios registrados</div>
            ) : (
              <div>
                {users.filter(u => !userSearch || [u.name, u.email, u.company_name ?? ""].some(f => f.toLowerCase().includes(userSearch.toLowerCase()))).length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>
                    No hay resultados para &ldquo;{userSearch}&rdquo;
                  </div>
                ) : (
                  users
                    .filter(u => !userSearch || [u.name, u.email, u.company_name ?? ""].some(f => f.toLowerCase().includes(userSearch.toLowerCase())))
                    .map((u, i) => (
                    <div key={u.id}>
                      <div className="flex items-center gap-4 px-5 py-4"
                        style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}>
                        <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-violet-500">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>{u.name}</span>
                            {roleBadge(u.role)}
                            {u.company_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-400">
                                {u.company_name}
                              </span>
                            )}
                            {u.role === "superadmin" && <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
                          </div>
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-m)" }}>
                            {u.email}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                          u.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                        {u.role !== "superadmin" && u.id !== currentUser?.id && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => editUserId === u.id ? setEditUserId(null) : openEdit(u)}
                              title="Editar usuario"
                              className={`p-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                                editUserId === u.id
                                  ? "bg-violet-600 border-violet-600 text-white"
                                  : "hover:bg-[var(--hover-bg)]"
                              }`}
                              style={editUserId !== u.id ? { borderColor: "var(--border-color)", color: "var(--text-m)" } : {}}>
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleUser(u)} disabled={actionLoading === u.id}
                              title={u.active ? "Desactivar" : "Activar"}
                              className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)] disabled:opacity-50"
                              style={{ borderColor: "var(--border-color)" }}>
                              {u.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" style={{ color: "var(--text-m)" }} />}
                            </button>
                            <button onClick={() => { setDeleteConfirm(u.id); setEditUserId(null); }} disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Edit panel */}
                      {editUserId === u.id && (
                        <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border-color)", background: "var(--surface)" }}>
                          {editError && <div className="text-xs px-3 py-2 mb-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{editError}</div>}
                          <form onSubmit={handleEditUser} className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre</label>
                              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                                className={inputClass} style={inputStyle} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Email</label>
                              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                                className={inputClass} style={inputStyle} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Rol</label>
                              <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                                className={inputClass} style={inputStyle}>
                                {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                                <option value="company_admin">Admin de empresa</option>
                                <option value="company_user">Usuario</option>
                              </select>
                            </div>
                            {isSuperAdmin && (
                              <div className="space-y-1">
                                <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Empresa</label>
                                <select value={editCompanyId}
                                  onChange={(e) => setEditCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
                                  className={inputClass} style={inputStyle}>
                                  <option value="">— Sin empresa —</option>
                                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                              </div>
                            )}
                            <div className="col-span-2 flex gap-2 justify-end pt-1">
                              <button type="button" onClick={() => setEditUserId(null)}
                                className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                                style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                              <button type="submit" disabled={editLoading}
                                className="px-3 py-1.5 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors">
                                {editLoading ? "Guardando..." : "Guardar cambios"}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                      {/* Delete confirm panel */}
                      {deleteConfirm === u.id && (
                        <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border-color)", background: "var(--surface)" }}>
                          <p className="text-xs mb-2" style={{ color: "var(--text-b)" }}>
                            ¿Eliminar a <strong>{u.email}</strong>? Esta acción no se puede deshacer.
                          </p>
                          <div className="flex gap-2">
                            <button onClick={() => handleDeleteUser(u.id)} disabled={actionLoading === u.id}
                              className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50">
                              {actionLoading === u.id ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                            <button onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                              style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ REQUESTS TAB ════ */}
      {tab === "requests" && (
        <div className="space-y-5">
          <div className="flex justify-end">
            <button onClick={loadRequests}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>

          {requestsError && <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{requestsError}</div>}

          <div className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-color)" }}>
              <Inbox className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Solicitudes de acceso</h2>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface)", color: "var(--text-m)" }}>
                {requests.filter((r) => r.status === "pending").length} pendientes
              </span>
            </div>

            {requestsLoading ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>Cargando solicitudes...</div>
            ) : requests.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>No hay solicitudes</div>
            ) : (
              <div>
                {requests.map((req, i) => (
                  <div key={req.id}>
                    <div className="flex items-center gap-4 px-5 py-4"
                      style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}>
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-violet-500">{req.name.charAt(0).toUpperCase()}</span>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium" style={{ color: "var(--text-h)" }}>{req.name}</span>
                          {req.company && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-500/10 font-medium"
                              style={{ color: "var(--text-m)" }}>{req.company}</span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-m)" }}>
                          {req.email} · {new Date(req.created_at).toLocaleDateString("es-ES")}
                        </p>
                      </div>
                      {/* Status badge */}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                        req.status === "pending"
                          ? "bg-amber-500/15 text-amber-400"
                          : req.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}>
                        {req.status === "pending" ? "Pendiente" : req.status === "approved" ? "Aprobada" : "Rechazada"}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => openRequestModal(req)} title="Ver / editar solicitud"
                          className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)] disabled:opacity-50"
                          style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRequest(req.id)} disabled={requestActionLoading === req.id}
                          title="Eliminar solicitud"
                          className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ COMPANIES TAB (superadmin only) ════ */}
      {tab === "companies" && isSuperAdmin && (
        <div className="space-y-5">
          <div className="flex justify-end gap-2">
            <button onClick={loadCompanies}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
            <button onClick={() => { setShowCreateCompany(!showCreateCompany); setCreateCompanyError(""); }}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors font-medium">
              <Building2 className="w-3.5 h-3.5" /> Nueva empresa
            </button>
          </div>

          {companiesError && <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{companiesError}</div>}

          {showCreateCompany && (
            <div className="rounded-xl border p-5 space-y-4"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-500" />
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Crear nueva empresa</h3>
              </div>
              {createCompanyError && <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{createCompanyError}</div>}
              <form onSubmit={handleCreateCompany} className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre *</label>
                  <input type="text" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="Acme S.A." className={inputClass} style={inputStyle} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>
                    Slug * <span style={{ fontWeight: 400 }}>(solo letras, números y guiones)</span>
                  </label>
                  <input type="text" value={newCompanySlug}
                    onChange={(e) => setNewCompanySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="acme-sa" className={inputClass} style={inputStyle} />
                </div>
                <div className="col-span-2 flex gap-2 justify-end pt-1">
                  <button type="button" onClick={() => { setShowCreateCompany(false); setCreateCompanyError(""); }}
                    className="px-4 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                  <button type="submit" disabled={createCompanyLoading}
                    className="px-4 py-2 text-xs rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors">
                    {createCompanyLoading ? "Creando..." : "Crear empresa"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Companies list */}
          <div className="rounded-xl border overflow-hidden"
            style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--border-color)" }}>
              <Building2 className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Empresas registradas</h2>
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface)", color: "var(--text-m)" }}>{companies.length} empresas</span>
            </div>
            {companiesLoading ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>Cargando empresas...</div>
            ) : companies.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-m)" }}>No hay empresas registradas</div>
            ) : (
              <div>
                {companies.map((c, i) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-4 px-5 py-4"
                      style={i > 0 ? { borderTop: "1px solid var(--border-color)" } : undefined}>
                      <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-violet-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium" style={{ color: "var(--text-h)" }}>{c.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono bg-slate-500/10"
                            style={{ color: "var(--text-m)" }}>{c.slug}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-m)" }}>
                          {c.user_count ?? 0} usuario{(c.user_count ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                        c.active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                        {c.active ? "Activa" : "Inactiva"}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleCompany(c)} disabled={companyActionLoading === c.id}
                          className="p-1.5 rounded-lg border transition-colors hover:bg-[var(--hover-bg)] disabled:opacity-50"
                          style={{ borderColor: "var(--border-color)" }}>
                          {c.active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" style={{ color: "var(--text-m)" }} />}
                        </button>
                        <button onClick={() => setDeleteCompanyConfirm(c.id)} disabled={companyActionLoading === c.id}
                          className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {deleteCompanyConfirm === c.id && (
                      <div className="px-5 py-3 border-t" style={{ borderColor: "var(--border-color)", background: "var(--surface)" }}>
                        <p className="text-xs mb-2" style={{ color: "var(--text-b)" }}>
                          ¿Eliminar empresa <strong>{c.name}</strong>? Solo es posible si no tiene usuarios asignados.
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeleteCompany(c.id)} disabled={companyActionLoading === c.id}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50">
                            {companyActionLoading === c.id ? "Eliminando..." : "Sí, eliminar"}
                          </button>
                          <button onClick={() => setDeleteCompanyConfirm(null)}
                            className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                            style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* ════ REQUEST MODAL ════ */}
    {requestModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) closeRequestModal(); }}>
        <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}>

          {/* Modal header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: "var(--border-color)" }}>
            <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Solicitud de acceso</h2>
              <p className="text-xs" style={{ color: "var(--text-m)" }}>Revisa y edita los datos antes de aprobar</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
              requestModal.status === "pending"
                ? "bg-amber-500/15 text-amber-400"
                : requestModal.status === "approved"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-red-500/15 text-red-400"
            }`}>
              {requestModal.status === "pending" ? "Pendiente" : requestModal.status === "approved" ? "Aprobada" : "Rechazada"}
            </span>
            <button onClick={closeRequestModal}
              className="p-1.5 rounded-lg transition-colors hover:bg-[var(--hover-bg)]"
              style={{ color: "var(--text-m)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Original request info */}
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border-color)", background: "var(--surface)" }}>
            <p className="text-xs font-medium mb-3 uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
              Datos enviados por el solicitante
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2">
                <User className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-m)" }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-m)" }}>Nombre</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-b)" }}>{requestModal.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-m)" }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-m)" }}>Email</p>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-b)" }}>{requestModal.email}</p>
                </div>
              </div>
              {requestModal.company && (
                <div className="flex items-start gap-2">
                  <Building className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-m)" }} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-m)" }}>Empresa indicada</p>
                    <p className="text-sm font-medium" style={{ color: "var(--text-b)" }}>{requestModal.company}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--text-m)" }} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-m)" }}>Fecha</p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-b)" }}>
                    {new Date(requestModal.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit form (only for pending) */}
          {requestModal.status === "pending" && (
            <form onSubmit={handleApprove}>
              <div className="px-6 py-4 space-y-4">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-m)" }}>
                  Configurar cuenta a crear
                </p>
                {approveError && (
                  <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-500">{approveError}</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre *</label>
                    <input type="text" value={approveEditName} onChange={(e) => setApproveEditName(e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Email *</label>
                    <input type="email" value={approveEditEmail} onChange={(e) => setApproveEditEmail(e.target.value)}
                      className={inputClass} style={inputStyle} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Rol</label>
                    <select value={approveEditRole} onChange={(e) => setApproveEditRole(e.target.value)}
                      className={inputClass} style={inputStyle}>
                      {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                      <option value="company_admin">Admin de empresa</option>
                      <option value="company_user">Usuario</option>
                    </select>
                  </div>
                  {isSuperAdmin && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Empresa *</label>
                      <select value={approveEditCompanyId}
                        onChange={(e) => setApproveEditCompanyId(e.target.value === "" ? "" : Number(e.target.value))}
                        className={inputClass} style={inputStyle}>
                        <option value="">— Selecciona empresa —</option>
                        {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 py-4 border-t flex items-center justify-between gap-3"
                style={{ borderColor: "var(--border-color)" }}>
                {/* Reject section */}
                {!modalRejectConfirm ? (
                  <button type="button" onClick={() => setModalRejectConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors font-medium">
                    <XCircle className="w-3.5 h-3.5" /> Rechazar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text-m)" }}>¿Seguro?</span>
                    <button type="button" onClick={() => handleReject(requestModal.id)}
                      disabled={requestActionLoading === requestModal.id}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50">
                      {requestActionLoading === requestModal.id ? "Rechazando..." : "Sí, rechazar"}
                    </button>
                    <button type="button" onClick={() => setModalRejectConfirm(false)}
                      className="px-3 py-1.5 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                      style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>Cancelar</button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={closeRequestModal}
                    className="px-3 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={approveLoading}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {approveLoading ? "Aprobando..." : "Aprobar y crear usuario"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer for non-pending (read-only) */}
          {requestModal.status !== "pending" && (
            <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: "var(--border-color)" }}>
              <button onClick={closeRequestModal}
                className="px-4 py-2 text-xs rounded-lg border transition-colors hover:bg-[var(--hover-bg)]"
                style={{ borderColor: "var(--border-color)", color: "var(--text-m)" }}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}

