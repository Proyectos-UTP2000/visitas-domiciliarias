import { useEffect, useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import {
  listSectores,
  createSector,
  updateSector,
  setSectorActivo,
  archivarSector,
  listCentrosPoblados,
} from "../sectores-api";
import type { SectorRecord, SectorFormState, CentroPobladoRecord } from "../sectores-types";
import { emptySectorForm, filterSectores, toSectorForm } from "../sectores-utils";
import { AutocompleteSearch } from "../../../shared/AutocompleteSearch";

export function SectoresRuralPage() {
  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [records, setRecords] = useState<SectorRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [centrosPoblados, setCentrosPoblados] = useState<CentroPobladoRecord[]>([]);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SectorFormState>(emptySectorForm("RURAL"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<SectorRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Search modal state
  const [searchModalConfig, setSearchModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    query: string;
    options: { id: string; name: string; subtext?: string; raw?: any }[];
    onSelect: (id: string, name: string) => void;
  }>({
    isOpen: false,
    title: "",
    query: "",
    options: [],
    onSelect: () => {},
  });

  // Filter states
  const [muniFilter, setMuniFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const cpOptions = useMemo(() => {
    return centrosPoblados
      .filter((cp) => cp.municipalidadId === form.municipalidadId && cp.tipo === "RURAL" && cp.activo && !cp.archivado)
      .map((cp) => ({
        id: cp.id,
        name: cp.nombre,
        subtext: cp.codigo ? `Ubigeo: ${cp.codigo}` : undefined,
      }));
  }, [centrosPoblados, form.municipalidadId]);

  const cpSelectedName = useMemo(() => {
    return centrosPoblados.find((cp) => cp.id === form.centroPobladoId)?.nombre || "";
  }, [centrosPoblados, form.centroPobladoId]);

  const filteredRecords = useMemo(() => {
    return filterSectores(records, query, "RURAL", muniFilter);
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
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const [sectoresData, munisData, cpData] = await Promise.all([
        listSectores(),
        listMunicipalidades(),
        listCentrosPoblados(),
      ]);
      setRecords(sectoresData);
      setMunicipalidades(munisData);
      setCentrosPoblados(cpData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los sectores rurales.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle auto-populating Departamento, Provincia, Distrito based on selected Municipalidad
  function handleMuniChange(muniId: string) {
    const muni = municipalidades.find((m) => m.id === muniId);
    setForm((curr) => ({
      ...curr,
      municipalidadId: muniId,
      departamento: muni?.departamento || "",
      provincia: muni?.provincia || "",
      distrito: muni?.distrito || "",
    }));
  }

  function handleAddClick() {
    setError(null);
    setMessage(null);
    setViewingRecord(null);

    const defaultMuniId = user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : "";
    const muni = municipalidades.find((m) => m.id === defaultMuniId);

    setForm({
      ...emptySectorForm("RURAL"),
      municipalidadId: defaultMuniId,
      departamento: muni?.departamento || "",
      provincia: muni?.provincia || "",
      distrito: muni?.distrito || "",
    });
    setIsFormOpen(true);
  }

  function handleEditClick(record: SectorRecord) {
    setError(null);
    setMessage(null);
    setViewingRecord(record);
    setForm(toSectorForm(record));
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
    if (!form.codigo.trim()) {
      setError("El código/ubigeo del CC.PP es requerido.");
      return;
    }

    setIsSaving(true);
    try {
      if (viewingRecord) {
        const updated = await updateSector(viewingRecord.id, form);
        setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
        setMessage("Sector rural actualizado con éxito.");
      } else {
        const created = await createSector(form);
        setRecords((curr) => [created, ...curr]);
        setMessage("Sector rural creado con éxito.");
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar el sector rural.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(record: SectorRecord) {
    const nextActivo = !record.activo;
    setError(null);
    setMessage(null);
    try {
      const updated = await setSectorActivo(record.id, nextActivo);
      setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
      setMessage(`Sector ${nextActivo ? "activado" : "desactivado"} correctamente.`);
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado del sector.");
    }
  }

  async function handleArchivar(record: SectorRecord) {
    setError(null);
    setMessage(null);
    try {
      const updated = await archivarSector(record.id);
      setRecords((curr) => curr.filter((r) => r.id !== updated.id));
      setMessage("Sector rural archivado correctamente.");
    } catch (err: any) {
      setError(err.message || "Error al archivar el sector.");
    }
  }

  function handleSearchCpMore() {
    if (!form.municipalidadId) {
      alert("Debe seleccionar una municipalidad antes.");
      return;
    }
    const eligible = centrosPoblados.filter(
      (cp) => cp.municipalidadId === form.municipalidadId && cp.tipo === "RURAL" && cp.activo && !cp.archivado
    );
    setSearchModalConfig({
      isOpen: true,
      title: "Buscar Centro Poblado Rural",
      query: "",
      options: eligible.map((cp) => ({
        id: cp.id,
        name: cp.nombre,
        subtext: cp.codigo ? `Ubigeo: ${cp.codigo}` : undefined,
        raw: cp,
      })),
      onSelect: (id) => {
        setForm((curr) => ({ ...curr, centroPobladoId: id }));
      },
    });
  }

  // Checkbox selection handlers
  function handleSelectRow(id: string) {
    setSelectedIds((curr) => {
      const next = new Set(curr);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  }

  function handleAsignarSectorizacion() {
    alert("Función 'Asignar Sectorización' está diferida y será implementada en la fase V2.");
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Sector Rural</h1>
          <p>Gestión territorial rural: centros poblados, coordenadas UTM y sectores correspondientes a las municipalidades.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="admin-button is-ghost"
            disabled={selectedIds.size === 0}
            onClick={handleAsignarSectorizacion}
            type="button"
          >
            Asignar sectorización
          </button>
          <button className="admin-button is-primary" onClick={handleAddClick} type="button">
            + Agregar Sector Rural
          </button>
        </div>
      </div>

      <section className="admin-content-card" aria-label="Listado de Sectores Rurales">
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
          <div className="admin-search-field">
            <LuSearch className="search-icon" size={18} />
            <input
              type="text"
              placeholder="Buscar por Ubigeo CC.PP, centro poblado o sector..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {user?.rol === "ADMIN_GENERAL" && (
            <div className="admin-actions-group">
              <label className="field" style={{ margin: 0, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
                <span>Municipalidad:</span>
                <select value={muniFilter} onChange={(e) => setMuniFilter(e.target.value)}>
                  <option value="">Todas</option>
                  {municipalidades.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>

        <div className="admin-table-meta">
          <span>{filteredRecords.length} sectores rurales encontrados</span>
          <span>
            {isLoading ? "Cargando..." : `1-${filteredRecords.length} de ${filteredRecords.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Ubigeo del CC.PP</th>
                <th>Centro Poblado</th>
                <th>Sector</th>
                <th>Latitud</th>
                <th>Longitud</th>
                <th>Población</th>
                {user?.rol === "ADMIN_GENERAL" && <th>Municipalidad</th>}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => (
                <tr key={r.id} style={{ opacity: r.activo ? 1 : 0.6 }}>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => handleSelectRow(r.id)}
                    />
                  </td>
                  <td>{r.centroPoblado?.codigo || "-"}</td>
                  <td>{r.centroPoblado?.nombre || "-"}</td>
                  <td>{r.nombreSector}</td>
                  <td>{r.rural?.latitud !== null ? r.rural?.latitud : "-"}</td>
                  <td>{r.rural?.longitud !== null ? r.rural?.longitud : "-"}</td>
                  <td>{r.rural?.poblacion !== null ? r.rural?.poblacion : "-"}</td>
                  {user?.rol === "ADMIN_GENERAL" && (
                    <td>{munisMap[r.municipalidadId] || "Cargando..."}</td>
                  )}
                  <td>
                    <span className={`status-pill ${r.activo ? "is-active" : "is-muted"}`}>
                      {r.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="admin-button is-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                        onClick={() => handleEditClick(r)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="admin-button is-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                        onClick={() => handleToggleActivo(r)}
                        type="button"
                      >
                        {r.activo ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        className="admin-button is-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: "Archivar Sector Rural",
                            message: `¿Seguro que deseas archivar el sector rural "${r.nombreSector}"? Esta acción lo retirará del listado operativo.`,
                            onConfirm: () => handleArchivar(r),
                          });
                        }}
                        type="button"
                      >
                        Archivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredRecords.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 10 : 9}>
                    No se encontraron sectores rurales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Agregar / Editar Sector Rural */}
      {isFormOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" style={{ maxWidth: "600px" }} onSubmit={handleSubmit}>
            <div className="admin-modal-header">
              <h2>{viewingRecord ? "Editar Sector Rural" : "Agregar Sector Rural"}</h2>
              <button className="admin-modal-close" onClick={() => setIsFormOpen(false)} type="button">
                ×
              </button>
            </div>

            <div className="admin-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", padding: "1rem" }}>
              {user?.rol === "ADMIN_GENERAL" ? (
                <label className="field" style={{ gridColumn: "span 2" }}>
                  Municipalidad *
                  <select
                    value={form.municipalidadId}
                    onChange={(e) => handleMuniChange(e.target.value)}
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
                Departamento (Auto)
                <input type="text" disabled value={form.departamento} placeholder="Departamento" />
              </label>

              <label className="field">
                Provincia (Auto)
                <input type="text" disabled value={form.provincia} placeholder="Provincia" />
              </label>

              <label className="field" style={{ gridColumn: "span 2" }}>
                Distrito (Auto)
                <input type="text" disabled value={form.distrito} placeholder="Distrito" />
              </label>

              <label className="field">
                Ubigeo del CC.PP / Código
                <input
                  type="text"
                  disabled
                  value={form.codigo}
                  placeholder="Se autocompleta..."
                />
              </label>

              <AutocompleteSearch
                label="Centro Poblado"
                placeholder="Seleccione..."
                value={form.centroPobladoId}
                displayValue={cpSelectedName}
                options={cpOptions}
                onChange={(id, name, raw) => {
                  setForm((curr) => ({
                    ...curr,
                    centroPobladoId: id,
                    codigo: raw?.codigo || "",
                  }));
                }}
                onSearchMore={handleSearchCpMore}
                required
              />

              <label className="field" style={{ gridColumn: "span 2" }}>
                Nombre del Sector *
                <input
                  type="text"
                  required
                  value={form.nombreSector}
                  onChange={(e) => setForm((curr) => ({ ...curr, nombreSector: e.target.value }))}
                  placeholder="Ej. Chosica del Norte IX"
                />
              </label>

              <label className="field">
                Latitud
                <input
                  type="number"
                  step="any"
                  value={form.latitud}
                  onChange={(e) => setForm((curr) => ({ ...curr, latitud: e.target.value }))}
                  placeholder="-12.3456"
                />
              </label>

              <label className="field">
                Longitud
                <input
                  type="number"
                  step="any"
                  value={form.longitud}
                  onChange={(e) => setForm((curr) => ({ ...curr, longitud: e.target.value }))}
                  placeholder="-76.5432"
                />
              </label>

              <label className="field" style={{ gridColumn: "span 2" }}>
                Población
                <input
                  type="number"
                  min={0}
                  value={form.poblacion}
                  onChange={(e) => setForm((curr) => ({ ...curr, poblacion: e.target.value }))}
                  placeholder="Cantidad de habitantes"
                />
              </label>
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

      {/* Modal de Búsqueda Avanzada */}
      {searchModalConfig.isOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 1100 }}>
          <div className="admin-modal" style={{ maxWidth: "700px", width: "100%" }}>
            <div className="admin-modal-header">
              <h2>{searchModalConfig.title}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setSearchModalConfig((c) => ({ ...c, isOpen: false }))}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <div style={{ position: "relative", marginBottom: "1rem" }}>
                <LuSearch
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#888",
                  }}
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchModalConfig.query}
                  onChange={(e) => {
                    const q = e.target.value;
                    setSearchModalConfig((curr) => ({ ...curr, query: q }));
                  }}
                  style={{
                    width: "100%",
                    paddingLeft: "2.5rem",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                    borderRadius: "0.25rem",
                    height: "38px",
                  }}
                />
              </div>

              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #eee", borderRadius: "0.25rem" }}>
                <table className="admin-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Código / Ubigeo</th>
                      <th>Nombre</th>
                      <th style={{ width: "100px", textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchModalConfig.options
                      .filter(
                        (opt) =>
                          opt.name.toLowerCase().includes(searchModalConfig.query.toLowerCase()) ||
                          (opt.subtext && opt.subtext.toLowerCase().includes(searchModalConfig.query.toLowerCase()))
                      )
                      .map((opt) => (
                        <tr key={opt.id}>
                          <td style={{ fontFamily: "monospace" }}>{opt.raw?.codigo || "-"}</td>
                          <td>{opt.name}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              className="admin-button is-primary"
                              onClick={() => {
                                searchModalConfig.onSelect(opt.id, opt.name);
                                setSearchModalConfig((c) => ({ ...c, isOpen: false }));
                              }}
                              style={{ padding: "0.25rem 0.75rem", height: "auto" }}
                              type="button"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      ))}
                    {searchModalConfig.options.filter(
                      (opt) =>
                        opt.name.toLowerCase().includes(searchModalConfig.query.toLowerCase()) ||
                        (opt.subtext && opt.subtext.toLowerCase().includes(searchModalConfig.query.toLowerCase()))
                    ).length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center", color: "#999", padding: "1.5rem" }}>
                          No se encontraron resultados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="admin-form-actions" style={{ padding: "1rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setSearchModalConfig((c) => ({ ...c, isOpen: false }))}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
