import { useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
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

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {user?.rol === "ADMIN_GENERAL" ? (
              <select
                className="admin-select"
                onChange={(e) => setMuniFilter(e.target.value)}
                style={{ width: "220px", height: "38px" }}
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
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                {user?.rol === "ADMIN_GENERAL" && <th>Municipalidad</th>}
                <th>Código / Ubigeo</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Población Est.</th>
                <th>Ubicación (Lat/Lng)</th>
                <th>Estado</th>
                <th style={{ width: "80px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
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
                    <button
                      className={`admin-status-pill ${r.activo ? "is-active" : "is-inactive"}`}
                      onClick={() => handleToggleActivo(r)}
                      title={`Haga clic para ${r.activo ? "desactivar" : "activar"}`}
                      type="button"
                    >
                      {r.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", justifyContent: "center", position: "relative" }}>
                      <button
                        className="admin-button is-ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === r.id ? null : r.id);
                        }}
                        style={{ padding: "0.25rem", height: "auto" }}
                        type="button"
                      >
                        ⚙️
                      </button>

                      {activeMenuId === r.id && (
                        <div
                          className="admin-context-menu"
                          style={{
                            position: "absolute",
                            right: 0,
                            top: "100%",
                            background: "white",
                            border: "1px solid #ccc",
                            borderRadius: "0.25rem",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            zIndex: 10,
                            minWidth: "120px",
                          }}
                        >
                          <button
                            onClick={() => handleEditClick(r)}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: "0.5rem 0.75rem",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
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
                              padding: "0.5rem 0.75rem",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              color: "red",
                              cursor: "pointer",
                            }}
                            type="button"
                          >
                            Archivar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
              <button className="admin-button is-primary" disabled={isSaving} type="submit">
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
