"use client";
import { useState, useEffect } from "react";
import {
  Settings, Plus, Trash2, Edit3, Save, X, ChevronDown, ChevronUp,
  Loader2, Tag, AlertCircle, CheckCircle2,
} from "lucide-react";
import { getKeywords, updateKeywords, KeywordsDict, KeywordCategory } from "@/lib/api";

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  high:   { label: "Alta",   cls: "text-red-500 border-red-500/30 bg-red-500/10"    },
  medium: { label: "Media",  cls: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  low:    { label: "Baja",   cls: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" },
};

interface SettingsModuleProps {
  isSuperAdmin: boolean;
}

export default function SettingsModule({ isSuperAdmin }: SettingsModuleProps) {
  const [data, setData] = useState<KeywordsDict | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  // Edit state for a category
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ nombre: string; prioridad: "high" | "medium" | "low"; descripcion: string; variantes: string[] }>({
    nombre: "", prioridad: "medium", descripcion: "", variantes: [],
  });
  const [variantInput, setVariantInput] = useState("");

  // New category form visibility
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<{ nombre: string; prioridad: "high" | "medium" | "low"; descripcion: string; variantes: string[] }>({
    nombre: "", prioridad: "medium", descripcion: "", variantes: [],
  });
  const [newVariantInput, setNewVariantInput] = useState("");

  useEffect(() => {
    getKeywords()
      .then(setData)
      .catch(() => setError("Error al cargar el diccionario"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      await updateKeywords(data);
      setSuccessMsg("Diccionario guardado correctamente");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit category helpers ────────────────────────────────────────────────
  const startEdit = (nombre: string, cat: KeywordCategory) => {
    setEditingCat(nombre);
    setEditForm({ nombre, prioridad: cat.prioridad, descripcion: cat.descripcion ?? "", variantes: [...cat.variantes] });
    setVariantInput("");
    setExpandedCat(nombre);
  };

  const cancelEdit = () => {
    setEditingCat(null);
    setVariantInput("");
  };

  const saveEdit = () => {
    if (!data || !editingCat) return;
    const newTemas = { ...data.temas_de_interes };
    // If name changed, remove old key and add new
    if (editForm.nombre !== editingCat) {
      delete newTemas[editingCat];
    }
    newTemas[editForm.nombre] = {
      prioridad: editForm.prioridad,
      descripcion: editForm.descripcion,
      variantes: editForm.variantes,
    };
    setData({ ...data, temas_de_interes: newTemas });
    setEditingCat(null);
    setVariantInput("");
  };

  const deleteCategory = (nombre: string) => {
    if (!data) return;
    const newTemas = { ...data.temas_de_interes };
    delete newTemas[nombre];
    setData({ ...data, temas_de_interes: newTemas });
  };

  const addVariantToEdit = () => {
    const v = variantInput.trim().toLowerCase();
    if (!v || editForm.variantes.includes(v)) return;
    setEditForm((f) => ({ ...f, variantes: [...f.variantes, v] }));
    setVariantInput("");
  };

  const removeVariantFromEdit = (v: string) => {
    setEditForm((f) => ({ ...f, variantes: f.variantes.filter((x) => x !== v) }));
  };

  // ─── New category helpers ─────────────────────────────────────────────────
  const addVariantToNew = () => {
    const v = newVariantInput.trim().toLowerCase();
    if (!v || newForm.variantes.includes(v)) return;
    setNewForm((f) => ({ ...f, variantes: [...f.variantes, v] }));
    setNewVariantInput("");
  };

  const removeVariantFromNew = (v: string) => {
    setNewForm((f) => ({ ...f, variantes: f.variantes.filter((x) => x !== v) }));
  };

  const saveNewCategory = () => {
    if (!data || !newForm.nombre.trim()) return;
    const newTemas = {
      ...data.temas_de_interes,
      [newForm.nombre.trim()]: {
        prioridad: newForm.prioridad,
        descripcion: newForm.descripcion,
        variantes: newForm.variantes,
      },
    };
    setData({ ...data, temas_de_interes: newTemas });
    setNewForm({ nombre: "", prioridad: "medium", descripcion: "", variantes: [] });
    setNewVariantInput("");
    setShowNewForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    );
  }

  const temas = data?.temas_de_interes ?? {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: "var(--text-h)" }}>Configuración</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-b)" }}>
          Diccionario de keywords para detección automática de tickets
        </p>
      </div>
      {isSuperAdmin && (
        <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowNewForm((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-600/10 border border-violet-500/25 text-violet-500 hover:bg-violet-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva categoría
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border bg-red-500/10 border-red-500/25 text-red-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/25 text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {successMsg}
        </div>
      )}

      {!isSuperAdmin && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border bg-amber-500/10 border-amber-500/25 text-amber-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Solo los superadmins pueden editar el diccionario. Vista de solo lectura.
        </div>
      )}

      {/* New category form */}
      {showNewForm && isSuperAdmin && (
        <div
          className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Nueva categoría</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre *</label>
              <input
                value={newForm.nombre}
                onChange={(e) => setNewForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Soporte técnico"
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Prioridad</label>
              <select
                value={newForm.prioridad}
                onChange={(e) => setNewForm((f) => ({ ...f, prioridad: e.target.value as "high" | "medium" | "low" }))}
                className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
              >
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Descripción</label>
            <input
              value={newForm.descripcion}
              onChange={(e) => setNewForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Descripción breve de la categoría"
              className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
              style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Palabras clave / variantes</label>
            <div className="flex gap-2">
              <input
                value={newVariantInput}
                onChange={(e) => setNewVariantInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariantToNew(); } }}
                placeholder="Escribe una variante y presiona Enter"
                className="flex-1 px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
              />
              <button onClick={addVariantToNew} className="px-3 py-2 text-sm rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-500 hover:bg-violet-600/25 transition-all">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {newForm.variantes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {newForm.variantes.map((v) => (
                  <span key={v} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-500">
                    {v}
                    <button onClick={() => removeVariantFromNew(v)} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewForm(false)} className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-red-500/10 text-red-500 border-red-500/25">
              Cancelar
            </button>
            <button
              onClick={saveNewCategory}
              disabled={!newForm.nombre.trim()}
              className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 transition-all"
            >
              Agregar categoría
            </button>
          </div>
        </div>
      )}

      {/* Categories list */}
      <div className="space-y-3">
        {Object.entries(temas).map(([nombre, cat]) => {
          const pStyle = PRIORITY_LABELS[cat.prioridad] ?? PRIORITY_LABELS.medium;
          const isExpanded = expandedCat === nombre;
          const isEditing = editingCat === nombre;

          return (
            <div
              key={nombre}
              className="rounded-2xl border overflow-hidden transition-all"
              style={{ background: "var(--card-bg)", borderColor: "var(--border-color)", boxShadow: "var(--shadow-card)" }}
            >
              {/* Category header */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-violet-500/3 transition-all"
                onClick={() => setExpandedCat(isExpanded ? null : nombre)}
              >
                <Tag className="w-4 h-4 text-violet-400 shrink-0" />
                <span className="flex-1 text-sm font-semibold" style={{ color: "var(--text-h)" }}>{nombre}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pStyle.cls}`}>
                  {pStyle.label}
                </span>
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-500">
                  {cat.variantes.length} variantes
                </span>
                {isSuperAdmin && (
                  <div className="flex gap-1 ml-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => startEdit(nombre, cat)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-indigo-500/15 text-indigo-500 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteCategory(nombre)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/15 text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                ) : (
                  <ChevronDown className="w-4 h-4 shrink-0" style={{ color: "var(--text-m)" }} />
                )}
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "var(--border-color)" }}>
                  {isEditing ? (
                    /* Edit form */
                    <div className="space-y-3 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Nombre</label>
                          <input
                            value={editForm.nombre}
                            onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                            style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Prioridad</label>
                          <select
                            value={editForm.prioridad}
                            onChange={(e) => setEditForm((f) => ({ ...f, prioridad: e.target.value as "high" | "medium" | "low" }))}
                            className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                            style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
                          >
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Baja</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Descripción</label>
                        <input
                          value={editForm.descripcion}
                          onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                          style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium" style={{ color: "var(--text-m)" }}>Variantes</label>
                        <div className="flex gap-2">
                          <input
                            value={variantInput}
                            onChange={(e) => setVariantInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariantToEdit(); } }}
                            placeholder="Agregar variante y presionar Enter"
                            className="flex-1 px-3 py-2 text-sm rounded-xl border outline-none focus:border-violet-500/60 transition-all"
                            style={{ background: "var(--surface)", borderColor: "var(--border-color)", color: "var(--text-h)" }}
                          />
                          <button onClick={addVariantToEdit} className="px-3 py-2 text-sm rounded-xl bg-violet-600/15 border border-violet-500/25 text-violet-500 hover:bg-violet-600/25 transition-all">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {editForm.variantes.map((v) => (
                            <span key={v} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-500">
                              {v}
                              <button onClick={() => removeVariantFromEdit(v)} className="hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg border transition-all hover:bg-red-500/10 text-red-500 border-red-500/25">
                          Cancelar
                        </button>
                        <button onClick={saveEdit} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all">
                          Guardar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="space-y-3 pt-4">
                      {cat.descripcion && (
                        <p className="text-xs" style={{ color: "var(--text-m)" }}>{cat.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {cat.variantes.map((v) => (
                          <span key={v} className="text-xs px-2 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/8 text-violet-400">
                            {v}
                          </span>
                        ))}
                        {cat.variantes.length === 0 && (
                          <span className="text-xs" style={{ color: "var(--text-m)" }}>Sin variantes definidas</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Configuration block */}
      {data?.configuracion && (
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--card-bg)", borderColor: "var(--border-color)" }}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Configuración del motor</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Modelo", value: data.configuracion.modelo_gemini },
              { label: "Idioma", value: data.configuracion.idioma_analisis },
              { label: "Detectar intenciones", value: data.configuracion.detectar_intenciones ? "Sí" : "No" },
              { label: "Confianza mínima", value: String(data.configuracion.minimo_confianza) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 border" style={{ background: "var(--surface)", borderColor: "var(--border-color)" }}>
                <div className="text-[10px] font-medium uppercase tracking-wide mb-1" style={{ color: "var(--text-m)" }}>{label}</div>
                <div className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
