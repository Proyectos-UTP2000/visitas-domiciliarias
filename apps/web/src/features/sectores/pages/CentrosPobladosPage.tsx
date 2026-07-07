import { Fragment, useEffect, useMemo, useState } from "react";
import { LuSearch, LuSettings } from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import {
  listCentrosPoblados,
  createCentroPoblado,
  updateCentroPoblado,
  setCentroPobladoActivo,
  archivarCentroPoblado,
} from "../sectores-api";
import type { CentroPobladoRecord, CentroPobladoFormState } from "../sectores-types";
import { emptyCentroPobladoForm, filterCentrosPoblados, toCentroPobladoForm } from "../sectores-utils";

export function CentrosPobladosPage() {
  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [records, setRecords] = useState<CentroPobladoRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<CentroPobladoFormState>(emptyCentroPobladoForm("URBANO"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<CentroPobladoRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filter states
  const [muniFilter, setMuniFilter] = useState("");

  // Context menu state for actions
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Branded custom confirmation modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [groupBy, setGroupBy] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const filteredRecords = useMemo(() => {
    return filterCentrosPoblados(records, query, muniFilter);
  }, [records, query, muniFilter]);

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  const sortedRecords = useMemo(() => {
    if (!sortConfig) return filteredRecords;
    return [...filteredRecords].sort((a: any, b: any) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortConfig.key === "municipalidad") {
        aVal = munisMap[a.municipalidadId] || "";
        bVal = munisMap[b.municipalidadId] || "";
      } else if (sortConfig.key === "poblacion") {
        aVal = a.poblacion ?? -1;
        bVal = b.poblacion ?? -1;
      } else if (sortConfig.key === "latitud") {
        aVal = a.latitud ?? -999;
        bVal = b.latitud ?? -999;
      } else {
        aVal = a[sortConfig.key] || "";
        bVal = b[sortConfig.key] || "";
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase().trim();
      const bStr = String(bVal).toLowerCase().trim();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredRecords, sortConfig, munisMap]);

  const groupedRecords = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, CentroPobladoRecord[]> = {};
    sortedRecords.forEach((r) => {
      let groupKey = "";
      if (groupBy === "municipalidad") {
        groupKey = munisMap[r.municipalidadId] || "Sin Municipalidad";
      } else if (groupBy === "tipo") {
        groupKey = r.tipo === "URBANO" ? "Urbano" : "Rural";
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(r);
    });
    return groups;
  }, [sortedRecords, groupBy, munisMap]);

  function handleSort(key: string) {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  }

  function getSortIcon(key: string) {
    if (!sortConfig || sortConfig.key !== key) return " ↕";
    return sortConfig.direction === "asc" ? " ▲" : " ▼";
  }

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_MUNICIPAL") {
        setMuniFilter(session.user.municipalidadId || "");
      }
    }
    void loadData();

    // Click outside handler for context menu
    function handleOutsideClick() {
      setActiveMenuId(null);
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [cpData, munisData] = await Promise.all([
        listCentrosPoblados(),
        listMunicipalidades(),
      ]);
      setRecords(cpData);
      setMunicipalidades(munisData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los centros poblados.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleAddClick(tipo: "URBANO" | "RURAL") {
    setError(null);
    setMessage(null);
    setViewingRecord(null);

    const defaultMuniId = user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : "";

    setForm({
      ...emptyCentroPobladoForm(tipo),
      municipalidadId: defaultMuniId,
    });
    setIsFormOpen(true);
  }

  function handleEditClick(record: CentroPobladoRecord) {
    setError(null);
    setMessage(null);
    setViewingRecord(record);
    setForm(toCentroPobladoForm(record));
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.municipalidadId) {
      setError("Debe seleccionar una municipalidad.");
      return;
    }
    if (!form.nombre.trim()) {
      setError("El nombre es requerido.");
      return;
    }

    setIsSaving(true);
    try {
      if (viewingRecord) {
        const updated = await updateCentroPoblado(viewingRecord.id, form);
        setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
        setMessage("Centro poblado actualizado con éxito.");
      } else {
        const created = await createCentroPoblado(form);
        setRecords((curr) => [created, ...curr]);
        setMessage("Centro poblado creado con éxito.");
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar el centro poblado.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(record: CentroPobladoRecord) {
    const nextActivo = !record.activo;
    setError(null);
    setMessage(null);
    try {
      const updated = await setCentroPobladoActivo(record.id, nextActivo);
      setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
      setMessage(`Centro poblado ${nextActivo ? "activado" : "desactivado"} correctamente.`);
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado.");
    }
  }

  async function handleArchivar(record: CentroPobladoRecord) {
    setError(null);
    setMessage(null);
    try {
      const updated = await archivarCentroPoblado(record.id);
      setRecords((curr) => curr.filter((r) => r.id !== updated.id));
      setMessage("Centro poblado archivado correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al archivar el centro poblado.");
    }
  }

  function renderRow(r: CentroPobladoRecord) {
    return (
      <tr key={r.id}>
        {user?.rol === "ADMIN_GENERAL" && (
          <td>{munisMap[r.municipalidadId] || "Cargando..."}</td>
        )}
        <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{r.codigo || "-"}</td>
        <td>{r.nombre}</td>
        <td>
          <span className={`admin-badge ${r.tipo === "URBANO" ? "is-success" : "is-warning"}`}>
            {r.tipo}
          </span>
        </td>
        <td>{r.poblacion !== null ? r.poblacion.toLocaleString() : "-"}</td>
        <td>
          {r.latitud !== null && r.longitud !== null
            ? `${r.latitud.toFixed(5)}, ${r.longitud.toFixed(5)}`
            : "-"}
        </td>
        <td>
          <span
            className={`status-pill ${r.activo ? "is-active" : "is-muted"}`}
            onClick={() => handleToggleActivo(r)}
            style={{ cursor: "pointer" }}
            title={`Haga clic para ${r.activo ? "desactivar" : "activar"}`}
          >
            {r.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td>
          <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
            <button
              className="admin-button is-ghost"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === r.id ? null : r.id);
              }}
              style={{ padding: "0.25rem", height: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}
              type="button"
            >
              <LuSettings size={18} />
            </button>

            {activeMenuId === r.id && (
              <div
                className="admin-context-menu"
                style={{
                  position: "absolute",
                  right: 0,
                  top: "100%",
                  background: "white",
                  border: "1px solid var(--border)",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 1000,
                  minWidth: "120px",
                  padding: "0.25rem 0",
                }}
              >
                <button
                  onClick={() => handleEditClick(r)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.6rem 1rem",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#333",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f5eeff")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  type="button"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: "Archivar Centro Poblado",
                      message: `¿Seguro que deseas archivar el centro poblado "${r.nombre}"? Esta acción lo retirará del listado operativo.`,
                      onConfirm: () => handleArchivar(r),
                    });
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "0.6rem 1rem",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    color: "#c81e1e",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fde8e8")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  type="button"
                >
                  Archivar
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Centro Poblado</h1>
          <p>Gestión territorial de centros poblados urbanos y rurales adscritos a las municipalidades.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="admin-button is-ghost" onClick={() => handleAddClick("URBANO")} type="button">
            + Agregar CC.PP. Urbano
          </button>
          <button className="admin-button is-primary" onClick={() => handleAddClick("RURAL")} type="button">
            + Agregar CC.PP. Rural
          </button>
        </div>
      </div>

      <section className="admin-content-card" aria-label="Listado de Centros Poblados">
        {error && (
          <div className="admin-alert is-error" style={{ marginBottom: "1.25rem" }}>
            {error}
          </div>
        )}
        {message && (
          <div className="admin-alert is-success" style={{ marginBottom: "1.25rem" }}>
            {message}
          </div>
        )}

        <div className="admin-actions-row">
          <div className="admin-search-wrapper">
            <LuSearch className="admin-search-icon" />
            <input
              className="admin-search-field"
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ubigeo..."
              type="text"
              value={query}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginRight: "1rem" }}>
            {user?.rol === "ADMIN_GENERAL" ? (
              <select
                onChange={(e) => setMuniFilter(e.target.value)}
                style={{
                  width: "220px",
                  height: "38px",
                  background: "white",
                  color: "#333",
                  border: "1px solid #ccc",
                  borderRadius: "0.25rem",
                  padding: "0 0.5rem",
                  cursor: "pointer",
                }}
                value={muniFilter}
              >
                <option value="">Todas las Municipalidades</option>
                {municipalidades.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            ) : null}

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>Agrupar por:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                style={{
                  height: "38px",
                  background: "white",
                  color: "#333",
                  border: "1px solid #ccc",
                  borderRadius: "0.25rem",
                  padding: "0 0.5rem",
                  cursor: "pointer",
                }}
              >
                <option value="">Ninguno</option>
                {user?.rol === "ADMIN_GENERAL" && <option value="municipalidad">Municipalidad</option>}
                <option value="tipo">Tipo de CC.PP.</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                {user?.rol === "ADMIN_GENERAL" && (
                  <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Municipalidad{getSortIcon("municipalidad")}
                  </th>
                )}
                <th onClick={() => handleSort("codigo")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Código / Ubigeo{getSortIcon("codigo")}
                </th>
                <th onClick={() => handleSort("nombre")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Nombre{getSortIcon("nombre")}
                </th>
                <th onClick={() => handleSort("tipo")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Tipo{getSortIcon("tipo")}
                </th>
                <th onClick={() => handleSort("poblacion")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Población Est.{getSortIcon("poblacion")}
                </th>
                <th onClick={() => handleSort("latitud")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Ubicación (Lat/Lng){getSortIcon("latitud")}
                </th>
                <th>Estado</th>
                <th style={{ width: "80px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupBy ? (
                groupedRecords && Object.keys(groupedRecords).map((groupName) => (
                  <Fragment key={groupName}>
                    <tr style={{ background: "#f8f9fa" }}>
                      <td colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        📁 {groupName} ({groupedRecords[groupName].length})
                      </td>
                    </tr>
                    {groupedRecords[groupName].map((r) => renderRow(r))}
                  </Fragment>
                ))
              ) : (
                sortedRecords.map((r) => renderRow(r))
              )}
              {!isLoading && filteredRecords.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7}>
                    No se encontraron centros poblados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Agregar / Editar Centro Poblado */}
      {isFormOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" style={{ maxWidth: "500px" }} onSubmit={handleSubmit}>
            <div className="admin-modal-header">
              <h2>{viewingRecord ? "Editar Centro Poblado" : `Agregar CC.PP. ${form.tipo}`}</h2>
              <button className="admin-modal-close" onClick={() => setIsFormOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", padding: "1rem" }}>
              {user?.rol === "ADMIN_GENERAL" ? (
                <label className="field">
                  Municipalidad *
                  <select
                    value={form.municipalidadId}
                    onChange={(e) => setForm((curr) => ({ ...curr, municipalidadId: e.target.value }))}
                    required
                    disabled={!!viewingRecord}
                  >
                    <option value="">Selecciona municipalidad...</option>
                    {municipalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {!form.municipalidadId && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      La municipalidad es obligatoria.
                    </span>
                  )}
                </label>
              ) : null}

              <label className="field">
                Nombre del Centro Poblado *
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((curr) => ({ ...curr, nombre: e.target.value }))}
                  placeholder="Ej. CASDAS"
                />
                {!form.nombre.trim() && (
                  <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    El nombre del Centro Poblado es obligatorio.
                  </span>
                )}
              </label>

              <label className="field">
                Código / Ubigeo
                <input
                  type="text"
                  value={form.codigo}
                  onChange={(e) => setForm((curr) => ({ ...curr, codigo: e.target.value }))}
                  placeholder="Ej. 150101"
                />
              </label>

              {form.tipo === "RURAL" && (
                <>
                  <label className="field">
                    Latitud
                    <input
                      type="number"
                      step="any"
                      value={form.latitud}
                      onChange={(e) => setForm((curr) => ({ ...curr, latitud: e.target.value }))}
                      placeholder="Ej. -12.04637"
                    />
                  </label>

                  <label className="field">
                    Longitud
                    <input
                      type="number"
                      step="any"
                      value={form.longitud}
                      onChange={(e) => setForm((curr) => ({ ...curr, longitud: e.target.value }))}
                      placeholder="Ej. -77.04279"
                    />
                  </label>

                  <label className="field">
                    Población Estimada
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.poblacion}
                      onChange={(e) => setForm((curr) => ({ ...curr, poblacion: e.target.value }))}
                      placeholder="Ej. 120"
                    />
                  </label>
                </>
              )}
            </div>

            <div className="admin-form-actions" style={{ padding: "1rem" }}>
              <button className="admin-button is-ghost" onClick={() => setIsFormOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                disabled={isSaving || (user?.rol === "ADMIN_GENERAL" && !form.municipalidadId) || !form.nombre.trim()}
                type="submit"
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal de Confirmación Genérico */}
      {confirmConfig.isOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <div className="admin-modal" style={{ maxWidth: "480px" }}>
            <div className="admin-modal-header">
              <h2>{confirmConfig.title}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setConfirmConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1.5rem 1rem" }}>
              <p style={{ margin: 0, fontSize: "1.05rem", lineHeight: "1.5", color: "var(--text)" }}>
                {confirmConfig.message}
              </p>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setConfirmConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                onClick={async () => {
                  setConfirmConfig((curr) => ({ ...curr, isOpen: false }));
                  await confirmConfig.onConfirm();
                }}
                type="button"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
