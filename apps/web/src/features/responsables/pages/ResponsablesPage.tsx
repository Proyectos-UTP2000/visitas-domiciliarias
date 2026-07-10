import { useState, useEffect } from "react";
import { getStoredSession } from "../../auth/auth-storage";
import {
  listResponsables,
  createResponsable,
  updateResponsable,
  setResponsableActivo,
  archiveResponsable,
} from "../responsables-api";
import type { ResponsableRecord, ResponsableFormState } from "../responsables-types";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";

import { LuSearch, LuPlus, LuPencil, LuTrash2, LuCircleCheck, LuCircleX } from "react-icons/lu";
import { consultarDni } from "../../dni/dni-api";

const INITIAL_FORM: ResponsableFormState = {
  municipalidadId: "",
  tipoDocumento: "DNI",
  dni: "",
  nombres: "",
  apellidos: "",
  celular: "",
  email: "",
};

export default function ResponsablesPage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<ResponsableRecord[]>([]);
  const [munis, setMunis] = useState<MunicipalidadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMuni, setFilterMuni] = useState("");
  const [filterActivo, setFilterActivo] = useState("TODOS");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<ResponsableFormState>(INITIAL_FORM);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  async function handleDniLookup() {
    const dniVal = form.dni.trim();
    if (!/^\d{8}$/.test(dniVal)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    setIsSearchingDni(true);
    setError(null);
    try {
      const datos = await consultarDni(dniVal);
      setForm((curr) => ({
        ...curr,
        nombres: datos.nombres,
        apellidos: `${datos.ape_paterno} ${datos.ape_materno}`,
      }));
      setMessage("Datos del DNI cargados exitosamente.");
    } catch (err: any) {
      setError(err.message || "No se encontró el DNI o hubo un error al realizar la consulta.");
    } finally {
      setIsSearchingDni(false);
    }
  }

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_GENERAL") {
        listMunicipalidades()
          .then(setMunis)
          .catch(console.error);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const muniId = user?.rol === "ADMIN_MUNICIPAL" ? user.municipalidadId : null;
      const data = await listResponsables(muniId);
      setRecords(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar responsables");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setModalMode("CREATE");
    setSelectedId(null);
    setForm({
      ...INITIAL_FORM,
      municipalidadId: user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : "",
    });
    setValidationErrors({});
    setError(null);
    setMessage(null);
    setShowModal(true);
  }

  function handleOpenEdit(record: ResponsableRecord) {
    setModalMode("EDIT");
    setSelectedId(record.id);
    setForm({
      municipalidadId: record.municipalidadId,
      tipoDocumento: record.tipoDocumento,
      dni: record.dni,
      nombres: record.nombres,
      apellidos: record.apellidos,
      celular: record.celular || "",
      email: record.email || "",
    });
    setValidationErrors({});
    setError(null);
    setMessage(null);
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setValidationErrors({});

    const isGeneral = user?.rol === "ADMIN_GENERAL";
    if (isGeneral && !form.municipalidadId) {
      setValidationErrors({ municipalidadId: ["La municipalidad es obligatoria"] });
      return;
    }
    if (!form.dni.trim()) {
      setValidationErrors({ dni: ["El número de documento es obligatorio"] });
      return;
    }
    if (!form.nombres.trim()) {
      setValidationErrors({ nombres: ["Los nombres son obligatorios"] });
      return;
    }
    if (!form.apellidos.trim()) {
      setValidationErrors({ apellidos: ["Los apellidos son obligatorios"] });
      return;
    }
    if (form.celular && !/^\d{9}$/.test(form.celular)) {
      setValidationErrors({ celular: ["El celular debe tener exactamente 9 dígitos"] });
      return;
    }

    try {
      if (modalMode === "CREATE") {
        await createResponsable(form);
        setMessage("Responsable creado correctamente");
      } else if (selectedId) {
        await updateResponsable(selectedId, {
          tipoDocumento: form.tipoDocumento,
          dni: form.dni,
          nombres: form.nombres,
          apellidos: form.apellidos,
          celular: form.celular,
          email: form.email,
        });
        setMessage("Responsable actualizado correctamente");
      }
      setShowModal(false);
      loadData();
    } catch (e: any) {
      if (e.details) {
        setValidationErrors(e.details);
      } else {
        setError(e.message || "Ocurrió un error al guardar");
      }
    }
  }

  async function handleToggleActivo(record: ResponsableRecord) {
    setError(null);
    setMessage(null);
    try {
      await setResponsableActivo(record.id, !record.activo);
      setMessage(`Estado del responsable actualizado a ${!record.activo ? "Activo" : "Inactivo"}`);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado");
    }
  }

  async function handleArchive(id: string) {
    setError(null);
    setMessage(null);
    alert("Eliminación Lógica: Por Implementar");
  }

  const filtered = records.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      r.dni.includes(term) ||
      r.nombres.toLowerCase().includes(term) ||
      r.apellidos.toLowerCase().includes(term);

    const matchesMuni = !filterMuni || r.municipalidadId === filterMuni;

    const matchesActivo =
      filterActivo === "TODOS" ||
      (filterActivo === "ACTIVOS" && r.activo) ||
      (filterActivo === "INACTIVOS" && !r.activo);

    return matchesSearch && matchesMuni && matchesActivo;
  });

  return (
    <div className="admin-page-container">
      <section className="admin-page-heading">
        <div>
          <h1>Padrón Nominal: Responsables</h1>
          <div className="breadcrumb-card" aria-label="Ruta actual">
            <span>Inicio</span>
            <span className="separator">/</span>
            <span className="current">Responsables</span>
          </div>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Responsables">
        <div className="admin-actions-row">
          <label className="admin-search-field">
            <LuSearch style={{ marginRight: "0.5rem" }} />
            <input
              type="search"
              placeholder="Buscar por DNI o Nombres..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="admin-actions-group">
            {user?.rol === "ADMIN_GENERAL" && (
              <select
                className="admin-select"
                value={filterMuni}
                onChange={(e) => setFilterMuni(e.target.value)}
                style={{ width: "200px" }}
              >
                <option value="">Todas las Municipalidades</option>
                {munis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            )}

            <select
              className="admin-select"
              value={filterActivo}
              onChange={(e) => setFilterActivo(e.target.value)}
              style={{ width: "130px" }}
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVOS">Activos</option>
              <option value="INACTIVOS">Inactivos</option>
            </select>

            <button className="admin-button is-primary" onClick={handleOpenCreate} type="button">
              <LuPlus size={18} style={{ marginRight: "0.5rem" }} />
              Nuevo Responsable
            </button>
          </div>
        </div>

        {message && <p className="alert alert-success" style={{ marginTop: "1rem" }}>{message}</p>}
        {error && <p className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</p>}

        <div className="admin-table-meta" style={{ marginTop: "1rem" }}>
          <span>{filtered.length} Responsables encontrados</span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Apellidos y Nombres</th>
                <th>Celular</th>
                <th>Email</th>
                <th>Estado</th>
                <th style={{ width: "120px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    Cargando responsables...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-empty-cell">
                    No se encontraron responsables registrados.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="badge badge-light" style={{ marginRight: "0.5rem" }}>
                        {r.tipoDocumento}
                      </span>
                      <strong>{r.dni}</strong>
                    </td>
                    <td>{r.apellidos}, {r.nombres}</td>
                    <td>{r.celular || "-"}</td>
                    <td>{r.email || "-"}</td>
                    <td>
                      <span className={`badge ${r.activo ? "badge-success" : "badge-error"}`}>
                        {r.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          className="admin-icon-button"
                          onClick={() => handleOpenEdit(r)}
                          title="Editar"
                        >
                          <LuPencil size={16} />
                        </button>
                        <button
                          className="admin-icon-button"
                          onClick={() => handleToggleActivo(r)}
                          title={r.activo ? "Desactivar" : "Activar"}
                        >
                          {r.activo ? (
                            <LuCircleCheck size={16} style={{ color: "var(--success)" }} />
                          ) : (
                            <LuCircleX size={16} style={{ color: "var(--muted)" }} />
                          )}
                        </button>
                        <button
                          className="admin-icon-button is-danger"
                          onClick={() => handleArchive(r.id)}
                          title="Archivar"
                        >
                          <LuTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleSubmit} style={{ maxWidth: "900px" }}>
            <div className="admin-modal-header">
              <h2>{modalMode === "CREATE" ? "Nuevo Responsable" : "Editar Responsable"}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-form-grid" style={{ padding: "1.5rem" }}>
              {user?.rol === "ADMIN_GENERAL" && modalMode === "CREATE" && (
                <label className="field admin-form-wide">
                  <span>Municipalidad *</span>
                  <select
                    value={form.municipalidadId}
                    onChange={(e) => setForm((f) => ({ ...f, municipalidadId: e.target.value }))}
                  >
                    <option value="">Seleccionar municipalidad...</option>
                    {munis.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                  {validationErrors.municipalidadId?.map((err, i) => (
                    <span key={i} className="field-error">{err}</span>
                  ))}
                </label>
              )}

              <label className="field">
                <span>Tipo Documento *</span>
                <select
                  value={form.tipoDocumento}
                  onChange={(e) => setForm((f) => ({ ...f, tipoDocumento: e.target.value }))}
                >
                  <option value="DNI">DNI (Nacional)</option>
                  <option value="CE">C.E. (Extranjería)</option>
                  <option value="OTROS">Otros</option>
                </select>
              </label>

              <div className="field">
                <span>Número Documento *</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 45678901"
                    value={form.dni}
                    onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  {form.tipoDocumento === "DNI" && (
                    <button
                      type="button"
                      className="admin-button"
                      onClick={handleDniLookup}
                      disabled={isSearchingDni || form.dni.trim().length !== 8}
                      style={{ height: "2.9rem", padding: "0 1rem" }}
                    >
                      {isSearchingDni ? "..." : "Buscar"}
                    </button>
                  )}
                </div>
                {validationErrors.dni?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </div>

              <label className="field">
                <span>Nombres *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ana María"
                  value={form.nombres}
                  onChange={(e) => setForm((f) => ({ ...f, nombres: e.target.value }))}
                />
                {validationErrors.nombres?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field">
                <span>Apellidos *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Quispe Flores"
                  value={form.apellidos}
                  onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                />
                {validationErrors.apellidos?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field">
                <span>Celular</span>
                <input
                  type="tel"
                  placeholder="Ej. 987654321"
                  value={form.celular}
                  onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))}
                />
                {validationErrors.celular?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="Ej. ana.quispe@gmail.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
                {validationErrors.email?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>
            </div>

            <div className="admin-form-actions" style={{ padding: "1rem 1.5rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setShowModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit">
                {modalMode === "CREATE" ? "Crear Responsable" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
