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
  deleteGrupo,
  archivarGrupo,
  createGrupo,
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
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
  const [grupo, setGrupo] = useState<GrupoTrabajoRecord | null>(null);
  const [cargos, setCargos] = useState<CargoMiembroRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [establecimientos, setEstablecimientos] = useState<GrupoEstablecimientoRecord[]>([]);
  const [miembros, setMiembros] = useState<MiembroGrupoRecord[]>([]);
  const [cargosMap, setCargosMap] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<"estab" | "miembro" | "otros_docs" | "actas">("estab");
  const [archivos, setArchivos] = useState<GrupoTrabajoArchivoRecord[]>([]);

  const otrosDocs = useMemo(() => {
    return archivos.filter((f) => !f.nombreArchivo.toLowerCase().includes("acta"));
  }, [archivos]);

  const actasDocs = useMemo(() => {
    return archivos.filter((f) => f.nombreArchivo.toLowerCase().includes("acta"));
  }, [archivos]);

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

  async function handleDeleteGrupo() {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      await deleteGrupo(id);
      navigate("/grupos-trabajo");
    } catch (err: any) {
      setError(err.message || "Error al eliminar el borrador del grupo de trabajo.");
    }
  }

  async function handleArchivarGrupo() {
    if (!id) return;
    setError(null);
    setMessage(null);
    try {
      await archivarGrupo(id);
      navigate("/grupos-trabajo");
    } catch (err: any) {
      setError(err.message || "Error al archivar el grupo de trabajo.");
    }
  }

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

  async function handleEditDniLookup() {
    const dni = editForm.dniRepresentante.trim();
    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI del representante debe tener exactamente 8 dígitos.");
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

  async function handleSaveDraft(shouldTransitionToRegistrado: boolean) {
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const resolvedMuniId = (user?.rol === "ADMIN_GENERAL" ? editForm.municipalidadId : user?.municipalidadId) || "";
    
    const missing: string[] = [];
    if (!resolvedMuniId) missing.push("Municipalidad");
    if (!editForm.nombreGrupo.trim()) missing.push("Nombre del Grupo");
    if (!editForm.fechaLimite) missing.push("Fecha Límite");
    if (!/^\d{8}$/.test(editForm.dniRepresentante)) missing.push("DNI Representante (8 dígitos)");
    if (!editForm.nombreRepresentante.trim() || !editForm.apellidosRepresentante.trim()) {
      missing.push("Consulta del Representante por DNI");
    }
    const year = Number(editForm.periodoYear);
    if (isNaN(year) || year < 2000 || year > 32767) {
      missing.push("Periodo anual (año válido entre 2000 y 32767)");
    }

    if (missing.length > 0) {
      setError(`Por favor, complete todos los campos obligatorios marcados con * y verifique que sean válidos. Campos faltantes o incorrectos: ${missing.join(", ")}.`);
      setIsSaving(false);
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (editForm.fechaLimite < todayStr) {
      setError("La fecha límite debe ser una fecha futura (a partir de hoy).");
      setIsSaving(false);
      return;
    }

    try {
      const payload = {
        municipalidadId: resolvedMuniId,
        fechaLimite: editForm.fechaLimite,
        nombreGrupo: editForm.nombreGrupo.trim(),
        periodoYear: year,
        dniRepresentante: editForm.dniRepresentante.trim(),
        nombreRepresentante: editForm.nombreRepresentante.trim(),
        apellidosRepresentante: editForm.apellidosRepresentante.trim(),
      };

      let savedGrupo: GrupoTrabajoRecord;
      if (id === "nuevo") {
        savedGrupo = await createGrupo(payload);
      } else {
        savedGrupo = await updateGrupo(id!, payload);
      }

      let nextGrupoState = savedGrupo;
      if (shouldTransitionToRegistrado) {
        nextGrupoState = await updateGrupoEstado(savedGrupo.id, "REGISTRADO");
      }

      setGrupo(nextGrupoState);
      setEditForm({
        municipalidadId: nextGrupoState.municipalidadId,
        fechaLimite: new Date(nextGrupoState.fechaLimite).toISOString().split("T")[0],
        nombreGrupo: nextGrupoState.nombreGrupo,
        periodoYear: String(nextGrupoState.periodoYear),
        dniRepresentante: nextGrupoState.dniRepresentante,
        nombreRepresentante: nextGrupoState.nombreRepresentante,
        apellidosRepresentante: nextGrupoState.apellidosRepresentante,
      });

      setMessage(
        id === "nuevo"
          ? shouldTransitionToRegistrado
            ? "Grupo de trabajo creado y registrado con éxito."
            : "Borrador de grupo de trabajo creado con éxito."
          : shouldTransitionToRegistrado
            ? "Grupo de trabajo actualizado y registrado con éxito."
            : "Grupo de trabajo guardado con éxito."
      );

      if (id === "nuevo") {
        navigate(`/grupos-trabajo/${savedGrupo.id}`, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar el grupo de trabajo.");
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
      const session = getStoredSession();
      const [cargoList, munList] = await Promise.all([
        listCargos(),
        listMunicipalidades(),
      ]);

      setCargos(cargoList.filter((c) => c.activo));
      setMunicipalidades(munList);

      const map: Record<string, string> = {};
      cargoList.forEach((c) => {
        map[c.id] = c.nombre;
      });
      setCargosMap(map);

      if (id !== "nuevo") {
        const currentGrupo = await getGrupoById(id);
        setGrupo(currentGrupo);
        setMiembros(currentGrupo.miembros || []);
        setEstablecimientos(currentGrupo.establecimientos || []);
        setArchivos(currentGrupo.archivos || []);
        setEditForm({
          municipalidadId: currentGrupo.municipalidadId,
          fechaLimite: new Date(currentGrupo.fechaLimite).toISOString().split("T")[0],
          nombreGrupo: currentGrupo.nombreGrupo,
          periodoYear: String(currentGrupo.periodoYear),
          dniRepresentante: currentGrupo.dniRepresentante,
          nombreRepresentante: currentGrupo.nombreRepresentante,
          apellidosRepresentante: currentGrupo.apellidosRepresentante,
        });
      } else {
        const muniId = session?.user?.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : "";
        setEditForm({
          municipalidadId: muniId || "",
          fechaLimite: "",
          nombreGrupo: "",
          periodoYear: String(new Date().getFullYear()),
          dniRepresentante: "",
          nombreRepresentante: "",
          apellidosRepresentante: "",
        });
        setGrupo(null);
        setMiembros([]);
        setEstablecimientos([]);
        setArchivos([]);
      }
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

  const isCreation = id === "nuevo";
  const currentEstado = isCreation ? "BORRADOR" : (grupo?.estado || "BORRADOR");
  const selectedMuni = useMemo(() => {
    return municipalidades.find(m => m.id === editForm.municipalidadId);
  }, [municipalidades, editForm.municipalidadId]);
  const isFormDisabled = currentEstado === "VALIDADO" || currentEstado === "APROBADO";
  const isDniPeriodoDisabled = isFormDisabled || currentEstado === "REGISTRADO";

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>{isCreation ? "Nuevo Grupo de Trabajo" : (grupo?.nombreGrupo || "Cargando...")}</h1>
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

      {(error || message) && (
        <div className="admin-page-alerts">
          {error ? <p className="alert alert-error">{error}</p> : null}
          {message ? <p className="alert alert-success">{message}</p> : null}
        </div>
      )}

      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted, #666)" }}>
          Cargando datos del grupo de trabajo...
        </div>
      ) : (
        <>
          {/* Stepper bar */}
          <div className="stepper-bar">
            {["Borrador", "Registrado", "Validado", "Aprobado"].map((step, idx) => {
              const stepEnum = step.toUpperCase() === "VALIDADO" ? "VALIDADO" : step.toUpperCase();
              const isCompleted = idx < ["BORRADOR", "REGISTRADO", "VALIDADO", "APROBADO"].indexOf(currentEstado);
              const isActive = idx === ["BORRADOR", "REGISTRADO", "VALIDADO", "APROBADO"].indexOf(currentEstado);
              return (
                <div key={step} className="stepper-step" style={{ flex: idx === 3 ? "none" : 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <div className={`stepper-step-circle ${isCompleted || isActive ? (isActive ? "is-active" : "is-completed") : "is-inactive"}`}>
                      {idx + 1}
                    </div>
                    <span className={`stepper-step-label ${isActive ? "is-active" : "is-inactive"}`}>
                      {step}
                    </span>
                  </div>
                  {idx < 3 && (
                    <div className={`stepper-line ${isCompleted ? "is-completed" : "is-inactive"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form / Details columns */}
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="admin-form-two-columns">
              {/* Left Column: GOBIERNO LOCAL */}
              <div className="admin-content-card">
                <h3 className="card-section-title">
                  GOBIERNO LOCAL
                </h3>
                <div className="form-stack">
                  <label className="field">
                    Municipalidad *
                    {user?.rol === "ADMIN_GENERAL" && currentEstado === "BORRADOR" ? (
                      <select
                        value={editForm.municipalidadId}
                        onChange={(e) => setEditForm(curr => ({ ...curr, municipalidadId: e.target.value }))}
                        required
                      >
                        <option value="">Selecciona municipalidad...</option>
                        {municipalidades.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedMuni?.nombre || "Cargando..."}
                        disabled
                      />
                    )}
                  </label>

                  <label className="field">
                    Departamento
                    <input
                      type="text"
                      value={selectedMuni?.departamento || "—"}
                      disabled
                    />
                  </label>

                  <label className="field">
                    Provincia
                    <input
                      type="text"
                      value={selectedMuni?.provincia || "—"}
                      disabled
                    />
                  </label>

                  <label className="field">
                    Distrito
                    <input
                      type="text"
                      value={selectedMuni?.distrito || "—"}
                      disabled
                    />
                  </label>

                  <label className="field">
                    Fecha límite conformación de Grupo de trabajo *
                    <input
                      type="date"
                      value={editForm.fechaLimite}
                      onChange={(e) => setEditForm(curr => ({ ...curr, fechaLimite: e.target.value }))}
                      disabled={isFormDisabled}
                      min={new Date().toISOString().split("T")[0]}
                      required
                    />
                  </label>
                </div>
              </div>

              {/* Right Column: GRUPO DE TRABAJO */}
              <div className="admin-content-card">
                <h3 className="card-section-title">
                  GRUPO DE TRABAJO
                </h3>
                <div className="form-stack">
                  <label className="field">
                    Grupo de Trabajo *
                    <input
                      type="text"
                      value={editForm.nombreGrupo}
                      onChange={(e) => setEditForm(curr => ({ ...curr, nombreGrupo: e.target.value }))}
                      disabled={isFormDisabled}
                      maxLength={150}
                      placeholder="Ej. Comité IAL LA VICTORIA"
                      required
                    />
                  </label>

                  <div className="field-row-1-2">
                    <label className="field">
                      Periodo (Año) *
                      <input
                        type="number"
                        value={editForm.periodoYear}
                        onChange={(e) => setEditForm(curr => ({ ...curr, periodoYear: e.target.value }))}
                        disabled={isDniPeriodoDisabled}
                        min={2000}
                        max={32767}
                        required
                      />
                    </label>

                    <div className="field">
                      <span>DNI Representante *</span>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          value={editForm.dniRepresentante}
                          onChange={(e) => setEditForm(curr => ({ ...curr, dniRepresentante: e.target.value }))}
                          disabled={isDniPeriodoDisabled}
                          maxLength={8}
                          style={{ flex: 1, marginTop: 0 }}
                          required
                        />
                        <button
                          type="button"
                          className="admin-button is-secondary"
                          disabled={isDniPeriodoDisabled || isSearchingDni}
                          onClick={handleEditDniLookup}
                          style={{ height: "38px", minHeight: "38px" }}
                        >
                          {isSearchingDni ? "..." : "Consultar"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="field-row-2col">
                    <label className="field">
                      Nombres del Representante
                      <input
                        type="text"
                        value={editForm.nombreRepresentante}
                        disabled
                      />
                    </label>

                    <label className="field">
                      Apellidos del Representante
                      <input
                        type="text"
                        value={editForm.apellidosRepresentante}
                        disabled
                      />
                    </label>
                  </div>

                  {!isCreation && grupo && (
                    <label className="field">
                      Última modificación
                      <input
                        type="text"
                        value={grupo.updatedAt ? new Date(grupo.updatedAt).toLocaleString() : "—"}
                        disabled
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Observations alert */}
            {grupo?.observaciones && (currentEstado === "REGISTRADO" || currentEstado === "VALIDADO") && (
              <div className="observations-alert-box">
                <strong>Observaciones del Supervisor:</strong>
                <p style={{ margin: "0.25rem 0 0", whiteSpace: "pre-wrap" }}>{grupo.observaciones}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="form-actions-margin-bottom">
              {currentEstado === "BORRADOR" && (
                <>
                  <button className="admin-button is-ghost" onClick={() => navigate("/grupos-trabajo")} type="button">
                    Cancelar
                  </button>
                  <button className="admin-button is-secondary" onClick={() => handleSaveDraft(false)} disabled={isSaving} type="button">
                    Guardar
                  </button>
                  <button className="admin-button is-primary" onClick={() => handleSaveDraft(true)} disabled={isSaving} type="button">
                    Registrar
                  </button>
                </>
              )}

              {currentEstado === "REGISTRADO" && (
                <>
                  <button className="admin-button is-ghost" onClick={() => navigate("/grupos-trabajo")} type="button">
                    Cancelar
                  </button>
                  <button className="admin-button is-secondary" onClick={() => handleSaveDraft(false)} disabled={isSaving} type="button">
                    Guardar
                  </button>
                  <button className="admin-button is-primary" onClick={() => handleTransitionEstado("VALIDADO")} disabled={isSaving} type="button">
                    Validar
                  </button>
                </>
              )}

              {currentEstado === "VALIDADO" && (
                <>
                  {user?.rol === "ADMIN_GENERAL" || user?.rol === "ADMIN_MUNICIPAL" ? (
                    <>
                      <button
                        className="admin-button is-ghost is-warning"
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
                        className="admin-button is-primary"
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: "Aprobar / Validar Grupo",
                            message: "¿Seguro que deseas aprobar y validar este grupo de trabajo?",
                            onConfirm: () => handleTransitionEstado("APROBADO"),
                          });
                        }}
                        disabled={isSubmittingEstado}
                        type="button"
                      >
                        Aprobar
                      </button>
                    </>
                  ) : (
                    <span className="status-pill is-warning" style={{ padding: "0.5rem 1rem", fontSize: "0.95rem" }}>
                      En espera de revisión
                    </span>
                  )}
                </>
              )}

              {currentEstado === "APROBADO" && grupo && (
                <button
                  className="admin-button is-ghost is-danger"
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: "Archivar Grupo",
                      message: "¿Seguro que deseas archivar este grupo de trabajo? Se mantendrá el historial pero no estará activo.",
                      onConfirm: () => handleArchivarGrupo(),
                    });
                  }}
                  type="button"
                >
                  Archivar Grupo
                </button>
              )}
            </div>
          </form>

          {/* Secciones Inferiores / Pestañas */}
          {!isCreation && grupo && currentEstado !== "BORRADOR" && (
            <div className="admin-content-card" style={{ marginTop: "2rem" }}>
              {currentEstado === "APROBADO" ? (
                <div style={{ display: "flex", borderBottom: "1px solid var(--border, #eee)", marginBottom: "1.5rem" }}>
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
                    Otros Documentos ({otrosDocs.length})
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
                    Actas del Grupo ({actasDocs.length})
                  </button>
                </div>
              ) : (
                <div style={{ padding: "1.5rem 1rem 0.5rem", borderBottom: "1px solid var(--border, #eee)", marginBottom: "1.5rem" }}>
                  <h4 style={{ margin: 0 }}>Otros Documentos del Grupo</h4>
                </div>
              )}

              {/* Contenido de Establecimientos (solo si APROBADO) */}
              {currentEstado === "APROBADO" && activeTab === "estab" && (
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
              )}

              {/* Contenido de Miembros (solo si APROBADO) */}
              {currentEstado === "APROBADO" && activeTab === "miembro" && (
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
                              {establecimientos.find((e) => e.id === m.grupoEstablecimientoId)?.nombre || "—"}
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

              {/* Contenido de Otros Documentos */}
              {(currentEstado === "REGISTRADO" || currentEstado === "VALIDADO" || (currentEstado === "APROBADO" && activeTab === "otros_docs")) && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem", alignItems: "center" }}>
                    <h4>Otros Documentos</h4>
                    {(currentEstado === "REGISTRADO" || currentEstado === "APROBADO") && (
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
                        {otrosDocs.map((file) => (
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
                                {(currentEstado === "REGISTRADO" || currentEstado === "APROBADO") && (
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
                        {otrosDocs.length === 0 ? (
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

              {/* Contenido de Actas (solo si APROBADO) */}
              {currentEstado === "APROBADO" && activeTab === "actas" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem", alignItems: "center" }}>
                    <h4>Actas del Grupo de Trabajo</h4>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="file"
                        id="upload-acta-input"
                        style={{ display: "none" }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          // Prefix filename with 'acta_' so it goes to the actas docs
                          const renamedFile = new File([file], `acta_${file.name}`, { type: file.type });
                          setError(null);
                          setMessage(null);
                          try {
                            const saved = await uploadArchivo(id!, renamedFile);
                            setArchivos((curr: GrupoTrabajoArchivoRecord[]) => [...curr, saved]);
                            setMessage("Acta subida con éxito.");
                          } catch (err: any) {
                            setError(err.message || "Error al subir el acta.");
                          }
                        }}
                      />
                      <button
                        className="admin-button is-primary"
                        onClick={() => document.getElementById("upload-acta-input")?.click()}
                        type="button"
                      >
                        + Subir Acta (PDF/Imagen)
                      </button>
                    </div>
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
                        {actasDocs.map((file) => (
                          <tr key={file.id}>
                            <td>{file.nombreArchivo.replace(/^acta_/, "")}</td>
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
                                <button
                                  className="admin-icon-button"
                                  style={{ color: "var(--color-danger, #d32f2f)" }}
                                  onClick={async () => {
                                    if (!confirm("¿Está seguro de eliminar esta acta?")) return;
                                    setError(null);
                                    setMessage(null);
                                    try {
                                      await deleteArchivo(id!, file.id);
                                      setArchivos((curr: GrupoTrabajoArchivoRecord[]) => curr.filter((f) => f.id !== file.id));
                                      setMessage("Acta eliminada con éxito.");
                                    } catch (err: any) {
                                      setError(err.message || "Error al eliminar el acta.");
                                    }
                                  }}
                                  type="button"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {actasDocs.length === 0 ? (
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
          )}
        </>
      )}

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
                  <option value="">Seleccione cargo...</option>
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Establecimiento de Salud
                <select
                  onChange={(e) =>
                    setMibForm((curr) => ({ ...curr, grupoEstablecimientoId: e.target.value }))
                  }
                  value={mibForm.grupoEstablecimientoId}
                >
                  <option value="">Ninguno...</option>
                  {establecimientos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
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
                Correo Electrónico
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
                Agregar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal Miembro Editar */}
      {isMibEditOpen && editingMiembro ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleEditMiembro}>
            <div className="admin-modal-header">
              <h2>Editar Miembro Administrativo</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsMibEditOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "0 1rem", color: "var(--muted, #666)", fontSize: "0.95rem" }}>
              <p style={{ margin: "0.5rem 0" }}>
                <strong>DNI:</strong> {editingMiembro.dni}
              </p>
              <p style={{ margin: "0.5rem 0" }}>
                <strong>Nombre:</strong> {`${editingMiembro.nombres} ${editingMiembro.apellidos}`}
              </p>
            </div>
            <div className="admin-form-grid">
              <label className="field">
                Cargo
                <select disabled value={editingMiembro.cargoMiembroGrupoId}>
                  <option value={editingMiembro.cargoMiembroGrupoId}>
                    {cargosMap[editingMiembro.cargoMiembroGrupoId] || "—"}
                  </option>
                </select>
              </label>
              <label className="field">
                Establecimiento de Salud
                <select
                  onChange={(e) =>
                    setMibForm((curr) => ({ ...curr, grupoEstablecimientoId: e.target.value }))
                  }
                  value={mibForm.grupoEstablecimientoId}
                >
                  <option value="">Ninguno...</option>
                  {establecimientos.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
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
                Correo Electrónico
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

      {/* Modal de Confirmación Genérico */}
      {confirmConfig.isOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <div className="admin-modal" style={{ maxWidth: "480px" }}>
            <div className="admin-modal-header">
              <h2>{confirmConfig.title}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setConfirmConfig(curr => ({ ...curr, isOpen: false }))}
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
                onClick={() => setConfirmConfig(curr => ({ ...curr, isOpen: false }))}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                onClick={async () => {
                  setConfirmConfig(curr => ({ ...curr, isOpen: false }));
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
    </>
  );
}
