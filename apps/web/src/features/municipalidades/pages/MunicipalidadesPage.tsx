import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api";
import {
  createMunicipalidad,
  listMunicipalidades,
  setMunicipalidadActivo,
  updateMunicipalidad,
} from "../municipalidades-api";
import { getMunicipalidadFormTitle } from "../municipalidades-form";
import type {
  MunicipalidadFormState,
  MunicipalidadRecord,
} from "../municipalidades-types";
import {
  buildMunicipalidadPayload,
  emptyMunicipalidadForm,
  filterMunicipalidades,
  formatTipoMunicipalidad,
  toMunicipalidadForm,
} from "../municipalidades-utils";

export function MunicipalidadesPage() {
  const [municipalidades, setMunicipalidades] = useState<
    MunicipalidadRecord[]
  >([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<MunicipalidadFormState>(
    emptyMunicipalidadForm,
  );
  const [editingMunicipalidad, setEditingMunicipalidad] =
    useState<MunicipalidadRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredMunicipalidades = useMemo(
    () => filterMunicipalidades(municipalidades, query),
    [municipalidades, query],
  );

  useEffect(() => {
    void loadMunicipalidades();
  }, []);

  async function loadMunicipalidades() {
    setIsLoading(true);
    setError(null);

    try {
      setMunicipalidades(await listMunicipalidades());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingMunicipalidad(null);
    setForm(emptyMunicipalidadForm);
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(municipalidad: MunicipalidadRecord) {
    setEditingMunicipalidad(municipalidad);
    setForm(toMunicipalidadForm(municipalidad));
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingMunicipalidad(null);
    setForm(emptyMunicipalidadForm);
  }

  function updateForm<K extends keyof MunicipalidadFormState>(
    field: K,
    value: MunicipalidadFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildMunicipalidadPayload(form);
      const saved = editingMunicipalidad
        ? await updateMunicipalidad(editingMunicipalidad.id, payload)
        : await createMunicipalidad(payload);

      setMunicipalidades((current) => upsertMunicipalidad(current, saved));
      setMessage(
        editingMunicipalidad
          ? "Municipalidad actualizada correctamente."
          : "Municipalidad creada correctamente.",
      );
      closeForm();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(municipalidad: MunicipalidadRecord) {
    const nextActivo = !municipalidad.activo;
    const action = nextActivo ? "activar" : "inactivar";
    const confirmed = window.confirm(
      `¿Deseas ${action} ${municipalidad.nombre}?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const updated = await setMunicipalidadActivo(
        municipalidad.id,
        nextActivo,
      );
      setMunicipalidades((current) => upsertMunicipalidad(current, updated));
      setMessage(
        nextActivo
          ? "Municipalidad activada correctamente."
          : "Municipalidad inactivada correctamente.",
      );
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Municipalidades</h1>
          <p>
            Gestiona y consulta las municipalidades distritales y provinciales
            registradas en el sistema.
          </p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Configuración</span>
          <strong>Municipalidades</strong>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Municipalidades">
        <div className="admin-actions-row">
          <label className="admin-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por ubigeo, departamento, provincia, distrito o municipalidad..."
              type="search"
              value={query}
            />
          </label>

          <div className="admin-actions-group">
            <button className="admin-button is-ghost" type="button">
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
              + Nueva municipalidad
            </button>
          </div>
        </div>

        {message ? <p className="alert alert-success">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

        {isFormOpen ? (
          <div
            aria-labelledby="municipalidad-modal-title"
            aria-modal="true"
            className="admin-modal-backdrop"
            role="dialog"
          >
            <form className="admin-modal" onSubmit={handleSubmit}>
              <div className="admin-modal-header">
                <div>
                  <h2 id="municipalidad-modal-title">
                    {getMunicipalidadFormTitle(editingMunicipalidad)}
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
                  Ubigeo
                  <input
                    maxLength={6}
                    minLength={6}
                    onChange={(event) => updateForm("ubigeo", event.target.value)}
                    required
                    value={form.ubigeo}
                  />
                </label>
                <label className="field">
                  Departamento
                  <input
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("departamento", event.target.value)
                    }
                    required
                    value={form.departamento}
                  />
                </label>
                <label className="field">
                  Provincia
                  <input
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("provincia", event.target.value)
                    }
                    required
                    value={form.provincia}
                  />
                </label>
                <label className="field">
                  Distrito
                  <input
                    maxLength={100}
                    onChange={(event) =>
                      updateForm("distrito", event.target.value)
                    }
                    required
                    value={form.distrito}
                  />
                </label>
                <label className="field">
                  Código
                  <input
                    maxLength={3}
                    onChange={(event) => updateForm("codigo", event.target.value)}
                    required
                    value={form.codigo}
                  />
                </label>
                <label className="field admin-form-wide">
                  Municipalidad
                  <input
                    maxLength={150}
                    onChange={(event) => updateForm("nombre", event.target.value)}
                    required
                    value={form.nombre}
                  />
                </label>
                <label className="field">
                  Provincial/Distrital
                  <select
                    onChange={(event) =>
                      updateForm(
                        "tipo",
                        event.target.value as MunicipalidadFormState["tipo"],
                      )
                    }
                    required
                    value={form.tipo}
                  >
                    <option value="DISTRITAL">Distrital</option>
                    <option value="PROVINCIAL">Provincial</option>
                  </select>
                </label>
                <label className="field">
                  Prioridad
                  <input
                    min={0}
                    max={32767}
                    onChange={(event) =>
                      updateForm("prioridad", event.target.value)
                    }
                    required
                    type="number"
                    value={form.prioridad}
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
                  {isSaving ? "Guardando..." : "Guardar municipalidad"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="admin-table-meta">
          <span>{filteredMunicipalidades.length} resultados</span>
          <span>
            {isLoading
              ? "Cargando..."
              : `1-${filteredMunicipalidades.length} de ${filteredMunicipalidades.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ubigeo</th>
                <th>Departamento</th>
                <th>Provincia</th>
                <th>Distrito</th>
                <th>Código</th>
                <th>Municipalidad</th>
                <th>Provincial/Distrital</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMunicipalidades.map((municipalidad) => (
                <tr key={municipalidad.id}>
                  <td>{municipalidad.ubigeo}</td>
                  <td>{municipalidad.departamento}</td>
                  <td>{municipalidad.provincia}</td>
                  <td>{municipalidad.distrito}</td>
                  <td>{municipalidad.codigo || "—"}</td>
                  <td>{municipalidad.nombre}</td>
                  <td>{formatTipoMunicipalidad(municipalidad.tipo)}</td>
                  <td>
                    <span
                      className={
                        municipalidad.activo
                          ? "status-pill is-active"
                          : "status-pill is-muted"
                      }
                    >
                      {municipalidad.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-button"
                        onClick={() => openEditForm(municipalidad)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() => void handleToggleActivo(municipalidad)}
                        type="button"
                      >
                        {municipalidad.activo ? "Inactivar" : "Activar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredMunicipalidades.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={9}>
                    No se encontraron municipalidades para la búsqueda actual.
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

function upsertMunicipalidad(
  municipalidades: MunicipalidadRecord[],
  municipalidad: MunicipalidadRecord,
) {
  const exists = municipalidades.some((item) => item.id === municipalidad.id);

  if (!exists) {
    return [municipalidad, ...municipalidades];
  }

  return municipalidades.map((item) =>
    item.id === municipalidad.id ? municipalidad : item,
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
