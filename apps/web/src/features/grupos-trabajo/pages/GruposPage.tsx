import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuFolder, LuChevronDown, LuChevronRight } from "react-icons/lu";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { createGrupo, listGrupos } from "../grupos-api";
import type { GrupoTrabajoFormState, GrupoTrabajoRecord } from "../grupos-types";
import { emptyGrupoForm, filterGrupos } from "../grupos-utils";
import { getStoredSession } from "../../auth/auth-storage";
import { consultarDni } from "../../dni/dni-api";

export function GruposPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [grupos, setGrupos] = useState<GrupoTrabajoRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<GrupoTrabajoFormState>(emptyGrupoForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDniLookup() {
    const dni = form.dniRepresentante.trim();
    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI del representante debe tener exactamente 8 dígitos.");
      return;
    }
    setIsSearchingDni(true);
    setError(null);
    try {
      const datos = await consultarDni(dni);
      setForm((curr) => ({
        ...curr,
        nombreRepresentante: datos.nombres,
        apellidosRepresentante: `${datos.ape_paterno} ${datos.ape_materno}`,
      }));
    } catch (err: any) {
      setError(err.message || "No se encontró el DNI o hubo un error al realizar la consulta.");
    } finally {
      setIsSearchingDni(false);
    }
  }

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [periodoFilter, setPeriodoFilter] = useState("");
  const [muniFilter, setMuniFilter] = useState("");

  const isFiltering = estadoFilter !== "" || periodoFilter !== "" || muniFilter !== "";

  useEffect(() => {
    if (!showFilters) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".admin-filters-panel") && !target.closest(".admin-button.is-ghost")) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilters]);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
    }
    void loadData();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsFormOpen(false);
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
      const [groupsData, munisData] = await Promise.all([
        listGrupos(),
        listMunicipalidades().catch(() => []),
      ]);
      setGrupos(groupsData);
      setMunicipalidades(munisData.filter((m) => m.activo));
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos.");
    } finally {
      setIsLoading(false);
    }
  }

  const availablePeriods = useMemo(() => {
    const periods = grupos.map((g) => g.periodoYear);
    return Array.from(new Set(periods)).sort((a, b) => b - a);
  }, [grupos]);

  const [groupBy, setGroupBy] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  function toggleGroupCollapse(groupName: string) {
    setCollapsedGroups((curr) => ({
      ...curr,
      [groupName]: !curr[groupName],
    }));
  }

  const filteredGrupos = useMemo(() => {
    return filterGrupos(
      grupos,
      query,
      estadoFilter,
      periodoFilter ? Number(periodoFilter) : undefined,
      muniFilter,
    );
  }, [grupos, query, estadoFilter, periodoFilter, muniFilter]);

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  const sortedGrupos = useMemo(() => {
    if (!sortConfig) return filteredGrupos;
    return [...filteredGrupos].sort((a: any, b: any) => {
      let aVal: any = "";
      let bVal: any = "";

      if (sortConfig.key === "municipalidad") {
        aVal = munisMap[a.municipalidadId] || "";
        bVal = munisMap[b.municipalidadId] || "";
      } else if (sortConfig.key === "representante") {
        aVal = `${a.apellidosRepresentante} ${a.nombreRepresentante}`;
        bVal = `${b.apellidosRepresentante} ${b.nombreRepresentante}`;
      } else if (sortConfig.key === "periodoYear") {
        aVal = a.periodoYear ?? 0;
        bVal = b.periodoYear ?? 0;
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
  }, [filteredGrupos, sortConfig, munisMap]);

  const groupedGrupos = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, GrupoTrabajoRecord[]> = {};
    sortedGrupos.forEach((r) => {
      let groupKey = "";
      if (groupBy === "municipalidad") {
        groupKey = munisMap[r.municipalidadId] || "Sin Municipalidad";
      } else if (groupBy === "estado") {
        groupKey = r.estado;
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(r);
    });
    return groups;
  }, [sortedGrupos, groupBy, munisMap]);

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

  function openCreate() {
    setForm({
      ...emptyGrupoForm,
      municipalidadId: user?.municipalidadId || "",
    });
    setError(null);
    setMessage(null);
    setShowValidationErrors(false);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setShowValidationErrors(true);

    const resolvedMuniId = user?.rol === "ADMIN_GENERAL" ? form.municipalidadId : user?.municipalidadId;
    const isMuniInvalid = user?.rol === "ADMIN_GENERAL" && !form.municipalidadId;
    const isNombreInvalid = !form.nombreGrupo.trim();
    const year = Number(form.periodoYear);
    const isPeriodoInvalid = isNaN(year) || year < 2000 || year > 32767;
    const isFechaInvalid = !form.fechaLimite;
    const isDniInvalid = !/^\d{8}$/.test(form.dniRepresentante);
    const isNombreRepInvalid = !form.nombreRepresentante.trim();
    const isApellidosRepInvalid = !form.apellidosRepresentante.trim();

    if (
      isMuniInvalid ||
      isNombreInvalid ||
      isPeriodoInvalid ||
      isFechaInvalid ||
      isDniInvalid ||
      isNombreRepInvalid ||
      isApellidosRepInvalid
    ) {
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (form.fechaLimite < todayStr) {
      setError("La fecha límite debe ser una fecha futura (a partir de hoy).");
      return;
    }

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const saved = await createGrupo({
        municipalidadId: resolvedMuniId!,
        fechaLimite: form.fechaLimite,
        nombreGrupo: form.nombreGrupo.trim(),
        periodoYear: year,
        dniRepresentante: form.dniRepresentante.trim(),
        nombreRepresentante: form.nombreRepresentante.trim(),
        apellidosRepresentante: form.apellidosRepresentante.trim(),
      });
      setGrupos((curr) => [saved, ...curr]);
      setMessage("Grupo de trabajo creado con éxito.");
      setIsFormOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al crear el grupo.");
    } finally {
      setIsSaving(false);
    }
  }
  function renderRow(g: GrupoTrabajoRecord) {
    return (
      <tr
        key={g.id}
        onClick={() => navigate(`/grupos-trabajo/${g.id}`)}
        style={{ cursor: "pointer" }}
      >
        <td>{g.periodoYear}</td>
        <td>{g.nombreGrupo}</td>
        {user?.rol === "ADMIN_GENERAL" && (
          <td>{munisMap[g.municipalidadId] || "Cargando..."}</td>
        )}
        <td>{`${g.nombreRepresentante} ${g.apellidosRepresentante}`}</td>
        <td>{g.dniRepresentante}</td>
        <td>
          <span className={`status-pill ${
            g.estado === "APROBADO"
              ? "is-active"
              : g.estado === "VALIDADO"
                ? "is-warning"
                : (g.estado === "BORRADOR" && g.observaciones)
                  ? "is-suspended"
                  : "is-muted"
          }`}>
            {g.estado === "BORRADOR" && g.observaciones ? "OBSERVADO" : g.estado}
          </span>
        </td>
        <td>
          <button
            className="admin-button is-ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/grupos-trabajo/${g.id}`);
            }}
            type="button"
          >
            Gestionar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Conformación de Grupo de Trabajo</h1>
          <p>Monitorea y conforma los grupos de trabajo municipales.</p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Grupo de Trabajo</span>
          <strong>Conformación</strong>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Listado de Grupos">
        <div style={{ position: "relative" }}>
          <div className="admin-actions-row">
            <label className="admin-search-field">
              <span aria-hidden="true">⌕</span>
              <input
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o representante..."
                type="search"
                value={query}
              />
            </label>

            <div className="admin-actions-group" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <label style={{ display: "flex", margin: 0, alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: "500" }}>Agrupar por:</span>
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
                  <option value="estado">Estado</option>
                </select>
              </label>

              <button
                className={`admin-button is-ghost${showFilters ? " is-active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                style={{ height: "38px" }}
                type="button"
              >
                Filtros
              </button>
              <button
                className="admin-button is-primary"
                onClick={() => navigate("/grupos-trabajo/nuevo")}
                type="button"
              >
                + Nuevo grupo
              </button>
            </div>
          </div>

          {showFilters ? (
            <div
              className="admin-filters-panel"
              style={{
                position: "absolute",
                top: "calc(100% - 0.25rem)",
                right: 0,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "1rem",
                background: "white",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                width: "300px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: "var(--text)" }}>Filtros</span>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "1.1rem", color: "var(--muted)", padding: 0 }}
                >
                  ×
                </button>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                Estado
                <select
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                    borderRadius: "0.25rem",
                    padding: "0 0.5rem",
                  }}
                  value={estadoFilter}
                >
                  <option value="">Todos</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="REGISTRADO">Registrado</option>
                  <option value="OBSERVADO">Observado</option>
                  <option value="VALIDADO">Validado</option>
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                Periodo
                <select
                  onChange={(e) => setPeriodoFilter(e.target.value)}
                  style={{
                    width: "100%",
                    height: "38px",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                    borderRadius: "0.25rem",
                    padding: "0 0.5rem",
                  }}
                  value={periodoFilter}
                >
                  <option value="">Todos</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              {user?.rol === "ADMIN_GENERAL" ? (
                <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>
                  Municipalidad
                  <select
                    onChange={(e) => setMuniFilter(e.target.value)}
                    style={{
                      width: "100%",
                      height: "38px",
                      background: "white",
                      color: "#333",
                      border: "1px solid #ccc",
                      borderRadius: "0.25rem",
                      padding: "0 0.5rem",
                    }}
                    value={muniFilter}
                  >
                    <option value="">Todas</option>
                    {municipalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
        </div>

        {message ? <p className="alert alert-success">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

        {isFiltering ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
              padding: "0.5rem 0.75rem",
              background: "#f0fdfa",
              border: "1px solid #ccfbf1",
              borderRadius: "6px",
              fontSize: "0.875rem",
              color: "#0f766e",
            }}
          >
            <span style={{ fontWeight: 600 }}>Filtrando por:</span>
            {estadoFilter ? (
              <span
                style={{
                  background: "#e2e8f0",
                  color: "#334155",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontWeight: 500,
                }}
              >
                Estado: {estadoFilter}
                <button
                  onClick={() => setEstadoFilter("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "bold",
                    color: "#64748b",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  type="button"
                >
                  ×
                </button>
              </span>
            ) : null}
            {periodoFilter ? (
              <span
                style={{
                  background: "#e2e8f0",
                  color: "#334155",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontWeight: 500,
                }}
              >
                Periodo: {periodoFilter}
                <button
                  onClick={() => setPeriodoFilter("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "bold",
                    color: "#64748b",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  type="button"
                >
                  ×
                </button>
              </span>
            ) : null}
            {muniFilter ? (
              <span
                style={{
                  background: "#e2e8f0",
                  color: "#334155",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontWeight: 500,
                }}
              >
                Muni: {munisMap[muniFilter] || muniFilter}
                <button
                  onClick={() => setMuniFilter("")}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: 0,
                    fontWeight: "bold",
                    color: "#64748b",
                    fontSize: "1rem",
                    lineHeight: 1,
                  }}
                  type="button"
                >
                  ×
                </button>
              </span>
            ) : null}
            <button
              onClick={() => {
                setEstadoFilter("");
                setPeriodoFilter("");
                setMuniFilter("");
              }}
              style={{
                border: "none",
                background: "transparent",
                color: "#b91c1c",
                cursor: "pointer",
                padding: "0.15rem 0.3rem",
                textDecoration: "underline",
                fontWeight: 500,
                fontSize: "0.85rem",
              }}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>
        ) : null}

        {isFormOpen ? (
          <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
            <form className="admin-modal" onSubmit={handleSubmit}>
              <div className="admin-modal-header">
                <div>
                  <h2>Nuevo grupo de trabajo</h2>
                  <p>Completa los datos del grupo.</p>
                </div>
                <button
                  className="admin-modal-close"
                  onClick={() => setIsFormOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="admin-form-grid">
                {user?.rol === "ADMIN_GENERAL" ? (
                  <label className="field admin-form-wide">
                    Municipalidad *
                    <select
                      onChange={(e) =>
                        setForm((curr) => ({ ...curr, municipalidadId: e.target.value }))
                      }
                      required
                      value={form.municipalidadId}
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
                <label className="field admin-form-wide">
                  Nombre del Grupo *
                  <input
                    maxLength={150}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, nombreGrupo: e.target.value }))
                    }
                    required
                    value={form.nombreGrupo}
                  />
                  {showValidationErrors && !form.nombreGrupo.trim() && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      El nombre del grupo es obligatorio.
                    </span>
                  )}
                </label>
                <label className="field">
                  Periodo (Año) *
                  <input
                    max={32767}
                    min={2000}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, periodoYear: e.target.value }))
                    }
                    required
                    type="number"
                    value={form.periodoYear}
                  />
                  {showValidationErrors && (!form.periodoYear || Number(form.periodoYear) < 2000 || Number(form.periodoYear) > 32767) && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      El periodo debe ser un año entre 2000 y 32767.
                    </span>
                  )}
                </label>
                <label className="field">
                  Fecha Límite *
                  <input
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, fechaLimite: e.target.value }))
                    }
                    required
                    type="date"
                    value={form.fechaLimite}
                  />
                  {showValidationErrors && !form.fechaLimite && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      La fecha límite es obligatoria.
                    </span>
                  )}
                </label>
                <div className="field admin-form-wide" style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <span>DNI Representante *</span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      maxLength={8}
                      onChange={(e) =>
                        setForm((curr) => ({ ...curr, dniRepresentante: e.target.value }))
                      }
                      required
                      style={{ flex: 1, marginTop: 0 }}
                      value={form.dniRepresentante}
                    />
                    <button
                      className="admin-button is-secondary"
                      disabled={isSearchingDni}
                      onClick={handleDniLookup}
                      style={{ padding: "0 1rem", height: "38px", minHeight: "38px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      type="button"
                    >
                      {isSearchingDni ? "..." : "Consultar"}
                    </button>
                  </div>
                  {showValidationErrors && (!form.dniRepresentante.trim() || form.dniRepresentante.length !== 8) && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      DNI debe tener exactamente 8 dígitos.
                    </span>
                  )}
                </div>
                <label className="field admin-form-wide">
                  Nombre Representante *
                  <input
                    maxLength={150}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, nombreRepresentante: e.target.value }))
                    }
                    required
                    value={form.nombreRepresentante}
                  />
                  {showValidationErrors && !form.nombreRepresentante.trim() && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      El nombre del representante es obligatorio.
                    </span>
                  )}
                </label>
                <label className="field admin-form-wide">
                  Apellidos Representante *
                  <input
                    maxLength={200}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, apellidosRepresentante: e.target.value }))
                    }
                    required
                    value={form.apellidosRepresentante}
                  />
                  {showValidationErrors && !form.apellidosRepresentante.trim() && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      Los apellidos del representante son obligatorios.
                    </span>
                  )}
                </label>
              </div>

              <div className="admin-form-actions">
                <button
                  className="admin-button is-ghost"
                  onClick={() => setIsFormOpen(false)}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="admin-button is-primary"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Guardando..." : "Crear grupo"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="admin-table-meta">
          <span>{filteredGrupos.length} resultados</span>
          <span>
            {isLoading ? "Cargando..." : `1-${filteredGrupos.length} de ${filteredGrupos.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("periodoYear")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Año{getSortIcon("periodoYear")}
                </th>
                <th onClick={() => handleSort("nombreGrupo")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Nombre del Grupo{getSortIcon("nombreGrupo")}
                </th>
                {user?.rol === "ADMIN_GENERAL" && (
                  <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Municipalidad{getSortIcon("municipalidad")}
                  </th>
                )}
                <th onClick={() => handleSort("representante")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Representante{getSortIcon("representante")}
                </th>
                <th onClick={() => handleSort("dniRepresentante")} style={{ cursor: "pointer", userSelect: "none" }}>
                  DNI Representante{getSortIcon("dniRepresentante")}
                </th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {groupBy ? (
                groupedGrupos && Object.keys(groupedGrupos).map((groupName) => (
                  <Fragment key={groupName}>
                    <tr
                      onClick={() => toggleGroupCollapse(groupName)}
                      style={{ background: "#f8f9fa", cursor: "pointer", userSelect: "none" }}
                    >
                      <td colSpan={user?.rol === "ADMIN_GENERAL" ? 7 : 6} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {collapsedGroups[groupName] ? <LuChevronRight size={16} /> : <LuChevronDown size={16} />}
                          <LuFolder size={18} style={{ color: "#71639e" }} />
                          <span>{groupName}</span>
                          <span style={{ color: "var(--muted)", fontWeight: "normal", fontSize: "0.85rem" }}>
                            ({groupedGrupos[groupName].length})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsedGroups[groupName] && groupedGrupos[groupName].map((g) => renderRow(g))}
                  </Fragment>
                ))
              ) : (
                sortedGrupos.map((g) => renderRow(g))
              )}
              {!isLoading && filteredGrupos.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 7 : 6}>
                    No se encontraron grupos de trabajo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
