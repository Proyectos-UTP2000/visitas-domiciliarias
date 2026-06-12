import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listCargos } from "../../cargos-miembro-grupo/cargos-api";
import type { CargoMiembroRecord } from "../../cargos-miembro-grupo/cargos-types";
import {
  createEstablecimiento,
  createMiembro,
  listGrupos,
  setMiembroActivo,
  updateMiembroContacto,
} from "../grupos-api";
import type {
  GrupoEstablecimientoFormState,
  GrupoEstablecimientoRecord,
  GrupoTrabajoRecord,
  MiembroGrupoFormState,
  MiembroGrupoRecord,
} from "../grupos-types";
import {
  emptyEstablecimientoForm,
  emptyMiembroForm,
  filterMiembros,
} from "../grupos-utils";

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [grupo, setGrupo] = useState<GrupoTrabajoRecord | null>(null);
  const [cargos, setCargos] = useState<CargoMiembroRecord[]>([]);
  const [establecimientos, setEstablecimientos] = useState<GrupoEstablecimientoRecord[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupoRecord[]>([]);
  const [cargosMap, setCargosMap] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<"estab" | "miembro">("estab");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Modals
  const [isEstModalOpen, setIsEstModalOpen] = useState(false);
  const [isMibModalOpen, setIsMibModalOpen] = useState(false);
  const [isMibEditOpen, setIsMibEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [estForm, setEstForm] = useState<GrupoEstablecimientoFormState>(emptyEstablecimientoForm);
  const [mibForm, setMibForm] = useState<MiembroGrupoFormState>(emptyMiembroForm);
  const [editingMiembro, setEditingMiembro] = useState<MiembroGrupoRecord | null>(null);

  // Filters for members
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [estFilter, setEstFilter] = useState("");

  useEffect(() => {
    void loadDetails();
  }, [id]);

  async function loadDetails() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [allGroups, cargoList] = await Promise.all([
        listGrupos(),
        listCargos(),
      ]);

      const currentGrupo = allGroups.find((g) => g.id === id) as any;
      if (!currentGrupo) {
        setError("Grupo de trabajo no encontrado.");
        return;
      }

      setGrupo(currentGrupo);
      setCargos(cargoList.filter((c) => c.activo));
      setMiembros(currentGrupo.miembros || []);
      setEstablecimientos(currentGrupo.establecimientos || []);

      const map: Record<string, string> = {};
      cargoList.forEach((c) => {
        map[c.id] = c.nombre;
      });
      setCargosMap(map);
    } catch (err: any) {
      setError(err.message || "Error al cargar los detalles.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredMiembros = useMemo(() => {
    return filterMiembros(miembros, query, statusFilter, cargoFilter, estFilter);
  }, [miembros, query, statusFilter, cargoFilter, estFilter]);

  async function handleAddEstablecimiento(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setMessage(null);

    try {
      const saved = await createEstablecimiento(id, {
        nombre: estForm.nombre.trim(),
        codigo: estForm.codigo.trim() || null,
        direccion: estForm.direccion.trim() || null,
      });
      setEstablecimientos((curr) => [...curr, saved]);
      setMessage("Establecimiento creado con éxito.");
      setIsEstModalOpen(false);
      setEstForm(emptyEstablecimientoForm);
    } catch (err: any) {
      setError(err.message || "Error al crear establecimiento.");
    }
  }

  async function handleAddMiembro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setMessage(null);

    if (!/^\d{8}$/.test(mibForm.dni)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    if (mibForm.celular && !/^\d{9}$/.test(mibForm.celular)) {
      setError("El celular debe tener exactamente 9 dígitos.");
      return;
    }

    try {
      const saved = await createMiembro(id, {
        cargoMiembroGrupoId: mibForm.cargoMiembroGrupoId,
        grupoEstablecimientoId: mibForm.grupoEstablecimientoId || null,
        dni: mibForm.dni.trim(),
        nombres: mibForm.nombres.trim(),
        apellidos: mibForm.apellidos.trim(),
        celular: mibForm.celular.trim() || null,
        email: mibForm.email.trim() || null,
      });
      setMiembros((curr) => [...curr, saved]);
      setMessage("Miembro del grupo creado con éxito.");
      setIsMibModalOpen(false);
      setMibForm(emptyMiembroForm);
    } catch (err: any) {
      setError(err.message || "Error al crear miembro.");
    }
  }

  async function handleEditMiembro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id || !editingMiembro) return;
    setError(null);
    setMessage(null);

    if (mibForm.celular && !/^\d{9}$/.test(mibForm.celular)) {
      setError("El celular debe tener exactamente 9 dígitos.");
      return;
    }

    try {
      const saved = await updateMiembroContacto(id, editingMiembro.id, {
        grupoEstablecimientoId: mibForm.grupoEstablecimientoId || null,
        celular: mibForm.celular.trim() || null,
        email: mibForm.email.trim() || null,
      });
      setMiembros((curr) => curr.map((m) => (m.id === saved.id ? saved : m)));
      setMessage("Contacto de miembro actualizado con éxito.");
      setIsMibEditOpen(false);
      setEditingMiembro(null);
    } catch (err: any) {
      setError(err.message || "Error al actualizar miembro.");
    }
  }

  async function handleToggleActivo(m: MiembroGrupoRecord) {
    if (!id) return;
    const nextActivo = !m.activo;
    const confirm = window.confirm(
      `¿Deseas ${nextActivo ? "activar" : "inactivar"} al miembro ${m.nombres}?`,
    );
    if (!confirm) return;

    setError(null);
    setMessage(null);
    try {
      const updated = await setMiembroActivo(id, m.id, nextActivo);
      setMiembros((curr) => curr.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Estado del miembro actualizado.");
    } catch (err: any) {
      setError(err.message || "Error al cambiar estado.");
    }
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>{grupo?.nombreGrupo || "Cargando..."}</h1>
          <p>Conformación de miembros y establecimientos del grupo.</p>
        </div>
        <div className="breadcrumb-card">
          <button
            className="admin-button is-ghost"
            onClick={() => navigate("/grupos-trabajo")}
            style={{ padding: "0.25rem 0.5rem" }}
            type="button"
          >
            ← Volver al listado
          </button>
        </div>
      </section>

      {error ? <p className="alert alert-error">{error}</p> : null}
      {message ? <p className="alert alert-success">{message}</p> : null}

      {grupo ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "2rem", alignItems: "start" }}>
          {/* Info Panel */}
          <div className="admin-content-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem" }}>Datos Generales</h3>
            <p><strong>Representante:</strong><br />{`${grupo.nombreRepresentante} ${grupo.apellidosRepresentante}`}</p>
            <p><strong>DNI Representante:</strong><br />{grupo.dniRepresentante}</p>
            <p><strong>Periodo:</strong><br />{grupo.periodoYear}</p>
            <p><strong>Fecha Límite:</strong><br />{new Date(grupo.fechaLimite).toLocaleDateString()}</p>
            <p>
              <strong>Estado:</strong><br />
              <span className="status-pill is-active">{grupo.estado}</span>
            </p>
          </div>

          {/* Main Tabs Panel */}
          <div className="admin-content-card">
            <div style={{ display: "flex", borderBottom: "1px solid var(--color-border, #ccc)", marginBottom: "1.5rem" }}>
              <button
                onClick={() => setActiveTab("estab")}
                style={{
                  padding: "1rem 2rem",
                  border: "none",
                  background: "none",
                  fontWeight: activeTab === "estab" ? "bold" : "normal",
                  borderBottom: activeTab === "estab" ? "3px solid var(--color-primary, #2e7d32)" : "none",
                  cursor: "pointer",
                }}
                type="button"
              >
                Establecimientos ({establecimientos.length})
              </button>
              <button
                onClick={() => setActiveTab("miembro")}
                style={{
                  padding: "1rem 2rem",
                  border: "none",
                  background: "none",
                  fontWeight: activeTab === "miembro" ? "bold" : "normal",
                  borderBottom: activeTab === "miembro" ? "3px solid var(--color-primary, #2e7d32)" : "none",
                  cursor: "pointer",
                }}
                type="button"
              >
                Miembros ({miembros.length})
              </button>
            </div>

            {activeTab === "estab" ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem" }}>
                  <h4>Lista de Establecimientos</h4>
                  <button
                    className="admin-button is-primary"
                    onClick={() => setIsEstModalOpen(true)}
                    type="button"
                  >
                    + Agregar establecimiento
                  </button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Código</th>
                        <th>Dirección</th>
                      </tr>
                    </thead>
                    <tbody>
                      {establecimientos.map((e) => (
                        <tr key={e.id}>
                          <td>{e.nombre}</td>
                          <td>{e.codigo || "—"}</td>
                          <td>{e.direccion || "—"}</td>
                        </tr>
                      ))}
                      {establecimientos.length === 0 ? (
                        <tr>
                          <td className="admin-empty-cell" colSpan={3}>
                            No hay establecimientos registrados.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem" }}>
                  <label className="admin-search-field" style={{ width: "300px" }}>
                    <span aria-hidden="true">⌕</span>
                    <input
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar miembro..."
                      type="search"
                      value={query}
                    />
                  </label>
                  <button
                    className="admin-button is-primary"
                    onClick={() => setIsMibModalOpen(true)}
                    type="button"
                  >
                    + Agregar miembro
                  </button>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>DNI</th>
                        <th>Nombre Completo</th>
                        <th>Cargo</th>
                        <th>Establecimiento</th>
                        <th>Contacto</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMiembros.map((m) => (
                        <tr key={m.id}>
                          <td>{m.dni}</td>
                          <td>{`${m.nombres} ${m.apellidos}`}</td>
                          <td>{cargosMap[m.cargoMiembroGrupoId] || "—"}</td>
                          <td>
                            {establecimientos.find((e) => e.id === m.grupoEstablecimientoId)?.nombre ||
                              "—"}
                          </td>
                          <td>
                            {m.celular ? <div>📱 {m.celular}</div> : null}
                            {m.email ? <div>✉️ {m.email}</div> : null}
                            {!m.celular && !m.email ? "—" : null}
                          </td>
                          <td>
                            <span className={m.activo ? "status-pill is-active" : "status-pill is-muted"}>
                              {m.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="admin-icon-button"
                                onClick={() => {
                                  setEditingMiembro(m);
                                  setMibForm({
                                    dni: m.dni,
                                    nombres: m.nombres,
                                    apellidos: m.apellidos,
                                    cargoMiembroGrupoId: m.cargoMiembroGrupoId,
                                    grupoEstablecimientoId: m.grupoEstablecimientoId || "",
                                    celular: m.celular || "",
                                    email: m.email || "",
                                  });
                                  setIsMibEditOpen(true);
                                }}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="admin-icon-button"
                                onClick={() => void handleToggleActivo(m)}
                                type="button"
                              >
                                {m.activo ? "Inactivar" : "Activar"}
                              </button>
                              <button
                                className="admin-icon-button"
                                onClick={() => setIsDeleteModalOpen(true)}
                                type="button"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredMiembros.length === 0 ? (
                        <tr>
                          <td className="admin-empty-cell" colSpan={7}>
                            No se encontraron miembros.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal Establecimiento */}
      {isEstModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleAddEstablecimiento}>
            <div className="admin-modal-header">
              <h2>Agregar Establecimiento</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsEstModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                Nombre
                <input
                  maxLength={150}
                  onChange={(e) => setEstForm((curr) => ({ ...curr, nombre: e.target.value }))}
                  required
                  value={estForm.nombre}
                />
              </label>
              <label className="field">
                Código
                <input
                  maxLength={50}
                  onChange={(e) => setEstForm((curr) => ({ ...curr, codigo: e.target.value }))}
                  value={estForm.codigo}
                />
              </label>
              <label className="field admin-form-wide">
                Dirección
                <input
                  maxLength={200}
                  onChange={(e) => setEstForm((curr) => ({ ...curr, direccion: e.target.value }))}
                  value={estForm.direccion}
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setIsEstModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit">
                Agregar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Miembro Crear */}
      {isMibModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleAddMiembro}>
            <div className="admin-modal-header">
              <h2>Agregar Miembro Administrativo</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsMibModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="field">
                DNI
                <input
                  maxLength={8}
                  onChange={(e) => setMibForm((curr) => ({ ...curr, dni: e.target.value }))}
                  required
                  value={mibForm.dni}
                />
              </label>
              <label className="field">
                Nombres
                <input
                  maxLength={150}
                  onChange={(e) => setMibForm((curr) => ({ ...curr, nombres: e.target.value }))}
                  required
                  value={mibForm.nombres}
                />
              </label>
              <label className="field admin-form-wide">
                Apellidos
                <input
                  maxLength={200}
                  onChange={(e) => setMibForm((curr) => ({ ...curr, apellidos: e.target.value }))}
                  required
                  value={mibForm.apellidos}
                />
              </label>
              <label className="field">
                Cargo
                <select
                  onChange={(e) =>
                    setMibForm((curr) => ({ ...curr, cargoMiembroGrupoId: e.target.value }))
                  }
                  required
                  value={mibForm.cargoMiembroGrupoId}
                >
                  <option value="">Selecciona cargo...</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Establecimiento
                <select
                  onChange={(e) =>
                    setMibForm((curr) => ({ ...curr, grupoEstablecimientoId: e.target.value }))
                  }
                  value={mibForm.grupoEstablecimientoId}
                >
                  <option value="">Ninguno</option>
                  {establecimientos.map((es) => (
                    <option key={es.id} value={es.id}>
                      {es.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Celular
                <input
                  maxLength={9}
                  onChange={(e) => setMibForm((curr) => ({ ...curr, celular: e.target.value }))}
                  value={mibForm.celular}
                />
              </label>
              <label className="field">
                Email
                <input
                  onChange={(e) => setMibForm((curr) => ({ ...curr, email: e.target.value }))}
                  type="email"
                  value={mibForm.email}
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setIsMibModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit">
                Agregar miembro
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Miembro Editar (Limitado) */}
      {isMibEditOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleEditMiembro}>
            <div className="admin-modal-header">
              <h2>Editar Miembro (Edición Limitada)</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsMibEditOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="field">
                DNI (Solo Lectura)
                <input disabled value={mibForm.dni} />
              </label>
              <label className="field">
                Nombre Completo (Solo Lectura)
                <input disabled value={`${mibForm.nombres} ${mibForm.apellidos}`} />
              </label>
              <label className="field">
                Cargo (Solo Lectura)
                <input disabled value={cargosMap[mibForm.cargoMiembroGrupoId] || ""} />
              </label>
              <label className="field">
                Establecimiento
                <select
                  onChange={(e) =>
                    setMibForm((curr) => ({ ...curr, grupoEstablecimientoId: e.target.value }))
                  }
                  value={mibForm.grupoEstablecimientoId}
                >
                  <option value="">Ninguno</option>
                  {establecimientos.map((es) => (
                    <option key={es.id} value={es.id}>
                      {es.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Celular
                <input
                  maxLength={9}
                  onChange={(e) => setMibForm((curr) => ({ ...curr, celular: e.target.value }))}
                  value={mibForm.celular}
                />
              </label>
              <label className="field">
                Email
                <input
                  onChange={(e) => setMibForm((curr) => ({ ...curr, email: e.target.value }))}
                  type="email"
                  value={mibForm.email}
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setIsMibEditOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit">
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Por Implementar */}
      {isDeleteModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h2>Eliminar Miembro</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <p><strong>Por Implementar</strong></p>
              <p>
                La eliminación lógica de miembros administrativos con motivo de eliminación está
                diferida y será completamente implementada en la fase V2.
              </p>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-primary"
                onClick={() => setIsDeleteModalOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
