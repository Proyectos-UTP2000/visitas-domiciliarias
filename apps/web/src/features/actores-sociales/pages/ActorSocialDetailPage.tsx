import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { LuChevronLeft, LuChevronRight, LuFolder } from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { listTiposActorSocial } from "../../tipos-actor-social/tipos-actor-social-api";
import type { TipoActorSocialRecord } from "../../tipos-actor-social/tipos-actor-social-types";
import { listGrupos } from "../../grupos-trabajo/grupos-api";
import type { GrupoTrabajoRecordWithRelations } from "../../grupos-trabajo/grupos-types";
import { listEntidades } from "../../entidades/entidades-api";
import type { EntidadRecord } from "../../entidades/entidades-types";
import { consultarDni } from "../../dni/dni-api";
import { listSectores, listCentrosPoblados } from "../../sectores/sectores-api";
import type { SectorRecord, CentroPobladoRecord } from "../../sectores/sectores-types";
import {
  createActor,
  updateActor,
  setActorEstado,
  archivarActor,
  deleteActor,
  listActorArchivos,
  uploadActorArchivo,
  deleteActorArchivo,
  downloadActorArchivo,
  getActorById,
} from "../actores-sociales-api";
import type { ActorSocialRecord, ActorSocialFormState, EstadoActorSocial, ActorSocialArchivo } from "../actores-sociales-types";
import { emptyActorSocialForm, toActorSocialForm } from "../actores-sociales-utils";
import "../actores-sociales.css";
import { AutocompleteSearch } from "../../../shared/AutocompleteSearch";

function generateSecurePassword(): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const specials = "!@#$%&*";
  const all = letters + numbers + specials;
  
  let pwd = "";
  pwd += letters.charAt(Math.floor(Math.random() * letters.length));
  pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
  pwd += specials.charAt(Math.floor(Math.random() * specials.length));
  
  for (let i = 3; i < 10; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
}

const GRADOS_INSTRUCCION = [
  "Primaria Completa",
  "Secundaria Completa",
  "Superior Técnica",
  "Superior Universitaria Completa",
  "Superior Universitaria Incompleta",
  "Postgrado",
];

const IDIOMAS_ORIGEN = ["Castellano", "Quechua", "Aimara", "Asháninka", "Otro"];

type TimelineItem = {
  id: string;
  author: string;
  date: string;
  text: string;
};

