import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api";
import {
  archiveEntidad,
  createEntidad,
  listEntidades,
  setEntidadActivo,
  updateEntidad,
} from "../entidades-api";
import { getEntidadFormTitle } from "../entidades-form";
import type {
  EntidadFormState,
  EntidadRecord,
} from "../entidades-types";
import {
  buildEntidadPayload,
  emptyEntidadForm,
  filterEntidades,
  toEntidadForm,
} from "../entidades-utils";

export function EntidadesPage() {
  const [entidades, setEntidades] = useState<EntidadRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<EntidadFormState>(emptyEntidadForm);
  const [editingEntidad, setEditingEntidad] = useState<EntidadRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [tipoEntidadFilter, setTipoEntidadFilter] = useState("");

  const filteredEntidades = useMemo(
    () => filterEntidades(entidades, query, statusFilter, tipoEntidadFilter),
    [entidades, query, statusFilter, tipoEntidadFilter],
  );

  useEffect(() => {
    void loadEntidades();
  }, []);

  async function loadEntidades() {
    setIsLoading(true);
    setError(null);
    try {
      setEntidades(await listEntidades());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingEntidad(null);
    setForm(emptyEntidadForm);
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(entidad: EntidadRecord) {
    setEditingEntidad(entidad);
    setForm(toEntidadForm(entidad));
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingEntidad(null);
    setForm(emptyEntidadForm);
  }

  function updateForm<K extends keyof EntidadFormState>(
    field: K,
    value: EntidadFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildEntidadPayload(form);
      const saved = editingEntidad
        ? await updateEntidad(editingEntidad.id, payload)
        : await createEntidad(payload);

      setEntidades((current) => upsertEntidad(current, saved));
      setMessage(
        editingEntidad
          ? "Entidad actualizada correctamente."
          : "Entidad creada correctamente.",
      );
      closeForm();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(entidad: EntidadRecord) {
    const nextActivo = !entidad.activo;
    const action = nextActivo ? "activar" : "inactivar";
    const confirmed = window.confirm(
      `¿Deseas ${action} la entidad ${entidad.nombre}?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const updated = await setEntidadActivo(entidad.id, nextActivo);
      setEntidades((current) => upsertEntidad(current, updated));
      setMessage(
        nextActivo
          ? "Entidad activada correctamente."
          : "Entidad inactivada correctamente.",
      );
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  async function handleArchivar(entidad: EntidadRecord) {
    const confirmed = window.confirm(
      `¿Deseas archivar la entidad ${entidad.nombre}? Esto la retirará del uso normal.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await archiveEntidad(entidad.id);
      setEntidades((current) => current.filter((item) => item.id !== entidad.id));
      setMessage("Entidad archivada correctamente.");
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    }
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Entidades</h1>
          <p>
            Gestiona y consulta las entidades registradas en el sistema.
          </p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Configuración</span>
          <strong>Entidad</strong>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Entidades">
        <div className="admin-actions-row">
          <label className="admin-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tipo de entidad, código o nombre..."
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
            <button className="admin-button is-ghost" type="button">
              Exportar
            </button>
            <button
              className="admin-button is-primary"
              onClick={openCreateForm}
              type="button"
            >
              + Nueva entidad
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
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={statusFilter}
              >
                <option value="">Todos</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </label>
            <label className="field" style={{ margin: 0, flex: 1 }}>
              Tipo de Entidad
              <select
                onChange={(e) => setTipoEntidadFilter(e.target.value)}
                style={{ width: "100%", marginTop: "0.25rem" }}
                value={tipoEntidadFilter}
              >
                <option value="">Todos</option>
                <option value="Otras entidades públicas">Otras entidades públicas</option>
                <option value="Entidad Privada">Entidad Privada</option>
                <option value="Municipalidades">Municipalidades</option>
                <option value="Establecimiento Salud">Establecimiento Salud</option>
              </select>
            </label>
          </div>
        ) : null}

        {message ? <p className="alert alert-success">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

        {isFormOpen ? (
          <div
            aria-labelledby="entidad-modal-title"
            aria-modal="true"
            className="admin-modal-backdrop"
            role="dialog"
          >
            <form className="admin-modal" onSubmit={handleSubmit}>
              <div className="admin-modal-header">
                <div>
                  <h2 id="entidad-modal-title">
                    {getEntidadFormTitle(editingEntidad)}
                  </h2>
                  <p>Completa los datos requeridos por el backend V1.</p>
                </div>
                <button
                  aria-label="Cerrar modal"
                  className="admin-modal-close"
                  onClick={closeForm}
                  type="button"
                >
                  ×
                </button>
              </div>

              <div className="admin-form-grid">
                <label className="field">
                  Tipo de Entidad
                  <select
                    onChange={(event) =>
                      updateForm("tipoEntidad", event.target.value)
                    }
                    required
                    value={form.tipoEntidad}
                  >
                    <option value="">Seleccione...</option>
                    <option value="Otras entidades públicas">Otras entidades públicas</option>
                    <option value="Entidad Privada">Entidad Privada</option>
                    <option value="Municipalidades">Municipalidades</option>
                    <option value="Establecimiento Salud">Establecimiento Salud</option>
                  </select>
                </label>
                <label className="field">
                  Código
                  <input
                    maxLength={100}
                    onChange={(event) => updateForm("codigo", event.target.value)}
                    required
                    value={form.codigo}
                  />
                </label>
                <label className="field admin-form-wide">
                  Nombre de Entidad
                  <input
                    maxLength={150}
                    onChange={(event) => updateForm("nombre", event.target.value)}
                    required
                    value={form.nombre}
                  />
                </label>
              </div>

              <div className="admin-form-actions">
                <button
                  className="admin-button is-ghost"
                  onClick={closeForm}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="admin-button is-primary"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Guardando..." : "Guardar entidad"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="admin-table-meta">
          <span>{filteredEntidades.length} resultados</span>
          <span>
            {isLoading
              ? "Cargando..."
              : `1-${filteredEntidades.length} de ${filteredEntidades.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tipo de Entidad</th>
                <th>Código</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntidades.map((entidad) => (
                <tr key={entidad.id}>
                  <td>{entidad.tipoEntidad}</td>
                  <td>{entidad.codigo}</td>
                  <td>{entidad.nombre}</td>
                  <td>
                    <span
                      className={
                        entidad.activo
                          ? "status-pill is-active"
                          : "status-pill is-muted"
                      }
                    >
                      {entidad.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-button"
                        onClick={() => openEditForm(entidad)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() => void handleToggleActivo(entidad)}
                        type="button"
                      >
                        {entidad.activo ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() => void handleArchivar(entidad)}
                        type="button"
                      >
                        Archivar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredEntidades.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={5}>
                    No se encontraron entidades para la búsqueda actual.
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

function upsertEntidad(
  entidades: EntidadRecord[],
  entidad: EntidadRecord,
) {
  const exists = entidades.some((item) => item.id === entidad.id);

  if (!exists) {
    return [entidad, ...entidades];
  }

  return entidades.map((item) =>
    item.id === entidad.id ? entidad : item,
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudo completar la operación.";
}
