import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LuPhone, LuMail } from "react-icons/lu";
import { listCargos } from "../../cargos-miembro-grupo/cargos-api";
import type { CargoMiembroRecord } from "../../cargos-miembro-grupo/cargos-types";
import {
  createEstablecimiento,
  createMiembro,
  getGrupoById,
  updateGrupo,
  listGrupos,
  setMiembroActivo,
  updateMiembroContacto,
  updateGrupoEstado,
  uploadArchivo,
  deleteArchivo,
  downloadArchivo,
} from "../grupos-api";
import type {
  GrupoEstablecimientoFormState,
  GrupoEstablecimientoRecord,
  GrupoTrabajoRecord,
  GrupoTrabajoFormState,
  GrupoTrabajoArchivoRecord,
  MiembroGrupoFormState,
  MiembroGrupoRecord,
} from "../grupos-types";
import { consultarDni } from "../../dni/dni-api";
import {
  emptyEstablecimientoForm,
  emptyMiembroForm,
  filterMiembros,
} from "../grupos-utils";
import { getStoredSession } from "../../auth/auth-storage";

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [grupo, setGrupo] = useState<GrupoTrabajoRecord | null>(null);
  const [cargos, setCargos] = useState<CargoMiembroRecord[]>([]);
  const [establecimientos, setEstablecimientos] = useState<GrupoEstablecimientoRecord[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupoRecord[]>([]);
  const [cargosMap, setCargosMap] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<"estab" | "miembro" | "otros_docs" | "actas">("estab");
  const [archivos, setArchivos] = useState<GrupoTrabajoArchivoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Modals
  const [isEstModalOpen, setIsEstModalOpen] = useState(false);
  const [isMibModalOpen, setIsMibModalOpen] = useState(false);
  const [isMibEditOpen, setIsMibEditOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isEditGrupoOpen, setIsEditGrupoOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<GrupoTrabajoFormState>({
    municipalidadId: "",
    fechaLimite: "",
    nombreGrupo: "",
    periodoYear: "",
    dniRepresentante: "",
    nombreRepresentante: "",
    apellidosRepresentante: "",
  });

  const [statusComment, setStatusComment] = useState("");
  const [isSubmittingEstado, setIsSubmittingEstado] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  async function handleMiembroDniLookup() {
    const dni = mibForm.dni.trim();
    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    setIsSearchingDni(true);
    setError(null);
    try {
      const datos = await consultarDni(dni);
      setMibForm((curr) => ({
        ...curr,
        nombres: datos.nombres,
        apellidos: `${datos.ape_paterno} ${datos.ape_materno}`,
      }));
    } catch (err: any) {
      setError(err.message || "No se encontró el DNI o hubo un error al realizar la consulta.");
    } finally {
      setIsSearchingDni(false);
    }
  }

  function openEditGrupo() {
    if (!grupo) return;
    setEditForm({
      municipalidadId: grupo.municipalidadId,
      fechaLimite: new Date(grupo.fechaLimite).toISOString().split("T")[0],
      nombreGrupo: grupo.nombreGrupo,
      periodoYear: String(grupo.periodoYear),
      dniRepresentante: grupo.dniRepresentante,
      nombreRepresentante: grupo.nombreRepresentante,
      apellidosRepresentante: grupo.apellidosRepresentante,
    });
    setError(null);
    setMessage(null);
    setIsEditGrupoOpen(true);
  }

  async function handleEditDniLookup() {
    const dni = editForm.dniRepresentante.trim();
    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    setIsSearchingDni(true);
    setError(null);
    try {
      const datos = await consultarDni(dni);
      setEditForm((curr: GrupoTrabajoFormState) => ({
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

  async function handleEditGrupoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!id) return;
    setIsSaving(true);
    setError(null);
    setMessage(null);

    if (!/^\d{8}$/.test(editForm.dniRepresentante)) {
      setError("El DNI del representante debe tener exactamente 8 dígitos.");
      setIsSaving(false);
      return;
    }

    const year = Number(editForm.periodoYear);
    if (isNaN(year) || year < 2000 || year > 32767) {
      setError("El período anual debe ser un número válido entre 2000 y 32767.");
      setIsSaving(false);
      return;
    }

    try {
      const updated = await updateGrupo(id, {
        nombreGrupo: editForm.nombreGrupo.trim(),
        periodoYear: year,
        fechaLimite: editForm.fechaLimite,
        dniRepresentante: editForm.dniRepresentante.trim(),
        nombreRepresentante: editForm.nombreRepresentante.trim(),
        apellidosRepresentante: editForm.apellidosRepresentante.trim(),
      });
      setGrupo((curr) => curr ? { ...curr, ...updated } : null);
      setMessage("Grupo de trabajo actualizado con éxito.");
      setIsEditGrupoOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el grupo.");
    } finally {
      setIsSaving(false);
    }
  }

  const [estForm, setEstForm] = useState<GrupoEstablecimientoFormState>(emptyEstablecimientoForm);
  const [mibForm, setMibForm] = useState<MiembroGrupoFormState>(emptyMiembroForm);
  const [editingMiembro, setEditingMiembro] = useState<MiembroGrupoRecord | null>(null);

  // Filters for members
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [estFilter, setEstFilter] = useState("");

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
    }
    void loadDetails();
  }, [id]);

  async function loadDetails() {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [currentGrupo, cargoList] = await Promise.all([
        getGrupoById(id),
        listCargos(),
      ]);

      setGrupo(currentGrupo);
      setCargos(cargoList.filter((c) => c.activo));
      setMiembros(currentGrupo.miembros || []);
      setEstablecimientos(currentGrupo.establecimientos || []);
      setArchivos(currentGrupo.archivos || []);

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

  async function handleTransitionEstado(nextEstado: any, obsText?: string) {
    if (!id) return;
    setIsSubmittingEstado(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateGrupoEstado(id, nextEstado, obsText || null);
      setGrupo(updated);
      setMessage(`Estado del grupo actualizado a ${nextEstado} correctamente.`);
      setIsObserveModalOpen(false);
      setIsRejectModalOpen(false);
      setStatusComment("");
    } catch (err: any) {
      setError(err.message || "Error al actualizar el estado del grupo.");
    } finally {
      setIsSubmittingEstado(false);
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

            {grupo.observaciones && (grupo.estado === "OBSERVADO" || grupo.estado === "RECHAZADO") && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: grupo.estado === "RECHAZADO" ? "rgba(211, 47, 47, 0.1)" : "rgba(245, 124, 0, 0.1)",
                  border: `1px solid ${grupo.estado === "RECHAZADO" ? "var(--color-danger, #d32f2f)" : "var(--color-warning, #f57c00)"}`,
                  color: grupo.estado === "RECHAZADO" ? "var(--color-danger, #d32f2f)" : "var(--color-warning, #f57c00)",
                }}
              >
                <strong style={{ display: "block", marginBottom: "0.25rem" }}>
                  {grupo.estado === "RECHAZADO" ? "Motivo del Rechazo:" : "Observaciones del Administrador:"}
                </strong>
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{grupo.observaciones}</p>
              </div>
            )}

            {/* Acciones de Estado */}
            <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--color-border, #ccc)", paddingTop: "1rem" }}>
              {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") && (
                <button
                  className="admin-button is-primary"
                  style={{ width: "100%" }}
                  onClick={() => {
                    const confirm = window.confirm(
                      "¿Seguro que deseas registrar este grupo de trabajo? Se bloqueará la edición y pasará a revisión.",
                    );
                    if (confirm) {
                      void handleTransitionEstado("REGISTRADO");
                    }
                  }}
                  disabled={isSubmittingEstado}
                  type="button"
                >
                  Registrar Grupo
                </button>
              )}

              {user?.rol === "ADMIN_GENERAL" && grupo.estado === "REGISTRADO" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button
                    className="admin-button is-primary"
                    style={{ width: "100%" }}
                    onClick={() => {
                      const confirm = window.confirm("¿Aprobar y validar este grupo de trabajo?");
                      if (confirm) {
                        void handleTransitionEstado("VALIDADO");
                      }
                    }}
                    disabled={isSubmittingEstado}
                    type="button"
                  >
                    Aprobar / Validar
                  </button>
                  <button
                    className="admin-button is-ghost"
                    style={{
                      width: "100%",
                      border: "1px solid var(--color-warning, #f57c00)",
                      color: "var(--color-warning, #f57c00)",
                    }}
                    onClick={() => {
                      setStatusComment("");
                      setIsObserveModalOpen(true);
                    }}
                    disabled={isSubmittingEstado}
                    type="button"
                  >
                    Observar
                  </button>
                  <button
                    className="admin-button is-ghost"
                    style={{
                      width: "100%",
                      border: "1px solid var(--color-danger, #d32f2f)",
                      color: "var(--color-danger, #d32f2f)",
                    }}
                    onClick={() => {
                      setStatusComment("");
                      setIsRejectModalOpen(true);
                    }}
                    disabled={isSubmittingEstado}
                    type="button"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Main Tabs Panel */}
            <div className="admin-content-card">
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: "1.5rem" }}>
              <button
                onClick={() => setActiveTab("estab")}
                style={{
                  padding: "1rem 2rem",
                  border: "none",
                  background: "none",
                  color: activeTab === "estab" ? "var(--primary)" : "var(--muted)",
                  fontWeight: activeTab === "estab" ? "700" : "500",
                  borderBottom: activeTab === "estab" ? "3px solid var(--primary)" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "all 160ms ease",
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
                  color: activeTab === "miembro" ? "var(--primary)" : "var(--muted)",
                  fontWeight: activeTab === "miembro" ? "700" : "500",
                  borderBottom: activeTab === "miembro" ? "3px solid var(--primary)" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "all 160ms ease",
                }}
                type="button"
              >
                Miembros ({miembros.length})
              </button>
              <button
                onClick={() => setActiveTab("otros_docs")}
                style={{
                  padding: "1rem 2rem",
                  border: "none",
                  background: "none",
                  color: activeTab === "otros_docs" ? "var(--primary)" : "var(--muted)",
                  fontWeight: activeTab === "otros_docs" ? "700" : "500",
                  borderBottom: activeTab === "otros_docs" ? "3px solid var(--primary)" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "all 160ms ease",
                }}
                type="button"
              >
                Otros Documentos ({archivos.length})
              </button>
              <button
                onClick={() => setActiveTab("actas")}
                style={{
                  padding: "1rem 2rem",
                  border: "none",
                  background: "none",
                  color: activeTab === "actas" ? "var(--primary)" : "var(--muted)",
                  fontWeight: activeTab === "actas" ? "700" : "500",
                  borderBottom: activeTab === "actas" ? "3px solid var(--primary)" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  transition: "all 160ms ease",
                }}
                type="button"
              >
                Actas del Grupo ({archivos.filter(f => f.nombreArchivo.toLowerCase().includes("acta")).length})
              </button>
            </div>

            {activeTab === "estab" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem" }}>
                  <h4>Lista de Establecimientos</h4>
                  {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") && (
                    <button
                      className="admin-button is-primary"
                      onClick={() => setIsEstModalOpen(true)}
                      type="button"
                    >
                      + Agregar establecimiento
                    </button>
                  )}
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
            )}

            {activeTab === "miembro" && (
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
                  {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") && (
                    <button
                      className="admin-button is-primary"
                      onClick={() => setIsMibModalOpen(true)}
                      type="button"
                    >
                      + Agregar miembro
                    </button>
                  )}
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
                            {m.celular ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "2px 0" }}>
                                <LuPhone style={{ color: "var(--muted)", flexShrink: 0 }} size={14} />
                                <span>{m.celular}</span>
                              </div>
                            ) : null}
                            {m.email ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "2px 0" }}>
                                <LuMail style={{ color: "var(--muted)", flexShrink: 0 }} size={14} />
                                <span style={{ textTransform: "none" }}>{m.email}</span>
                              </div>
                            ) : null}
                            {!m.celular && !m.email ? "—" : null}
                          </td>
                          <td>
                            <span className={m.activo ? "status-pill is-active" : "status-pill is-muted"}>
                              {m.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") ? (
                                <>
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
                                </>
                              ) : (
                                <span style={{ color: "var(--muted)", fontSize: "0.875rem" }}>Lectura</span>
                              )}
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

            {activeTab === "otros_docs" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem", alignItems: "center" }}>
                  <h4>Otros Documentos</h4>
                  {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="file"
                        id="upload-file-input"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setError(null);
                          setMessage(null);
                          try {
                            const saved = await uploadArchivo(id!, file);
                            setArchivos((curr: GrupoTrabajoArchivoRecord[]) => [...curr, saved]);
                            setMessage("Archivo subido con éxito.");
                          } catch (err: any) {
                            setError(err.message || "Error al subir el archivo.");
                          }
                        }}
                      />
                      <button
                        className="admin-button is-primary"
                        onClick={() => document.getElementById("upload-file-input")?.click()}
                        type="button"
                      >
                        + Subir Documento (PDF/Imagen)
                      </button>
                    </div>
                  )}
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre del Archivo</th>
                        <th>Tipo</th>
                        <th>Fecha de Carga</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.map((file) => (
                        <tr key={file.id}>
                          <td>{file.nombreArchivo}</td>
                          <td>{file.mimeType}</td>
                          <td>{new Date(file.createdAt).toLocaleString()}</td>
                          <td>
                            <div className="admin-row-actions">
                              <button
                                className="admin-icon-button"
                                onClick={() => void downloadArchivo(file.id, file.nombreArchivo)}
                                type="button"
                              >
                                Descargar
                              </button>
                              {(grupo.estado === "BORRADOR" || grupo.estado === "OBSERVADO") && (
                                <button
                                  className="admin-icon-button"
                                  style={{ color: "var(--color-danger, #d32f2f)" }}
                                  onClick={async () => {
                                    if (!confirm("¿Está seguro de eliminar este documento?")) return;
                                    setError(null);
                                    setMessage(null);
                                    try {
                                      await deleteArchivo(id!, file.id);
                                      setArchivos((curr: GrupoTrabajoArchivoRecord[]) => curr.filter((f) => f.id !== file.id));
                                      setMessage("Archivo eliminado con éxito.");
                                    } catch (err: any) {
                                      setError(err.message || "Error al eliminar el archivo.");
                                    }
                                  }}
                                  type="button"
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {archivos.length === 0 ? (
                        <tr>
                          <td className="admin-empty-cell" colSpan={4}>
                            No hay documentos registrados para este grupo de trabajo.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "actas" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem", alignItems: "center" }}>
                  <h4>Actas del Grupo de Trabajo</h4>
                </div>
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nombre del Acta</th>
                        <th>Fecha de Carga</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archivos.map((file) => (
                        <tr key={file.id}>
                          <td>{file.nombreArchivo}</td>
                          <td>{new Date(file.createdAt).toLocaleString()}</td>
                          <td>
                            <button
                              className="admin-icon-button"
                              onClick={() => void downloadArchivo(file.id, file.nombreArchivo)}
                              type="button"
                            >
                              Descargar
                            </button>
                          </td>
                        </tr>
                      ))}
                      {archivos.length === 0 ? (
                        <tr>
                          <td className="admin-empty-cell" colSpan={3}>
                            No hay actas registradas para este grupo de trabajo.
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

      {/* Modal Observar */}
      {isObserveModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form
            className="admin-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (!statusComment.trim()) return;
              void handleTransitionEstado("OBSERVADO", statusComment);
            }}
          >
            <div className="admin-modal-header">
              <h2>Enviar con Observaciones</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsObserveModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                Observaciones / Comentarios (Obligatorio)
                <textarea
                  maxLength={1000}
                  onChange={(e) => setStatusComment(e.target.value)}
                  required
                  rows={4}
                  value={statusComment}
                  placeholder="Describe las correcciones necesarias..."
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setIsObserveModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" disabled={isSubmittingEstado} type="submit">
                {isSubmittingEstado ? "Enviando..." : "Confirmar Observación"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Rechazar */}
      {isRejectModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form
            className="admin-modal"
            onSubmit={(e) => {
              e.preventDefault();
              if (!statusComment.trim()) return;
              void handleTransitionEstado("RECHAZADO", statusComment);
            }}
          >
            <div className="admin-modal-header">
              <h2>Rechazar Grupo de Trabajo</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsRejectModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="admin-form-grid">
              <label className="field admin-form-wide">
                Motivo del Rechazo (Obligatorio)
                <textarea
                  maxLength={1000}
                  onChange={(e) => setStatusComment(e.target.value)}
                  required
                  rows={4}
                  value={statusComment}
                  placeholder="Especifica por qué se rechaza de forma definitiva..."
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setIsRejectModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button"
                style={{ background: "var(--color-danger, #d32f2f)", color: "#fff" }}
                disabled={isSubmittingEstado}
                type="submit"
              >
                {isSubmittingEstado ? "Enviando..." : "Confirmar Rechazo Definitivo"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
