import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../../../shared/api";
import {
  archiveTipoActorSocial,
  createTipoActorSocial,
  listTiposActorSocial,
  setTipoActorSocialActivo,
  updateTipoActorSocial,
} from "../tipos-actor-social-api";
import { getTipoActorSocialFormTitle } from "../tipos-actor-social-form";
import type {
  TipoActorSocialFormState,
  TipoActorSocialRecord,
} from "../tipos-actor-social-types";
import {
  buildTipoActorSocialPayload,
  emptyTipoActorSocialForm,
  filterTiposActorSocial,
  toTipoActorSocialForm,
} from "../tipos-actor-social-utils";

export function TiposActorSocialPage() {
  const [records, setRecords] = useState<TipoActorSocialRecord[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<TipoActorSocialFormState>(emptyTipoActorSocialForm);
  const [editingRecord, setEditingRecord] = useState<TipoActorSocialRecord | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredRecords = useMemo(
    () => filterTiposActorSocial(records, query),
    [records, query],
  );

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setIsLoading(true);
    setError(null);
    try {
      setRecords(await listTiposActorSocial());
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingRecord(null);
    setForm(emptyTipoActorSocialForm);
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function openEditForm(record: TipoActorSocialRecord) {
    setEditingRecord(record);
    setForm(toTipoActorSocialForm(record));
    setError(null);
    setMessage(null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingRecord(null);
    setForm(emptyTipoActorSocialForm);
  }

  function updateForm<K extends keyof TipoActorSocialFormState>(
    field: K,
    value: TipoActorSocialFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = buildTipoActorSocialPayload(form);
      const saved = editingRecord
        ? await updateTipoActorSocial(editingRecord.id, payload)
        : await createTipoActorSocial(payload);

      setRecords((current) => upsertRecord(current, saved));
      setMessage(
        editingRecord
          ? "Tipo de actor social actualizado correctamente."
          : "Tipo de actor social creado correctamente.",
      );
      closeForm();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivo(record: TipoActorSocialRecord) {
    const nextActivo = !record.activo;
    const action = nextActivo ? "activar" : "inactivar";
    const confirmed = window.confirm(
      `¿Deseas ${action} el tipo de actor social ${record.tipoActor}?`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const updated = await setTipoActorSocialActivo(record.id, nextActivo);
      setRecords((current) => upsertRecord(current, updated));
      setMessage(
        nextActivo
          ? "Tipo de actor social activado correctamente."
          : "Tipo de actor social inactivado correctamente.",
      );
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  async function handleArchivar(record: TipoActorSocialRecord) {
    const confirmed = window.confirm(
      `¿Deseas archivar el tipo de actor social ${record.tipoActor}? Esto lo retirará del uso normal.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await archiveTipoActorSocial(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setMessage("Tipo de actor social archivado correctamente.");
    } catch (archiveError) {
      setError(getErrorMessage(archiveError));
    }
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Tipos de Actor Social</h1>
          <p>
            Gestiona los tipos de actor social, sus tarifas de pago y su orden operativo.
          </p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Configuración</span>
          <strong>Tipo Actor Social</strong>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Tipos de Actor Social">
        <div className="admin-actions-row">
          <label className="admin-search-field">
            <span aria-hidden="true">⌕</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por tipo de actor o código..."
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
              + Nuevo tipo de actor social
            </button>
          </div>
        </div>

        {message ? <p className="alert alert-success">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}

        {isFormOpen ? (
          <div
            aria-labelledby="tipo-actor-modal-title"
            aria-modal="true"
            className="admin-modal-backdrop"
            role="dialog"
          >
            <form className="admin-modal" onSubmit={handleSubmit}>
              <div className="admin-modal-header">
                <div>
                  <h2 id="tipo-actor-modal-title">
                    {getTipoActorSocialFormTitle(editingRecord)}
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
                  Código
                  <input
                    maxLength={3}
                    onChange={(event) => updateForm("codigo", event.target.value)}
                    required
                    value={form.codigo}
                  />
                </label>
                <label className="field">
                  Orden
                  <input
                    min={0}
                    max={32767}
                    onChange={(event) => updateForm("orden", event.target.value)}
                    required
                    type="number"
                    value={form.orden}
                  />
                </label>
                <label className="field admin-form-wide">
                  Tipo de Actor
                  <input
                    maxLength={150}
                    onChange={(event) => updateForm("tipoActor", event.target.value)}
                    required
                    value={form.tipoActor}
                  />
                </label>
                <label className="field">
                  Tarifa Rural (S/.)
                  <input
                    min={0}
                    onChange={(event) => updateForm("tarifaRural", event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={form.tarifaRural}
                  />
                </label>
                <label className="field">
                  Tarifa Urbana (S/.)
                  <input
                    min={0}
                    onChange={(event) => updateForm("tarifaUrbana", event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={form.tarifaUrbana}
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
                  {isSaving ? "Guardando..." : "Guardar tipo"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="admin-table-meta">
          <span>{filteredRecords.length} resultados</span>
          <span>
            {isLoading
              ? "Cargando..."
              : `1-${filteredRecords.length} de ${filteredRecords.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Orden</th>
                <th>Tipo de Actor</th>
                <th>Tarifa Rural</th>
                <th>Tarifa Urbana</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td>{record.codigo}</td>
                  <td>{record.orden}</td>
                  <td>{record.tipoActor}</td>
                  <td>S/. {Number(record.tarifaRural).toFixed(2)}</td>
                  <td>S/. {Number(record.tarifaUrbana).toFixed(2)}</td>
                  <td>
                    <span
                      className={
                        record.activo
                          ? "status-pill is-active"
                          : "status-pill is-muted"
                      }
                    >
                      {record.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        className="admin-icon-button"
                        onClick={() => openEditForm(record)}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() => void handleToggleActivo(record)}
                        type="button"
                      >
                        {record.activo ? "Inactivar" : "Activar"}
                      </button>
                      <button
                        className="admin-icon-button"
                        onClick={() => void handleArchivar(record)}
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
                  <td className="admin-empty-cell" colSpan={7}>
                    No se encontraron tipos de actor social.
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

function upsertRecord(
  records: TipoActorSocialRecord[],
  record: TipoActorSocialRecord,
) {
  const exists = records.some((item) => item.id === record.id);

  if (!exists) {
    return [record, ...records];
  }

  return records.map((item) =>
    item.id === record.id ? record : item,
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
