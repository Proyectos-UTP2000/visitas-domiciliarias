import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
    }
    void loadData();
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

  const filteredGrupos = useMemo(() => {
    return filterGrupos(
      grupos,
      query,
      estadoFilter,
      periodoFilter ? Number(periodoFilter) : undefined,
      muniFilter,
    );
  }, [grupos, query, estadoFilter, periodoFilter, muniFilter]);

  function openCreate() {
    setForm({
      ...emptyGrupoForm,
      municipalidadId: user?.municipalidadId || "",
    });
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    const todayStr = new Date().toISOString().split("T")[0];
    if (form.fechaLimite < todayStr) {
      setError("La fecha límite debe ser una fecha futura (a partir de hoy).");
      setIsSaving(false);
      return;
    }

    if (!/^\d{8}$/.test(form.dniRepresentante)) {
      setError("El DNI del representante debe tener exactamente 8 dígitos.");
      setIsSaving(false);
      return;
    }

    const year = Number(form.periodoYear);
    if (isNaN(year) || year < 2000 || year > 32767) {
      setError("El período anual debe ser un número válido entre 2000 y 32767.");
      setIsSaving(false);
      return;
    }

    const resolvedMuniId = user?.rol === "ADMIN_GENERAL" ? form.municipalidadId : user?.municipalidadId;
    if (!resolvedMuniId) {
      setError("Debe seleccionar una municipalidad.");
      setIsSaving(false);
      return;
    }

    try {
      const saved = await createGrupo({
        municipalidadId: resolvedMuniId,
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

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

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

          <div className="admin-actions-group">
            <button
              className={`admin-button is-ghost${showFilters ? " is-active" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
              type="button"
            >
              Filtros
            </button>
            <button
              className="admin-button is-primary"
              onClick={openCreate}
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
              display: "flex",
              gap: "1rem",
              marginBottom: "1rem",
              padding: "1rem",
              background: "var(--color-bg-alt, rgba(0,0,0,0.02))",
              borderRadius: "8px",
              border: "1px solid var(--color-border, rgba(0,0,0,0.08))",
            }}
          >
            <label className="field" style={{ margin: 0, flex: 1 }}>
              Estado
              <select
                onChange={(e) => setEstadoFilter(e.target.value)}
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={estadoFilter}
              >
                <option value="">Todos</option>
                <option value="BORRADOR">Borrador</option>
                <option value="REGISTRADO">Registrado</option>
                <option value="OBSERVADO">Observado</option>
                <option value="VALIDADO">Validado</option>
              </select>
            </label>
            <label className="field" style={{ margin: 0, flex: 1 }}>
              Periodo
              <select
                onChange={(e) => setPeriodoFilter(e.target.value)}
                style={{ width: "100%", marginTop: "0.25rem" }}
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
              <label className="field" style={{ margin: 0, flex: 1 }}>
                Municipalidad
                <select
                  onChange={(e) => setMuniFilter(e.target.value)}
                  style={{ width: "100%", marginTop: "0.25rem" }}
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

        {message ? <p className="alert alert-success">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

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
                    Municipalidad
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
                  </label>
                ) : null}
                <label className="field admin-form-wide">
                  Nombre del Grupo
                  <input
                    maxLength={150}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, nombreGrupo: e.target.value }))
                    }
                    required
                    value={form.nombreGrupo}
                  />
                </label>
                <label className="field">
                  Periodo (Año)
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
                </label>
                <label className="field">
                  Fecha Límite
                  <input
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, fechaLimite: e.target.value }))
                    }
                    required
                    type="date"
                    value={form.fechaLimite}
                  />
                </label>
                <div className="field admin-form-wide">
                  DNI Representante
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
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
                </div>
                <label className="field admin-form-wide">
                  Nombre Representante
                  <input
                    maxLength={150}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, nombreRepresentante: e.target.value }))
                    }
                    required
                    value={form.nombreRepresentante}
                  />
                </label>
                <label className="field admin-form-wide">
                  Apellidos Representante
                  <input
                    maxLength={200}
                    onChange={(e) =>
                      setForm((curr) => ({ ...curr, apellidosRepresentante: e.target.value }))
                    }
                    required
                    value={form.apellidosRepresentante}
                  />
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
                <button className="admin-button is-primary" disabled={isSaving} type="submit">
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
                <th>Año</th>
                <th>Nombre del Grupo</th>
                {user?.rol === "ADMIN_GENERAL" && <th>Municipalidad</th>}
                <th>Representante</th>
                <th>Fecha Límite</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrupos.map((g) => (
                <tr key={g.id}>
                  <td>{g.periodoYear}</td>
                  <td>{g.nombreGrupo}</td>
                  {user?.rol === "ADMIN_GENERAL" && (
                    <td>{munisMap[g.municipalidadId] || "Cargando..."}</td>
                  )}
                  <td>{`${g.nombreRepresentante} ${g.apellidosRepresentante}`}</td>
                  <td>{new Date(g.fechaLimite).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-pill is-active`}>{g.estado}</span>
                  </td>
                  <td>
                    <button
                      className="admin-icon-button"
                      onClick={() => navigate(`/grupos-trabajo/${g.id}`)}
                      type="button"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
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