export function ActorSocialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isCreation = id === "nuevo" || !id || id === undefined;

  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [tiposActor, setTiposActor] = useState<TipoActorSocialRecord[]>([]);
  const [grupos, setGrupos] = useState<GrupoTrabajoRecordWithRelations[]>([]);
  const [entidades, setEntidades] = useState<EntidadRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  const [centrosPoblados, setCentrosPoblados] = useState<CentroPobladoRecord[]>([]);

  const [form, setForm] = useState<ActorSocialFormState>(emptyActorSocialForm);
  const [viewingActor, setViewingActor] = useState<ActorSocialRecord | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Attachments and review status states
  const [archivos, setArchivos] = useState<ActorSocialArchivo[]>([]);
  const [isObserveModalOpen, setIsObserveModalOpen] = useState(false);
  const [statusComment, setStatusComment] = useState("");
  const [isSubmittingEstado, setIsSubmittingEstado] = useState(false);

  // Timeline
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Manzanas pagination
  const [manzanasPage, setManzanasPage] = useState(0);
  const [activeTab, setActiveTab] = useState<"registros" | "manzanas" | "otros_docs">("registros");

  // Deletion logic
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  // Confirmation state
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

  // Advanced search Autocomplete state
  const [searchModalConfig, setSearchModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    type: "municipalidad" | "grupo" | "centro_poblado" | "centro_poblado_rural" | "establecimiento";
    query: string;
    page: number;
  }>({
    isOpen: false,
    title: "",
    type: "municipalidad",
    query: "",
    page: 0,
  });

  const todayStr = useMemo(() => {
    const localToday = new Date();
    const year = localToday.getFullYear();
    const month = String(localToday.getMonth() + 1).padStart(2, '0');
    const day = String(localToday.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
    }
    void loadData();
  }, [id]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const session = getStoredSession();
      const userMuniId = session?.user.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;

      const [munData, tipData, grupData, entData, sectoresData, cpData] = await Promise.all([
        listMunicipalidades(),
        listTiposActorSocial(),
        listGrupos(userMuniId),
        listEntidades(),
        listSectores(userMuniId),
        listCentrosPoblados(),
      ]);

      setMunicipalidades(munData);
      setTiposActor(tipData.filter((t) => t.activo && !t.archivado));
      setGrupos(grupData);
      setEntidades(entData.filter((e) => e.activo && !e.archivado));
      setSectores(sectoresData);
      setCentrosPoblados(cpData);

      if (isCreation) {
        setError(null);
        setMessage(null);
        setViewingActor(null);
        setArchivos([]);
        setShowValidationErrors(false);
        const initialPass = generateSecurePassword();
        setForm({
          ...emptyActorSocialForm,
          municipalidadId: session?.user.rol === "ADMIN_MUNICIPAL" ? (session.user.municipalidadId || "") : "",
          password: initialPass,
        });
        setTimeline([
          {
            id: "1",
            author: session?.user.username || "Supervisor",
            date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: "Creando un nuevo registro...",
          }
        ]);
        setActiveTab("registros");
      } else if (id) {
        setError(null);
        setMessage(null);
        const actor = await getActorById(id);
        setViewingActor(actor);
        setArchivos(actor.archivos || []);
        setForm(toActorSocialForm(actor));
        setShowValidationErrors(false);
        setTimeline([
          {
            id: "1",
            author: "Sistema",
            date: "Hoy",
            text: `Visualizando registro del actor social. Estado actual: ${actor.estado}.`,
          }
        ]);
        setManzanasPage(0);
        setActiveTab(actor.estado === "BORRADOR" ? "registros" : "manzanas");
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar la información.");
    } finally {
      setIsLoading(false);
    }
  }

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  const selectedMuni = useMemo(() => {
    return municipalidades.find((m) => m.id === form.municipalidadId);
  }, [municipalidades, form.municipalidadId]);

  const selectedGroup = useMemo(() => {
    return grupos.find((g) => g.id === form.grupoTrabajoId);
  }, [grupos, form.grupoTrabajoId]);

  const cpSelectedName = useMemo(() => {
    const cp = centrosPoblados.find((c) => c.id === form.centroPobladoId);
    return cp ? cp.nombre : "";
  }, [centrosPoblados, form.centroPobladoId]);

  const selectedCP = useMemo(() => {
    return centrosPoblados.find((c) => c.id === form.centroPobladoId);
  }, [centrosPoblados, form.centroPobladoId]);

  const isUrbanoSelected = !!(selectedCP && selectedCP.tipo === "URBANO");
  const isRuralSelected = !!(selectedCP && selectedCP.tipo === "RURAL");

  const establishmentName = useMemo(() => {
    if (!selectedGroup) return "";
    const est = selectedGroup.establecimientos?.find((e) => e.id === form.grupoEstablecimientoId);
    return est ? est.nombre : "";
  }, [grupos, form.grupoTrabajoId, form.grupoEstablecimientoId]);

  const sectoresAsignadosAOtros = useMemo(() => {
    // Al no tener la lista completa de actores cargada en esta pantalla,
    // podemos consultar localmente o mostrar un mapa vacío si no disponemos del listado completo.
    // Para simplificar, asumiremos que se validará principalmente en el backend,
    // pero si quisiéramos mostrar advertencias preventivas, necesitaríamos cargar los actores.
    // Dado que el backend previene la superposición al 100%, dejaremos el mapa vacío.
    const map: Record<string, { actorName: string; actorId: string }> = {};
    return map;
  }, []);

  const availableManzanas = useMemo(() => {
    const muniId = form.municipalidadId;
    if (!muniId) return [];
    let filtered = sectores.filter((s) => s.municipalidadId === muniId && s.tipoSector === "URBANO" && s.activo && !s.archivado);
    if (form.centroPobladoId) {
      filtered = filtered.filter((s) => s.centroPobladoId === form.centroPobladoId);
    }
    return filtered;
  }, [sectores, form.municipalidadId, form.centroPobladoId]);

  const paginatedManzanas = useMemo(() => {
    const start = manzanasPage * 5;
    return availableManzanas.slice(start, start + 5);
  }, [availableManzanas, manzanasPage]);

  async function handleDniLookup() {
    const dni = form.dni.trim();
    if (!/^\d{8}$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos.");
      return;
    }
    setIsSearchingDni(true);
    setError(null);
    try {
      const datos = await consultarDni(dni);
      setForm((curr) => ({
        ...curr,
        nombres: datos.nombres,
        apellidos: `${datos.ape_paterno} ${datos.ape_materno}`,
        username: dni,
      }));
    } catch (err: any) {
      setError(err.message || "No se encontró el DNI o hubo un error al realizar la consulta.");
    } finally {
      setIsSearchingDni(false);
    }
  }

  function handleMuniChange(muniId: string) {
    setForm((curr) => ({
      ...curr,
      municipalidadId: muniId,
      grupoTrabajoId: "",
      grupoEstablecimientoId: "",
    }));
  }

  async function saveActorData(advanceState: boolean) {
    setError(null);
    setMessage(null);
    setShowValidationErrors(true);

    const resolvedMuniId = user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : form.municipalidadId;
    const isMuniInvalid = user?.rol === "ADMIN_GENERAL" && !form.municipalidadId;
    const isDniInvalid = !/^\d{8}$/.test(form.dni);
    const isNombresInvalid = !form.nombres.trim();
    const isApellidosInvalid = !form.apellidos.trim();
    const isCelularInvalid = !/^\d{9}$/.test(form.celular);
    const isTipoInvalid = !form.tipoActorSocialId;
    const isGrupoInvalid = !form.grupoTrabajoId;
    const isEstablecimientoInvalid = !form.grupoEstablecimientoId;
    const isDireccionInvalid = !form.direccion.trim();
    const isEmailInvalid = !form.email.trim() || !form.email.includes("@");
    const isIdiomaInvalid = !form.idiomaOrigen;
    const isGradoInvalid = !form.gradoInstruccion;

    const missingFields: string[] = [];
    if (isMuniInvalid) missingFields.push("Municipalidad");
    if (isTipoInvalid) missingFields.push("Tipo Actor Social");
    if (isDniInvalid) missingFields.push("DNI (debe tener exactamente 8 dígitos)");
    if (isNombresInvalid) missingFields.push("Nombres (consulte DNI)");
    if (isApellidosInvalid) missingFields.push("Apellidos (consulte DNI)");
    if (isDireccionInvalid) missingFields.push("Dirección");
    if (isCreation && (!form.fechaNac || form.fechaNac >= todayStr)) {
      missingFields.push("Fecha de Nacimiento (debe ser anterior a la actual)");
    }
    if (isEmailInvalid) missingFields.push("Correo Electrónico válido");
    if (isCelularInvalid) missingFields.push("Celular (debe tener exactamente 9 dígitos)");
    if (isIdiomaInvalid) missingFields.push("Idioma de Origen");
    if (isGradoInvalid) missingFields.push("Grado de Instrucción");
    if (isGrupoInvalid) missingFields.push("Grupo de Trabajo");
    if (isEstablecimientoInvalid) missingFields.push("Establecimiento de Salud");

    if (missingFields.length > 0) {
      setError(`Por favor, complete todos los campos obligatorios marcados con * y verifique que sean válidos. Campos incorrectos o faltantes: ${missingFields.join(", ")}.`);
      return;
    }

    setIsSaving(true);
    try {
      if (isCreation) {
        const payload = {
          ...form,
          municipalidadId: resolvedMuniId,
          entidadId: form.entidadId || null,
          grupoEstablecimientoId: form.grupoEstablecimientoId || null,
          centroPobladoId: form.centroPobladoId || null,
        } as any;
        
        let created = await createActor(payload);
        if (advanceState) {
          created = await setActorEstado(created.id, "REGISTRADO");
        }
        navigate(`/actores-sociales/${created.id}`, { replace: true });
        setMessage(advanceState ? "Actor social registrado con éxito." : "Borrador de actor social guardado con éxito.");
      } else if (viewingActor) {
        const payload = {
          tipoActorSocialId: form.tipoActorSocialId,
          grupoTrabajoId: form.grupoTrabajoId,
          grupoEstablecimientoId: form.grupoEstablecimientoId || null,
          entidadId: form.entidadId || null,
          email: form.email.trim(),
          celular: form.celular.trim(),
          direccion: form.direccion.trim(),
          centroPobladoId: form.centroPobladoId || null,
          gradoInstruccion: form.gradoInstruccion,
          inactivadoPermanentemente: form.inactivadoPermanentemente,
          sectoresIds: form.sectoresIds,
          sectoresACorregirIds: form.sectoresACorregirIds,
        };

        let updated = await updateActor(viewingActor.id, payload);
        if (advanceState) {
          const nextState = viewingActor.estado === "BORRADOR" ? "REGISTRADO" : "VALIDADO";
          updated = await setActorEstado(viewingActor.id, nextState);
          appendTimeline(`Sistema: Estado de registro cambiado a ${nextState}`);
          setMessage(`Actor social actualizado y avanzado a estado ${nextState === "VALIDADO" ? "VALIDADO" : "REGISTRADO"} con éxito.`);
        } else {
          setMessage("Actor social actualizado con éxito.");
        }
        setViewingActor(updated);
        setForm(toActorSocialForm(updated));
        setArchivos(updated.archivos || []);
        if (advanceState) {
          setActiveTab("otros_docs");
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al guardar el actor social.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTransitionEstado(actor: ActorSocialRecord, nextEstado: EstadoActorSocial, obsComment?: string) {
    setError(null);
    setMessage(null);
    setIsSubmittingEstado(true);
    try {
      const updated = await setActorEstado(actor.id, nextEstado, obsComment || null);
      setForm(toActorSocialForm(updated));
      setViewingActor(updated);
      setArchivos(updated.archivos || []);
      appendTimeline(`Sistema: Estado de registro cambiado a ${nextEstado}${obsComment ? ` (Observación: ${obsComment})` : ""}`);
      setMessage(`Estado del actor social actualizado a ${nextEstado === "VALIDADO" ? "VALIDADO" : nextEstado === "APROBADO" ? "APROBADO" : nextEstado} con éxito.`);
      setIsObserveModalOpen(false);
    } catch (err: any) {
      setError(err.message || "Error al actualizar estado del registro.");
    } finally {
      setIsSubmittingEstado(false);
      setConfirmConfig((curr) => ({ ...curr, isOpen: false }));
    }
  }

  async function handleArchivar(actor: ActorSocialRecord) {
    setError(null);
    setMessage(null);
    try {
      await archivarActor(actor.id);
      navigate("/actores-sociales");
    } catch (err: any) {
      setError(err.message || "Error al archivar el actor social.");
    } finally {
      setConfirmConfig((curr) => ({ ...curr, isOpen: false }));
    }
  }

  async function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewingActor || !deleteReason.trim()) return;

    setError(null);
    setMessage(null);
    try {
      await deleteActor(viewingActor.id, deleteReason);
      setIsReasonModalOpen(false);
      navigate("/actores-sociales");
    } catch (err: any) {
      setError(err.message || "Error al eliminar el actor social.");
    }
  }

  function appendTimeline(text: string) {
    setTimeline((curr) => [
      ...curr,
      {
        id: Math.random().toString(),
        author: user?.name || user?.username || "Supervisor",
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text,
      }
    ]);
  }

  function handleSendNote() {
    if (!chatInput.trim()) return;
    appendTimeline(chatInput);
    setChatInput("");
  }

  function handleToggleManzanaAssignment(sectorId: string) {
    setForm((curr) => {
      const nextSectores = [...curr.sectoresIds];
      const index = nextSectores.indexOf(sectorId);
      if (index >= 0) {
        nextSectores.splice(index, 1);
      } else {
        nextSectores.push(sectorId);
      }
      return {
        ...curr,
        sectoresIds: nextSectores,
      };
    });
  }

  function handleRemoveSectorTag(sectorId: string) {
    setForm((curr) => ({
      ...curr,
      sectoresIds: curr.sectoresIds.filter((id) => id !== sectorId),
    }));
  }

  function openSearchModal(type: "municipalidad" | "grupo" | "centro_poblado" | "centro_poblado_rural" | "establecimiento") {
    let title = "";
    if (type === "municipalidad") title = "Buscar Municipalidad";
    else if (type === "grupo") title = "Buscar Grupo de Trabajo";
    else if (type === "centro_poblado") title = "Buscar Centro Poblado (Urbano)";
    else if (type === "centro_poblado_rural") title = "Buscar Centro Poblado (Rural)";
    else if (type === "establecimiento") title = "Buscar Establecimiento de Salud";

    setSearchModalConfig({
      isOpen: true,
      title,
      type,
      query: "",
      page: 0,
    });
  }

  const modalFilteredItems = useMemo(() => {
    const q = searchModalConfig.query.toLowerCase().trim();
    const type = searchModalConfig.type;

    if (type === "municipalidad") {
      return municipalidades
        .filter((m) => m.nombre.toLowerCase().includes(q))
        .map((m) => ({ id: m.id, name: m.nombre, sub: `${m.departamento} > ${m.provincia} > ${m.distrito}`, raw: m }));
    }
    if (type === "grupo") {
      return grupos
        .filter((g) => g.municipalidadId === form.municipalidadId && g.activo && !g.archivado && g.estado === "APROBADO" && g.nombreGrupo.toLowerCase().includes(q))
        .map((g) => ({ id: g.id, name: g.nombreGrupo, sub: `Representante: ${g.nombreRepresentante} ${g.apellidosRepresentante}`, raw: g }));
    }
    if (type === "centro_poblado" || type === "centro_poblado_rural") {
      const isRural = type === "centro_poblado_rural";
      return centrosPoblados
        .filter((cp) => cp.municipalidadId === form.municipalidadId && cp.activo && !cp.archivado && cp.tipo === (isRural ? "RURAL" : "URBANO") && cp.nombre.toLowerCase().includes(q))
        .map((cp) => ({ id: cp.id, name: cp.nombre, sub: `Código: ${cp.codigo || "-"}`, raw: cp }));
    }
    if (type === "establecimiento") {
      if (!selectedGroup) return [];
      return (selectedGroup.establecimientos || [])
        .filter((e) => e.nombre.toLowerCase().includes(q))
        .map((e) => ({ id: e.id, name: e.nombre, sub: `Código: ${e.codigo || "-"}`, raw: e }));
    }
    return [];
  }, [searchModalConfig, municipalidades, grupos, centrosPoblados, form.municipalidadId, form.grupoTrabajoId]);

  const modalPaginatedItems = useMemo(() => {
    const start = searchModalConfig.page * 10;
    return modalFilteredItems.slice(start, start + 10);
  }, [modalFilteredItems, searchModalConfig.page]);

  function handleModalSelect(id: string, name: string, raw: any) {
    if (searchModalConfig.type === "municipalidad") {
      handleMuniChange(id);
    } else if (searchModalConfig.type === "grupo") {
      setForm((curr) => ({ ...curr, grupoTrabajoId: id, grupoEstablecimientoId: "" }));
    } else if (searchModalConfig.type === "centro_poblado" || searchModalConfig.type === "centro_poblado_rural") {
      setForm((curr) => ({
        ...curr,
        centroPobladoId: id,
        departamento: selectedMuni?.departamento || "",
        provincia: selectedMuni?.provincia || "",
        distrito: selectedMuni?.distrito || "",
      }));
    } else if (searchModalConfig.type === "establecimiento") {
      setForm((curr) => ({ ...curr, grupoEstablecimientoId: id }));
    }
    setSearchModalConfig((curr) => ({ ...curr, isOpen: false }));
  }

  // Options lists for Autocomplete UI
  const municipalidadesOptions = useMemo(() => {
    return municipalidades.map((m) => ({
      id: m.id,
      name: m.nombre,
      subtext: `${m.departamento} > ${m.provincia} > ${m.distrito}`,
      raw: m,
    }));
  }, [municipalidades]);

  const gruposOptions = useMemo(() => {
    return grupos
      .filter((g) => g.municipalidadId === form.municipalidadId && g.activo && !g.archivado && g.estado === "APROBADO")
      .map((g) => ({
        id: g.id,
        name: g.nombreGrupo,
        subtext: `Año: ${g.periodoYear} | Rep: ${g.nombreRepresentante} ${g.apellidosRepresentante}`,
        raw: g,
      }));
  }, [grupos, form.municipalidadId]);

  const urbanCentroPobladosOptions = useMemo(() => {
    const muniId = form.municipalidadId;
    if (!muniId) return [];
    return centrosPoblados
      .filter((cp) => cp.municipalidadId === muniId && cp.tipo === "URBANO" && cp.activo && !cp.archivado)
      .map((cp) => ({
        id: cp.id,
        name: cp.nombre,
        subtext: `Código: ${cp.codigo || "-"}`,
        raw: cp,
      }));
  }, [centrosPoblados, form.municipalidadId]);

  const ruralCentroPobladosOptions = useMemo(() => {
    const muniId = form.municipalidadId;
    if (!muniId) return [];
    return centrosPoblados
      .filter((cp) => cp.municipalidadId === muniId && cp.tipo === "RURAL" && cp.activo && !cp.archivado)
      .map((cp) => ({
        id: cp.id,
        name: cp.nombre,
        subtext: `Coordenadas: ${cp.latitud || "-"}, ${cp.longitud || "-"}`,
        raw: cp,
      }));
  }, [centrosPoblados, form.municipalidadId]);

  const establishmentsOptions = useMemo(() => {
    if (!selectedGroup) return [];
    return (selectedGroup.establecimientos || []).map((e) => ({
      id: e.id,
      name: e.nombre,
      subtext: `Código: ${e.codigo || "-"}`,
      raw: e,
    }));
  }, [selectedGroup]);

  // File attachments handlers
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !viewingActor) return;
    const file = e.target.files[0];
    setError(null);
    setMessage(null);
    try {
      const saved = await uploadActorArchivo(viewingActor.id, file);
      setArchivos((curr) => [...curr, saved]);
      appendTimeline(`Sistema: Archivo subido: ${file.name}`);
      setMessage("Archivo subido con éxito.");
    } catch (err: any) {
      setError(err.message || "Error al subir el archivo.");
    }
  }

  async function handleFileDelete(fileId: string, fileName: string) {
    if (!viewingActor) return;
    setError(null);
    setMessage(null);
    try {
      await deleteActorArchivo(viewingActor.id, fileId);
      setArchivos((curr) => curr.filter((f) => f.id !== fileId));
      appendTimeline(`Sistema: Archivo eliminado: ${fileName}`);
      setMessage("Archivo eliminado con éxito.");
    } catch (err: any) {
      setError(err.message || "Error al eliminar el archivo.");
    }
  }

  async function handleFileDownload(fileId: string, fileName: string) {
    try {
      await downloadActorArchivo(fileId, fileName);
    } catch (err: any) {
      setError(err.message || "Error al descargar el archivo.");
    }
  }

  if (isLoading) {
    return (
      <div className="admin-page-loading">
        <div className="spinner" />
        <p>Cargando información del actor social...</p>
      </div>
    );
  }

  const isFormDisabled = !isCreation && (form.estado === "VALIDADO" || form.estado === "APROBADO");
  const currentStepIndex = ["BORRADOR", "REGISTRADO", "VALIDADO", "APROBADO"].indexOf(form.estado || "BORRADOR");

  return (
    <div className="actores-detail-container">
      {/* Header */}
      <div className="actores-detail-header-row">
        <div className="flex-center-gap">
          <Link to="/actores-sociales" className="admin-button is-ghost">
            <LuChevronLeft size={18} /> Volver
          </Link>
          <h1 className="h1-no-margin">
            {isCreation
              ? "Crear Actor Social"
              : `[${viewingActor?.dni}] ${viewingActor?.apellidos} ${viewingActor?.nombres}`}
          </h1>
        </div>

        {!isCreation && viewingActor && (
          <div className="flex-center-gap">
            {viewingActor.deletedAt === null && (
              <button
                className="admin-button is-ghost is-danger"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setDeleteReason("");
                  setIsReasonModalOpen(true);
                }}
                type="button"
              >
                Eliminar Registro
              </button>
            )}
            <span className={`status-pill is-active`} style={{
              backgroundColor: viewingActor.estado === "APROBADO" ? "#2e7d32" : viewingActor.estado === "VALIDADO" ? "#0288d1" : "#e65100",
              color: "white"
            }}>{viewingActor.estado}</span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="stepper-steps-container">
        {["Borrador", "Registrado", "Validado", "Aprobado"].map((step, idx) => {
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          return (
            <div
              key={step}
              className={`flex-center-gap`}
              style={{
                opacity: isCompleted || isActive ? 1 : 0.45,
                fontWeight: isActive ? "bold" : "normal",
                color: isActive ? "#71639e" : isCompleted ? "var(--success)" : "var(--text)"
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  backgroundColor: isActive ? "#71639e" : isCompleted ? "var(--success)" : "#e0e0e0",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: "bold"
                }}
              >
                {isCompleted ? "✓" : idx + 1}
              </div>
              <span>{step}</span>
              {idx < 3 && <span style={{ color: "#ccc", margin: "0 1rem" }}>➔</span>}
            </div>
          );
        })}
      </div>

      {error && <div className="admin-alert is-error admin-alert-margin">{error}</div>}
      {message && <div className="admin-alert is-success admin-alert-margin">{message}</div>}

      {/* Main Grid */}
      <div className="actores-split-layout">
        {/* Form Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <div className="actores-form-panel">
            {/* Form Fields */}
            {user?.rol === "ADMIN_GENERAL" && isCreation ? (
              <div className="field actores-full-width">
                <AutocompleteSearch
                  label="Municipalidad"
                  placeholder="Escriba para buscar municipalidad..."
                  value={form.municipalidadId}
                  displayValue={selectedMuni ? selectedMuni.nombre : ""}
                  options={municipalidadesOptions}
                  onChange={handleMuniChange}
                  onSearchMore={() => openSearchModal("municipalidad")}
                  required
                />
                {showValidationErrors && !form.municipalidadId && (
                  <span className="field-error-text">La municipalidad es obligatoria.</span>
                )}
              </div>
            ) : null}

            {/* DNI */}
            <div className="field">
              <span>DNI *</span>
              <div className="flex-center-gap">
                <input
                  type="text"
                  placeholder="Ingrese 8 dígitos"
                  value={form.dni}
                  disabled={!isCreation}
                  onChange={(e) => setForm((curr) => ({ ...curr, dni: e.target.value.replace(/\D/g, "").slice(0, 8) }))}
                  required
                  style={{ flex: 1 }}
                />
                {isCreation && (
                  <button
                    className="admin-button is-secondary"
                    type="button"
                    onClick={handleDniLookup}
                    disabled={isSearchingDni || form.dni.length !== 8}
                    style={{ minHeight: "44px" }}
                  >
                    {isSearchingDni ? "Buscando..." : "Consultar DNI"}
                  </button>
                )}
              </div>
              {showValidationErrors && form.dni.length !== 8 && (
                <span className="field-error-text">El DNI debe tener exactamente 8 dígitos.</span>
              )}
            </div>

            {/* Nombres */}
            <label className="field">
              Nombres (Auto)
              <input type="text" value={form.nombres} disabled placeholder="Nombres" />
            </label>

            {/* Apellidos */}
            <label className="field">
              Apellidos (Auto)
              <input type="text" value={form.apellidos} disabled placeholder="Apellidos" />
            </label>

            {/* Tipo de Actor */}
            <label className="field">
              Tipo de Actor Social *
              <select
                value={form.tipoActorSocialId}
                onChange={(e) => setForm((curr) => ({ ...curr, tipoActorSocialId: e.target.value }))}
                required
                disabled={isFormDisabled || form.estado !== "BORRADOR"}
              >
                <option value="">Seleccione...</option>
                {tiposActor.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tipoActor}
                  </option>
                ))}
              </select>
            </label>

            {/* Grado Instrucción */}
            <label className="field">
              Grado de Instrucción *
              <select
                value={form.gradoInstruccion}
                onChange={(e) => setForm((curr) => ({ ...curr, gradoInstruccion: e.target.value }))}
                required
              >
                <option value="">Seleccione...</option>
                {GRADOS_INSTRUCCION.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            {/* Idioma Origen */}
            <label className="field">
              Idioma de Origen *
              <select
                value={form.idiomaOrigen}
                onChange={(e) => setForm((curr) => ({ ...curr, idiomaOrigen: e.target.value }))}
                required
              >
                <option value="">Seleccione...</option>
                {IDIOMAS_ORIGEN.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </label>

            {/* Celular */}
            <label className="field">
              Celular *
              <input
                type="text"
                placeholder="9 dígitos"
                value={form.celular}
                onChange={(e) => setForm((curr) => ({ ...curr, celular: e.target.value.replace(/\D/g, "").slice(0, 9) }))}
                required
              />
              {showValidationErrors && form.celular.length !== 9 && (
                <span className="field-error-text">El celular debe tener 9 dígitos.</span>
              )}
            </label>

            {/* Correo */}
            <label className="field">
              Correo Electrónico *
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={form.email}
                onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
                required
              />
              {showValidationErrors && (!form.email || !form.email.includes("@")) && (
                <span className="field-error-text">Ingrese un correo electrónico válido.</span>
              )}
            </label>

            {/* Fecha Nacimiento */}
            <label className="field">
              Fecha de Nacimiento *
              <input
                type="date"
                value={form.fechaNac}
                onChange={(e) => setForm((curr) => ({ ...curr, fechaNac: e.target.value }))}
                required
                disabled={!isCreation}
              />
              {showValidationErrors && isCreation && (!form.fechaNac || form.fechaNac >= todayStr) && (
                <span className="field-error-text">La fecha de nacimiento debe ser anterior a la actual.</span>
              )}
            </label>

            {/* Dirección */}
            <label className="field actores-full-width">
              Dirección de Domicilio *
              <input
                type="text"
                placeholder="Dirección exacta"
                value={form.direccion}
                onChange={(e) => setForm((curr) => ({ ...curr, direccion: e.target.value }))}
                required
              />
            </label>

            {/* Grupo de Trabajo */}
            <div className="field">
              <AutocompleteSearch
                label="Grupo de Trabajo"
                placeholder="Escriba para buscar grupo..."
                value={form.grupoTrabajoId}
                displayValue={selectedGroup ? selectedGroup.nombreGrupo : ""}
                options={gruposOptions}
                onChange={(id: string) => setForm((curr) => ({ ...curr, grupoTrabajoId: id, grupoEstablecimientoId: "" }))}
                onSearchMore={() => openSearchModal("grupo")}
                disabled={isFormDisabled || form.estado !== "BORRADOR"}
                required
              />
            </div>

            {/* Establecimiento */}
            <div className="field">
              <AutocompleteSearch
                label="Establecimiento de Salud"
                placeholder="Seleccione grupo de trabajo primero..."
                value={form.grupoEstablecimientoId}
                displayValue={establishmentName}
                options={establishmentsOptions}
                onChange={(id: string) => setForm((curr) => ({ ...curr, grupoEstablecimientoId: id }))}
                onSearchMore={() => openSearchModal("establecimiento")}
                disabled={isFormDisabled || !form.grupoTrabajoId || form.estado !== "BORRADOR"}
                required
              />
            </div>

            {/* Centro Poblado Urbano */}
            <div className="field">
              <AutocompleteSearch
                label="Centro Poblado (Urbano)"
                placeholder={isRuralSelected ? "Deshabilitado (Rural seleccionado)" : "Buscar centro poblado..."}
                value={isUrbanoSelected ? form.centroPobladoId : ""}
                displayValue={isUrbanoSelected ? cpSelectedName : ""}
                options={urbanCentroPobladosOptions}
                onChange={(id: string) => setForm((curr) => ({
                  ...curr,
                  centroPobladoId: id,
                  departamento: selectedMuni?.departamento || "",
                  provincia: selectedMuni?.provincia || "",
                  distrito: selectedMuni?.distrito || "",
                }))}
                onSearchMore={() => openSearchModal("centro_poblado")}
                disabled={isFormDisabled || isRuralSelected}
              />
            </div>

            {/* Centro Poblado Rural */}
            <div className="field">
              <AutocompleteSearch
                label="Centro Poblado Rural"
                placeholder={isUrbanoSelected ? "Deshabilitado (Urbano seleccionado)" : "Buscar centro poblado rural..."}
                value={isRuralSelected ? form.centroPobladoId : ""}
                displayValue={isRuralSelected ? cpSelectedName : ""}
                options={ruralCentroPobladosOptions}
                onChange={(id: string) => setForm((curr) => ({
                  ...curr,
                  centroPobladoId: id,
                  departamento: selectedMuni?.departamento || "",
                  provincia: selectedMuni?.provincia || "",
                  distrito: selectedMuni?.distrito || "",
                }))}
                onSearchMore={() => openSearchModal("centro_poblado_rural")}
                disabled={isFormDisabled || isUrbanoSelected}
              />
            </div>

            {/* Inactivo Permanente */}
            {!isCreation && (
              <label className="flex-center-gap" style={{ gridColumn: "span 2", marginTop: "1rem", userSelect: "none" }}>
                <input
                  type="checkbox"
                  checked={form.inactivadoPermanentemente}
                  onChange={(e) => setForm((curr) => ({ ...curr, inactivadoPermanentemente: e.target.checked }))}
                  disabled={isFormDisabled}
                />
                <span>Inactivado permanentemente del sistema</span>
              </label>
            )}
          </div>

          {/* Action buttons bar */}
          <div className="actores-detail-actions">
            {form.estado === "BORRADOR" && (
              <>
                <Link className="admin-button is-ghost" to="/actores-sociales">
                  Cancelar
                </Link>
                <button className="admin-button is-secondary" onClick={() => void saveActorData(false)} disabled={isSaving} type="button">
                  Guardar
                </button>
                <button className="admin-button is-primary" onClick={() => void saveActorData(true)} disabled={isSaving} type="button">
                  Registrar
                </button>
              </>
            )}

            {form.estado === "REGISTRADO" && (
              <>
                <Link className="admin-button is-ghost" to="/actores-sociales">
                  Cancelar
                </Link>
                <button className="admin-button is-secondary" onClick={() => void saveActorData(false)} disabled={isSaving} type="button">
                  Guardar
                </button>
                <button className="admin-button is-primary" onClick={() => void saveActorData(true)} disabled={isSaving} type="button">
                  Validar
                </button>
              </>
            )}

            {form.estado === "VALIDADO" && (
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
                          title: "Aprobar Actor Social",
                          message: "¿Seguro que deseas aprobar y habilitar este actor social?",
                          onConfirm: () => handleTransitionEstado(viewingActor!, "APROBADO"),
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

            {form.estado === "APROBADO" && viewingActor && (
              <button
                className="admin-button is-ghost is-danger"
                onClick={() => {
                  setConfirmConfig({
                    isOpen: true,
                    title: "Archivar Actor Social",
                    message: "¿Seguro que deseas archivar este actor social? Se mantendrá el historial pero no estará activo.",
                    onConfirm: () => handleArchivar(viewingActor),
                  });
                }}
                type="button"
              >
                Archivar Actor Social
              </button>
            )}
          </div>

          {/* Tab lists under form */}
          {form.estado !== "BORRADOR" && (
            <div style={{ background: "white", padding: "2rem", borderRadius: "0.55rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginTop: "2rem" }}>
              <div className="tab-buttons-bar">
                <button
                  type="button"
                  onClick={() => setActiveTab("registros")}
                  className={`tab-button ${activeTab === "registros" ? "is-active" : "is-inactive"}`}
                >
                  Registros
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("manzanas")}
                  className={`tab-button ${activeTab === "manzanas" ? "is-active" : "is-inactive"}`}
                >
                  Asignacion de manzanas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("otros_docs")}
                  className={`tab-button ${activeTab === "otros_docs" ? "is-active" : "is-inactive"}`}
                >
                  Otros Documentos
                </button>
              </div>

              {activeTab === "registros" && (
                <div style={{ padding: "1rem 0", color: "var(--muted)", fontStyle: "italic" }}>
                  No hay registros adicionales en esta sección.
                </div>
              )}

              {activeTab === "manzanas" && (
                <div>
                  <div className="manzanas-list-header">
                    <span>{availableManzanas.length} manzanas / sectores urbanos disponibles en la municipalidad</span>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="admin-button is-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                        disabled={manzanasPage === 0}
                        onClick={() => setManzanasPage(p => p - 1)}
                        type="button"
                      >
                        ◀
                      </button>
                      <button
                        className="admin-button is-ghost"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                        disabled={(manzanasPage + 1) * 5 >= availableManzanas.length}
                        onClick={() => setManzanasPage(p => p + 1)}
                        type="button"
                      >
                        ▶
                      </button>
                    </div>
                  </div>

                  <table className="manzanas-table">
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th>Zona</th>
                        <th>Manzana</th>
                        <th style={{ textAlign: "center", width: "100px" }}>Asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedManzanas.map((m) => {
                        const isAssigned = form.sectoresIds.includes(m.id);
                        const asignadoAOtro = sectoresAsignadosAOtros[m.id];
                        const isFieldReadonly = form.estado === "VALIDADO";
                        return (
                          <tr key={m.id} className={asignadoAOtro ? "manzana-assigned-row" : undefined}>
                            <td>
                              {m.nombreSector}
                              {asignadoAOtro && (
                                <div className="manzana-assigned-warning">
                                  ⚠️ Asignado a: {asignadoAOtro.actorName}
                                </div>
                              )}
                            </td>
                            <td>{m.urbano?.zona || "-"}</td>
                            <td>{m.urbano?.manzana || "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                disabled={isFieldReadonly}
                                onChange={() => handleToggleManzanaAssignment(m.id)}
                                style={{ transform: "scale(1.2)", cursor: isFieldReadonly ? "not-allowed" : "pointer" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {availableManzanas.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", padding: "1.5rem" }}>
                            No hay sectores urbanos en esta municipalidad.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "otros_docs" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>Documentos adjuntos del Actor Social</span>
                    {form.estado !== "VALIDADO" && (
                      <label className="admin-button is-primary" style={{ cursor: "pointer", fontSize: "0.9rem", minHeight: "36px", padding: "0.5rem 1rem" }}>
                        Subir Archivo
                        <input
                          type="file"
                          onChange={handleFileSelect}
                          style={{ display: "none" }}
                          accept=".pdf,.png,.jpg,.jpeg"
                        />
                      </label>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {archivos.map((file) => (
                      <div
                        key={file.id}
                        className="flex-center-gap"
                        style={{
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          background: "var(--surface-muted)"
                        }}
                      >
                        <div className="flex-center-gap">
                          <LuFolder size={20} style={{ color: "#71639e" }} />
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>{file.nombreArchivo}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>PDF / Imagen</span>
                          </div>
                        </div>
                        <div className="flex-center-gap">
                          <button
                            className="admin-button is-ghost"
                            onClick={() => handleFileDownload(file.id, file.nombreArchivo)}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", minHeight: "30px" }}
                            type="button"
                          >
                            Descargar
                          </button>
                          {form.estado !== "VALIDADO" && (
                            <button
                              className="admin-button is-ghost is-danger"
                              onClick={() => handleFileDelete(file.id, file.nombreArchivo)}
                              style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem", minHeight: "30px" }}
                              type="button"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {archivos.length === 0 && (
                      <div style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", padding: "2rem", border: "1px dashed var(--border)", borderRadius: "6px" }}>
                        Sin archivos adjuntos cargados.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Timeline */}
        <div className="timeline-panel">
          <h2 style={{ fontSize: "1.2rem", margin: "0 0 1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
            Línea de Tiempo y Notas
          </h2>
          <div className="timeline-container">
            {timeline.map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-header">
                  <strong>{item.author}</strong>
                  <span className="timeline-item-time">{item.date}</span>
                </div>
                <p className="timeline-item-text">{item.text}</p>
              </div>
            ))}
          </div>

          <textarea
            rows={3}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Escribe una nota interna aquí..."
            className="timeline-notes-input"
          />
          <button
            className="admin-button is-primary"
            onClick={handleSendNote}
            style={{ width: "100%", marginTop: "0.5rem" }}
            type="button"
          >
            Agregar Nota
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmConfig.isOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: "450px" }}>
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
            <div style={{ padding: "1.5rem" }}>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text)" }}>{confirmConfig.message}</p>
            </div>
            <div className="admin-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #eee", padding: "1rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setConfirmConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                onClick={() => {
                  const p = confirmConfig.onConfirm();
                  if (p instanceof Promise) {
                    p.catch((err) => setError(err.message));
                  }
                }}
                type="button"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Observación Modal */}
      {isObserveModalOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h2>Observar Actor Social</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsObserveModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1.5rem" }} className="form-stack">
              <label className="field">
                <span>Comentario de Observación *</span>
                <textarea
                  rows={4}
                  required
                  placeholder="Detalla las observaciones del por qué se devuelve el registro..."
                  value={statusComment}
                  onChange={(e) => setStatusComment(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "white", color: "var(--text)" }}
                />
              </label>
            </div>
            <div className="admin-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #eee", padding: "1rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setIsObserveModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                disabled={!statusComment.trim()}
                onClick={() => void handleTransitionEstado(viewingActor!, "REGISTRADO", statusComment)}
                type="button"
              >
                Observar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Reason Modal */}
      {isReasonModalOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <form className="admin-modal" style={{ maxWidth: "500px" }} onSubmit={handleDeleteSubmit}>
            <div className="admin-modal-header">
              <h2>Eliminar Actor Social</h2>
              <button
                className="admin-modal-close"
                onClick={() => setIsReasonModalOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1.5rem" }} className="form-stack">
              <label className="field">
                <span>Motivo de Eliminación *</span>
                <textarea
                  rows={4}
                  required
                  placeholder="Ingresa el motivo de eliminación..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "white", color: "var(--text)" }}
                />
              </label>
            </div>
            <div className="admin-modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderTop: "1px solid #eee", padding: "1rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setIsReasonModalOpen(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                disabled={!deleteReason.trim()}
                type="submit"
              >
                Eliminar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Advanced Search Modal (Autocomplete fallback) */}
      {searchModalConfig.isOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: "800px", width: "90%" }}>
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", padding: "1rem" }}>
              <h2 style={{ margin: 0 }}>{searchModalConfig.title}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setSearchModalConfig((curr) => ({ ...curr, isOpen: false }))}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
                type="button"
              >
                ×
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <input
                type="text"
                placeholder="Escribe para filtrar resultados..."
                value={searchModalConfig.query}
                onChange={(e) => setSearchModalConfig((curr) => ({ ...curr, query: e.target.value, page: 0 }))}
                style={{ width: "100%", padding: "0.75rem", marginBottom: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
              <div style={{ minHeight: "250px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                {modalPaginatedItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleModalSelect(item.id, item.name, item.raw)}
                    style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #eee", cursor: "pointer", display: "flex", flexDirection: "column" }}
                    className="autocomplete-modal-row-hover"
                  >
                    <span style={{ fontWeight: "600", fontSize: "0.95rem" }}>{item.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{item.sub}</span>
                  </div>
                ))}
                {modalFilteredItems.length === 0 && (
                  <div style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic", padding: "3rem" }}>
                    No se encontraron resultados.
                  </div>
                )}
              </div>
              {/* Pagination info inside modal */}
              {modalFilteredItems.length > 10 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                    Mostrando del {searchModalConfig.page * 10 + 1} al {Math.min((searchModalConfig.page + 1) * 10, modalFilteredItems.length)} de {modalFilteredItems.length}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="admin-button is-ghost"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                      disabled={searchModalConfig.page === 0}
                      onClick={() => setSearchModalConfig((curr) => ({ ...curr, page: curr.page - 1 }))}
                      type="button"
                    >
                      ◀
                    </button>
                    <button
                      className="admin-button is-ghost"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                      disabled={(searchModalConfig.page + 1) * 10 >= modalFilteredItems.length}
                      onClick={() => setSearchModalConfig((curr) => ({ ...curr, page: curr.page + 1 }))}
                      type="button"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
