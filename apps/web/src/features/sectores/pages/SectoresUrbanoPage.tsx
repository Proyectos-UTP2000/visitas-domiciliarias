import { Fragment, useEffect, useMemo, useState } from "react";
import { LuSearch, LuFolder, LuChevronDown, LuChevronRight, LuArrowUp, LuArrowDown, LuArrowUpDown } from "react-icons/lu";
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

export function SectoresUrbanoPage() {
  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [records, setRecords] = useState<SectorRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [centrosPoblados, setCentrosPoblados] = useState<CentroPobladoRecord[]>([]);

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<SectorFormState>(emptySectorForm("URBANO"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
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
      .filter((cp) => cp.municipalidadId === form.municipalidadId && cp.tipo === "URBANO" && cp.activo && !cp.archivado)
      .map((cp) => ({
        id: cp.id,
        name: cp.nombre,
        subtext: cp.codigo ? `Ubigeo: ${cp.codigo}` : undefined,
      }));
  }, [centrosPoblados, form.municipalidadId]);

  const cpSelectedName = useMemo(() => {
    return centrosPoblados.find((cp) => cp.id === form.centroPobladoId)?.nombre || "";
  }, [centrosPoblados, form.centroPobladoId]);

  const [groupBy, setGroupBy] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  function toggleGroupCollapse(groupName: string) {
    setCollapsedGroups((curr) => ({
      ...curr,
      [groupName]: !curr[groupName],
    }));
  }

  const expandAllGroups = () => {
    if (!groupedRecords) return;
    const expanded: Record<string, boolean> = {};
    Object.keys(groupedRecords).forEach((key) => {
      expanded[key] = false;
    });
    setCollapsedGroups(expanded);
  };

  const collapseAllGroups = () => {
    if (!groupedRecords) return;
    const collapsed: Record<string, boolean> = {};
    Object.keys(groupedRecords).forEach((key) => {
      collapsed[key] = true;
    });
    setCollapsedGroups(collapsed);
  };

  useEffect(() => {
    if (groupBy && groupedRecords) {
      const initialCollapsed: Record<string, boolean> = {};
      Object.keys(groupedRecords).forEach((key) => {
        initialCollapsed[key] = true;
      });
      setCollapsedGroups(initialCollapsed);
    }
  }, [groupBy, groupedRecords]);

  const filteredRecords = useMemo(() => {
    return filterSectores(records, query, "URBANO", muniFilter);
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
      let aVal = "";
      let bVal = "";

      if (sortConfig.key === "municipalidad") {
        aVal = munisMap[a.municipalidadId] || "";
        bVal = munisMap[b.municipalidadId] || "";
      } else if (sortConfig.key === "centroPoblado") {
        aVal = a.centroPoblado?.nombre || "";
        bVal = b.centroPoblado?.nombre || "";
      } else if (sortConfig.key === "zona") {
        aVal = a.urbano?.zona || "";
        bVal = b.urbano?.zona || "";
      } else if (sortConfig.key === "manzana") {
        aVal = a.urbano?.manzana || "";
        bVal = b.urbano?.manzana || "";
      } else {
        aVal = a[sortConfig.key] || "";
        bVal = b[sortConfig.key] || "";
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
    const groups: Record<string, SectorRecord[]> = {};
    sortedRecords.forEach((r) => {
      let groupKey = "";
      if (groupBy === "municipalidad") {
        groupKey = munisMap[r.municipalidadId] || "Sin Municipalidad";
      } else if (groupBy === "centroPoblado") {
        groupKey = r.centroPoblado?.nombre || "Sin Centro Poblado";
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(r);
    });
    return groups;
  }, [sortedRecords, groupBy, munisMap]);

  function handleSort(key: string) {
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        setSortConfig({ key, direction: "desc" });
      } else {
        setSortConfig(null);
      }
    } else {
      setSortConfig({ key, direction: "asc" });
    }
  }

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <LuArrowUpDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", opacity: 0.4 }} />;
    }
    return sortConfig.direction === "asc" ? (
      <LuArrowUp size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    ) : (
      <LuArrowDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    );
  };

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_MUNICIPAL") {
        setMuniFilter(session.user.municipalidadId || "");
      }
    }
    void loadData();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFormOpen(false);
        setSearchModalConfig((curr) => ({ ...curr, isOpen: false }));
        setConfirmConfig((curr) => ({ ...curr, isOpen: false }));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const session = getStoredSession();
      const muniId = session?.user.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;
      const [sectoresData, munisData, cpData] = await Promise.all([
        listSectores(muniId),
        listMunicipalidades(),
        listCentrosPoblados(),
      ]);
      setRecords(sectoresData);
      setMunicipalidades(munisData);
      setCentrosPoblados(cpData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los sectores urbanos.");
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
    setShowValidationErrors(false);

    const defaultMuniId = user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : "";
    const muni = municipalidades.find((m) => m.id === defaultMuniId);

    setForm({
      ...emptySectorForm("URBANO"),
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
    setShowValidationErrors(false);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowValidationErrors(true);
    setError(null);
    setMessage(null);

    const isMuniInvalid = !form.municipalidadId;
    const isCpInvalid = !form.centroPobladoId;
    const isNombreInvalid = !form.nombreSector.trim();
    const isZonaInvalid = !form.zona || form.zona.trim().length > 3;
    const isManzanaInvalid = !form.manzana || form.manzana.trim().length > 10;

    if (isMuniInvalid || isCpInvalid || isNombreInvalid || isZonaInvalid || isManzanaInvalid) {
      setError("Por favor, complete todos los campos obligatorios.");
      return;
    }

    // Auto-generate code for urban sectors as 'ZONA-MANZANA'
    form.codigo = `${form.zona.trim()}-${form.manzana.trim()}`;

    setIsSaving(true);
    try {
      if (viewingRecord) {
        const updated = await updateSector(viewingRecord.id, form);
        setRecords((curr) => curr.map((r) => (r.id === updated.id ? updated : r)));
        setMessage("Sector urbano actualizado con éxito.");
      } else {
        const created = await createSector(form);
        setRecords((curr) => [created, ...curr]);
        setMessage("Sector urbano creado con éxito.");
      }
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al guardar el sector urbano.");
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
      setMessage("Sector urbano archivado correctamente.");
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
      (cp) => cp.municipalidadId === form.municipalidadId && cp.tipo === "URBANO" && cp.activo && !cp.archivado
    );
    setSearchModalConfig({
      isOpen: true,
      title: "Buscar Centro Poblado Urbano",
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

  function renderRow(r: SectorRecord) {
    return (
      <tr key={r.id} style={{ opacity: r.activo ? 1 : 0.6 }}>
        <td style={{ textAlign: "center" }}>
          <input
            type="checkbox"
            checked={selectedIds.has(r.id)}
            onChange={() => handleSelectRow(r.id)}
          />
        </td>
        <td>{r.centroPoblado?.nombre || "-"}</td>
        <td>{r.urbano?.zona}</td>
        <td>{r.urbano?.manzana}</td>
        <td>{r.nombreSector}</td>
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
                  title: "Archivar Sector Urbano",
                  message: `¿Seguro que deseas archivar el sector urbano "${r.nombreSector}"? Esta acción lo retirará del listado operativo.`,
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
    );
  }

  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>Sector Urbano</h1>
          <p>Gestión territorial urbana: manzanas, zonas y sectores correspondientes a las municipalidades.</p>
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
            + Agregar Sector Urbano
          </button>
        </div>
      </div>

      <section className="admin-content-card" aria-label="Listado de Sectores Urbanos">
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

        <div style={{ marginBottom: "1.5rem" }}>
          <div className="admin-filters-grid">
            <div className="field">
              <span>Buscar Sector Urbano</span>
              <div className="admin-search-field" style={{ border: "1px solid var(--border)", background: "white" }}>
                <LuSearch className="search-icon" size={18} style={{ marginRight: "0.5rem" }} />
                <input
                  type="text"
                  placeholder="Buscar por centro poblado, sector, zona o manzana..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {user?.rol === "ADMIN_GENERAL" && (
              <div className="field">
                <span>Municipalidad</span>
                <select
                  className="admin-select"
                  value={muniFilter}
                  onChange={(e) => setMuniFilter(e.target.value)}
                >
                  <option value="">Todas las Municipalidades</option>
                  {municipalidades.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <span>Agrupar Sectores Urbanos por</span>
              <select
                className="admin-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="">Ninguno</option>
                {user?.rol === "ADMIN_GENERAL" && <option value="municipalidad">Municipalidad</option>}
                <option value="centroPoblado">Centro Poblado</option>
              </select>
              {groupBy !== "" && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                  <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={expandAllGroups}>
                    Expandir todos
                  </button>
                  <span style={{ color: "#ccc" }}>|</span>
                  <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={collapseAllGroups}>
                    Colapsar todos
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="admin-table-meta">
          <span>{filteredRecords.length} sectores urbanos encontrados</span>
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
                <th onClick={() => handleSort("centroPoblado")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Centro poblado {renderSortIcon("centroPoblado")}
                </th>
                <th onClick={() => handleSort("zona")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Zona {renderSortIcon("zona")}
                </th>
                <th onClick={() => handleSort("manzana")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Manzana {renderSortIcon("manzana")}
                </th>
                <th onClick={() => handleSort("nombreSector")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Sector {renderSortIcon("nombreSector")}
                </th>
                {user?.rol === "ADMIN_GENERAL" && (
                  <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Municipalidad {renderSortIcon("municipalidad")}
                  </th>
                )}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupBy ? (
                groupedRecords && Object.keys(groupedRecords).map((groupName) => (
                  <Fragment key={groupName}>
                    <tr
                      onClick={() => toggleGroupCollapse(groupName)}
                      style={{ background: "#f8f9fa", cursor: "pointer", userSelect: "none" }}
                    >
                      <td colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {collapsedGroups[groupName] ? <LuChevronRight size={16} /> : <LuChevronDown size={16} />}
                          <LuFolder size={18} style={{ color: "#71639e" }} />
                          <span>{groupName}</span>
                          <span style={{ color: "var(--muted)", fontWeight: "normal", fontSize: "0.85rem" }}>
                            ({groupedRecords[groupName].length})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsedGroups[groupName] && groupedRecords[groupName].map((r) => renderRow(r))}
                  </Fragment>
                ))
              ) : (
                sortedRecords.map((r) => renderRow(r))
              )}
              {!isLoading && filteredRecords.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7}>
                    No se encontraron sectores urbanos.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Agregar / Editar Sector Urbano */}
      {isFormOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" style={{ maxWidth: "600px" }} onSubmit={handleSubmit}>
            <div className="admin-modal-header">
              <h2>{viewingRecord ? "Editar Sector Urbano" : "Agregar Sector Urbano"}</h2>
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
                  {showValidationErrors && !form.municipalidadId && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      La municipalidad es obligatoria.
                    </span>
                  )}
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <AutocompleteSearch
                  label="Centro Poblado"
                  placeholder="Seleccione..."
                  value={form.centroPobladoId}
                  displayValue={cpSelectedName}
                  options={cpOptions}
                  onChange={(id) => setForm((curr) => ({ ...curr, centroPobladoId: id }))}
                  onSearchMore={handleSearchCpMore}
                  required
                />
                {showValidationErrors && !form.centroPobladoId && (
                  <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    El Centro Poblado es obligatorio.
                  </span>
                )}
              </div>

              <label className="field">
                Nombre del Sector *
                <input
                  type="text"
                  required
                  value={form.nombreSector}
                  onChange={(e) => setForm((curr) => ({ ...curr, nombreSector: e.target.value }))}
                  placeholder="Ej. Raymondi- I"
                />
                {showValidationErrors && !form.nombreSector.trim() && (
                  <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    El nombre del sector es obligatorio.
                  </span>
                )}
              </label>

              <label className="field">
                Zona *
                <input
                  type="text"
                  maxLength={3}
                  required
                  value={form.zona}
                  onChange={(e) => setForm((curr) => ({ ...curr, zona: e.target.value }))}
                  placeholder="Máx 3 carac. Ej. 7"
                />
                {showValidationErrors && !form.zona.trim() && (
                  <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    La zona es obligatoria.
                  </span>
                )}
              </label>

              <label className="field">
                Manzana *
                <input
                  type="text"
                  maxLength={10}
                  required
                  value={form.manzana}
                  onChange={(e) => setForm((curr) => ({ ...curr, manzana: e.target.value }))}
                  placeholder="Máx 10 carac. Ej. 26"
                />
                {showValidationErrors && !form.manzana.trim() && (
                  <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                    La manzana es obligatoria.
                  </span>
                )}
              </label>
            </div>

            <div className="admin-form-actions" style={{ padding: "1rem" }}>
              <button className="admin-button is-ghost" onClick={() => setIsFormOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                disabled={isSaving}
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
