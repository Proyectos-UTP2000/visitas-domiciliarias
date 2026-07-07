import { Fragment, useEffect, useMemo, useState, useRef } from "react";
import { LuSearch, LuSettings, LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { listTiposActorSocial } from "../../tipos-actor-social/tipos-actor-social-api";
import type { TipoActorSocialRecord } from "../../tipos-actor-social/tipos-actor-social-types";
import { listGrupos } from "../../grupos-trabajo/grupos-api";
import type { GrupoTrabajoRecordWithRelations, GrupoEstablecimientoRecord } from "../../grupos-trabajo/grupos-types";
import { listEntidades } from "../../entidades/entidades-api";
import type { EntidadRecord } from "../../entidades/entidades-types";
import { consultarDni } from "../../dni/dni-api";
import { listSectores, listCentrosPoblados } from "../../sectores/sectores-api";
import type { SectorRecord, CentroPobladoRecord } from "../../sectores/sectores-types";
import {
  listActores,
  createActor,
  updateActor,
  setActorActivo,
  setActorEstado,
  archivarActor,
  deleteActor,
} from "../actores-sociales-api";
import type { ActorSocialRecord, ActorSocialFormState, EstadoActorSocial } from "../actores-sociales-types";
import { emptyActorSocialForm, filterActores, toActorSocialForm } from "../actores-sociales-utils";

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

import { AutocompleteSearch } from "../../../shared/AutocompleteSearch";

export function ActoresSocialesPage() {
  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  const [actores, setActores] = useState<ActorSocialRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [tiposActor, setTiposActor] = useState<TipoActorSocialRecord[]>([]);
  const [grupos, setGrupos] = useState<GrupoTrabajoRecordWithRelations[]>([]);
  const [entidades, setEntidades] = useState<EntidadRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  const [centrosPoblados, setCentrosPoblados] = useState<CentroPobladoRecord[]>([]);

  // Navigation state: "list" | "detail" | "create"
  const [viewMode, setViewMode] = useState<"list" | "detail" | "create">("list");

  const [query, setQuery] = useState("");
  const [form, setForm] = useState<ActorSocialFormState>(emptyActorSocialForm);
  const [viewingActor, setViewingActor] = useState<ActorSocialRecord | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingDni, setIsSearchingDni] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filters (List view)
  const [showFilters, setShowFilters] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [muniFilter, setMuniFilter] = useState("");

  // Deletion logic with reason
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [actorToDelete, setActorToDelete] = useState<string | null>(null);

  // Detail/Create Page States
  const [activeTab, setActiveTab] = useState<"registros" | "manzanas">("registros");
  const [chatInput, setChatInput] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [manzanasPage, setManzanasPage] = useState(0);

  // Gear Settings menu
  const [isGearMenuOpen, setIsGearMenuOpen] = useState(false);

  // Advanced search modal
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

  // Custom confirmation modal
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

  const [groupBy, setGroupBy] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  const filteredActores = useMemo(() => {
    return filterActores(actores, query, muniFilter, estadoFilter);
  }, [actores, query, muniFilter, estadoFilter]);

  const establishmentsMap = useMemo(() => {
    const map: Record<string, string> = {};
    grupos.forEach((g) => {
      g.establecimientos?.forEach((e) => {
        map[e.id] = e.nombre;
      });
    });
    return map;
  }, [grupos]);

  // Map municipalidades for fast ID -> Name lookups
  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  const tiposMap = useMemo(() => {
    const map: Record<string, string> = {};
    tiposActor.forEach((t) => {
      map[t.id] = t.tipoActor;
    });
    return map;
  }, [tiposActor]);

  const gruposMap = useMemo(() => {
    const map: Record<string, string> = {};
    grupos.forEach((g) => {
      map[g.id] = `${g.nombreGrupo} (${g.periodoYear})`;
    });
    return map;
  }, [grupos]);

  const entidadesMap = useMemo(() => {
    const map: Record<string, string> = {};
    entidades.forEach((e) => {
      map[e.id] = e.nombre;
    });
    return map;
  }, [entidades]);

  const sortedActores = useMemo(() => {
    if (!sortConfig) return filteredActores;
    return [...filteredActores].sort((a: any, b: any) => {
      let aVal = "";
      let bVal = "";

      if (sortConfig.key === "municipalidad") {
        aVal = munisMap[a.municipalidadId] || "";
        bVal = munisMap[b.municipalidadId] || "";
      } else if (sortConfig.key === "nombreCompleto") {
        aVal = `${a.apellidoPaterno} ${a.apellidoMaterno} ${a.nombres}`;
        bVal = `${b.apellidoPaterno} ${b.apellidoMaterno} ${b.nombres}`;
      } else if (sortConfig.key === "tipoActor") {
        aVal = tiposMap[a.tipoActorSocialId] || "";
        bVal = tiposMap[b.tipoActorSocialId] || "";
      } else if (sortConfig.key === "establecimiento") {
        aVal = (a.grupoEstablecimientoId && establishmentsMap[a.grupoEstablecimientoId]) || "";
        bVal = (b.grupoEstablecimientoId && establishmentsMap[b.grupoEstablecimientoId]) || "";
      } else {
        aVal = a[sortConfig.key] || "";
        bVal = b[sortConfig.key] || "";
      }

      const aStr = String(aVal).toLowerCase().trim();
      const bStr = String(bVal).toLowerCase().trim();

      if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredActores, sortConfig, munisMap, tiposMap, establishmentsMap]);

  const groupedActores = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, ActorSocialRecord[]> = {};
    sortedActores.forEach((r) => {
      let groupKey = "";
      if (groupBy === "municipalidad") {
        groupKey = munisMap[r.municipalidadId] || "Sin Municipalidad";
      } else if (groupBy === "tipoActor") {
        groupKey = tiposMap[r.tipoActorSocialId] || "Sin Tipo";
      } else if (groupBy === "establecimiento") {
        groupKey = (r.grupoEstablecimientoId && establishmentsMap[r.grupoEstablecimientoId]) || "Sin Establecimiento";
      }
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(r);
    });
    return groups;
  }, [sortedActores, groupBy, munisMap, tiposMap, establishmentsMap]);

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

  // Options lists for Autocomplete
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
      .filter((g) => g.municipalidadId === form.municipalidadId && g.activo && !g.archivado)
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
        subtext: cp.codigo ? `Ubigeo: ${cp.codigo}` : "Centro Poblado Urbano",
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
        subtext: cp.codigo ? `Ubigeo: ${cp.codigo}` : "Centro Poblado Rural",
        raw: cp,
      }));
  }, [centrosPoblados, form.municipalidadId]);

  const selectedCpUrbanoName = useMemo(() => {
    const cp = centrosPoblados.find((c) => c.id === form.centroPobladoId);
    return cp && cp.tipo === "URBANO" ? cp.nombre : "";
  }, [centrosPoblados, form.centroPobladoId]);

  const selectedCpRuralName = useMemo(() => {
    const cp = centrosPoblados.find((c) => c.id === form.centroPobladoId);
    return cp && cp.tipo === "RURAL" ? cp.nombre : "";
  }, [centrosPoblados, form.centroPobladoId]);

  const establecimientosOptions = useMemo(() => {
    const selectedGroup = grupos.find((g) => g.id === form.grupoTrabajoId);
    if (!selectedGroup) return [];
    const ests = selectedGroup.establecimientos || [];
    return ests.map((est) => ({
      id: est.id,
      name: est.nombre,
      subtext: est.codigo ? `Código: ${est.codigo}` : undefined,
      raw: est,
    }));
  }, [grupos, form.grupoTrabajoId]);

  // Selected names for autocomplete displays
  const selectedMuniName = useMemo(() => {
    const m = municipalidades.find((m) => m.id === form.municipalidadId);
    return m ? m.nombre : "";
  }, [municipalidades, form.municipalidadId]);

  const selectedGrupoName = useMemo(() => {
    const g = grupos.find((g) => g.id === form.grupoTrabajoId);
    return g ? g.nombreGrupo : "";
  }, [grupos, form.grupoTrabajoId]);

  const selectedEstablecimientoName = useMemo(() => {
    const selectedGroup = grupos.find((g) => g.id === form.grupoTrabajoId);
    if (!selectedGroup) return "";
    const est = selectedGroup.establecimientos?.find((e) => e.id === form.grupoEstablecimientoId);
    return est ? est.nombre : "";
  }, [grupos, form.grupoTrabajoId, form.grupoEstablecimientoId]);

  // Manzanas/Urban sectors available for assignment in this municipalidad
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
    const start = manzanasPage * 20;
    return availableManzanas.slice(start, start + 20);
  }, [availableManzanas, manzanasPage]);

  // Selected entidad details (read-only Tipo de Entidad display)
  const selectedEntidadTipo = useMemo(() => {
    if (!form.entidadId) return "";
    const ent = entidades.find((e) => e.id === form.entidadId);
    return ent ? ent.tipoEntidad : "";
  }, [entidades, form.entidadId]);

  // Selected group of work details (read-only Distrito display)
  const selectedGrupoDistrito = useMemo(() => {
    if (!form.grupoTrabajoId) return "";
    const g = grupos.find((gr) => gr.id === form.grupoTrabajoId);
    if (!g) return "";
    const muni = municipalidades.find((m) => m.id === g.municipalidadId);
    return muni ? `${muni.distrito} (PE)` : "";
  }, [grupos, municipalidades, form.grupoTrabajoId]);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_MUNICIPAL") {
        setMuniFilter(session.user.municipalidadId || "");
      }
    }
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const session = getStoredSession();
      const userMuniId = session?.user?.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;

      const [actData, munData, tipData, grupData, entData, sectoresData, cpData] = await Promise.all([
        listActores(userMuniId),
        listMunicipalidades(),
        listTiposActorSocial(),
        listGrupos(userMuniId),
        listEntidades(),
        listSectores(),
        listCentrosPoblados(),
      ]);

      setActores(actData);
      setMunicipalidades(munData);
      setTiposActor(tipData.filter((t) => t.activo && !t.archivado));
      setGrupos(grupData);
      setEntidades(entData.filter((e) => e.activo && !e.archivado));
      setSectores(sectoresData);
      setCentrosPoblados(cpData);
    } catch (err: any) {
      setError(err.message || "Error al cargar la información inicial.");
    } finally {
      setIsLoading(false);
    }
  }

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

  function handleAddClick() {
    setError(null);
    setMessage(null);
    setViewingActor(null);
    const initialPass = generateSecurePassword();
    setForm({
      ...emptyActorSocialForm,
      municipalidadId: user?.rol === "ADMIN_MUNICIPAL" ? (user.municipalidadId || "") : "",
      password: initialPass,
    });
    setTimeline([
      {
        id: "1",
        author: user?.name || user?.username || "Supervisor",
        date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: "Creando un nuevo registro...",
      }
    ]);
    setViewMode("create");
  }

  function handleRowClick(actor: ActorSocialRecord) {
    setError(null);
    setMessage(null);
    setViewingActor(actor);
    setForm(toActorSocialForm(actor));
    setTimeline([
      {
        id: "1",
        author: "Sistema",
        date: "Hoy",
        text: `Visualizando registro del actor social. Estado actual: ${actor.estado}.`,
      }
    ]);
    setManzanasPage(0);
    setActiveTab("registros");
    setViewMode("detail");
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!form.municipalidadId) {
      setError("Debe seleccionar una municipalidad.");
      return;
    }
    if (!form.nombres || !form.apellidos) {
      setError("Debe consultar el DNI para autocompletar el nombre.");
      return;
    }
    if (!/^\d{9}$/.test(form.celular)) {
      setError("El celular debe tener exactamente 9 dígitos.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        entidadId: form.entidadId || null,
        grupoEstablecimientoId: form.grupoEstablecimientoId || null,
        centroPobladoId: form.centroPobladoId || null,
      } as any;

      const created = await createActor(payload);
      setActores((curr) => [created, ...curr]);
      
      // Go to detail mode
      setViewingActor(created);
      setForm(toActorSocialForm(created));
      setViewMode("detail");
      setMessage("Actor social registrado con éxito.");
    } catch (err: any) {
      setError(err.message || "Error al registrar el actor social.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!viewingActor) return;
    setError(null);
    setMessage(null);

    if (!/^\d{9}$/.test(form.celular)) {
      setError("El celular debe tener exactamente 9 dígitos.");
      return;
    }

    setIsSaving(true);
    try {
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

      const updated = await updateActor(viewingActor.id, payload);
      setActores((curr) => curr.map((a) => (a.id === updated.id ? updated : a)));
      setViewingActor(updated);
      setForm(toActorSocialForm(updated));
      setMessage("Actor social actualizado con éxito.");
    } catch (err: any) {
      setError(err.message || "Error al actualizar el actor social.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActivoDirect(actor: ActorSocialRecord) {
    const nextActivo = !actor.activo;
    setError(null);
    setMessage(null);
    try {
      const updated = await setActorActivo(actor.id, nextActivo);
      setActores((curr) => curr.map((a) => (a.id === updated.id ? updated : a)));
      setForm((curr) => ({ ...curr, activo: nextActivo }));
      if (viewingActor?.id === actor.id) {
        setViewingActor(updated);
      }
      appendTimeline(`Sistema: Estado activo cambiado a ${nextActivo ? "Activo" : "Inactivo"}`);
      setMessage(`Actor social ${nextActivo ? "activado" : "desactivado"} correctamente.`);
    } catch (err: any) {
      setError(err.message || "Error al cambiar estado activo.");
    }
  }

  async function handleTransitionEstado(actor: ActorSocialRecord, nextEstado: EstadoActorSocial) {
    setError(null);
    setMessage(null);
    try {
      const updated = await setActorEstado(actor.id, nextEstado);
      setActores((curr) => curr.map((a) => (a.id === updated.id ? updated : a)));
      setForm((curr) => ({ ...curr, estado: nextEstado }));
      if (viewingActor?.id === actor.id) {
        setViewingActor(updated);
      }
      appendTimeline(`Sistema: Estado de registro cambiado a ${nextEstado}`);
      setMessage(`Estado del actor social actualizado a ${nextEstado}.`);
    } catch (err: any) {
      setError(err.message || "Error al cambiar el estado de registro.");
    }
  }

  async function handleArchivar(actor: ActorSocialRecord) {
    setError(null);
    setMessage(null);
    try {
      const updated = await archivarActor(actor.id);
      setActores((curr) => curr.filter((a) => a.id !== updated.id));
      setViewMode("list");
      setViewingActor(null);
      setMessage("Actor social archivado con éxito.");
    } catch (err: any) {
      setError(err.message || "Error al archivar el actor social.");
    }
  }

  function openDeleteReasonModal(actorId: string) {
    setError(null);
    setMessage(null);
    setActorToDelete(actorId);
    setDeleteReason("");
    setIsReasonModalOpen(true);
  }

  async function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!actorToDelete || !deleteReason.trim()) return;

    setError(null);
    setMessage(null);
    try {
      const result = await deleteActor(actorToDelete, deleteReason);
      setActores((curr) => curr.filter((a) => a.id !== result.id));
      setIsReasonModalOpen(false);
      setViewMode("list");
      setViewingActor(null);
      setActorToDelete(null);
      setMessage(result.notificationMessage || "Actor social eliminado lógicamente.");
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

  // Sector Manzanas Assignments in Tab
  function handleToggleManzanaAssignment(sectorId: string) {
    setForm((curr) => {
      const nextSectores = [...curr.sectoresIds];
      const index = nextSectores.indexOf(sectorId);
      if (index > -1) {
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

  // Remove tag manually
  function handleRemoveSectorTag(sectorId: string) {
    setForm((curr) => ({
      ...curr,
      sectoresIds: curr.sectoresIds.filter((id) => id !== sectorId),
    }));
  }

  // Custom Autocomplete Search Modal Trigger
  function openSearchModal(type: "municipalidad" | "grupo" | "centro_poblado" | "centro_poblado_rural" | "establecimiento") {
    let title = "";
    if (type === "municipalidad") title = "Buscar: Municipalidad";
    if (type === "grupo") title = "Buscar: Grupo de Trabajo";
    if (type === "centro_poblado") title = "Buscar: Centro Poblado";
    if (type === "centro_poblado_rural") title = "Buscar: Centro Poblado Rural";
    if (type === "establecimiento") title = "Buscar: Establecimiento de Salud";

    setSearchModalConfig({
      isOpen: true,
      title,
      type,
      query: "",
      page: 0,
    });
  }

  // Advanced Search Modal list logic
  const modalFilteredItems = useMemo(() => {
    const q = searchModalConfig.query.toLowerCase().trim();
    const type = searchModalConfig.type;

    if (type === "municipalidad") {
      const filtered = municipalidades.filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.distrito.toLowerCase().includes(q) ||
          m.provincia.toLowerCase().includes(q)
      );
      return filtered.map((m) => ({
        id: m.id,
        cols: [m.departamento, m.provincia, m.distrito, m.ubigeo, m.nombre],
        raw: m,
      }));
    }

    if (type === "grupo") {
      const filtered = grupos.filter(
        (g) =>
          g.municipalidadId === form.municipalidadId &&
          (g.nombreGrupo.toLowerCase().includes(q) ||
            g.nombreRepresentante.toLowerCase().includes(q) ||
            g.apellidosRepresentante.toLowerCase().includes(q))
      );
      return filtered.map((g) => ({
        id: g.id,
        cols: [g.nombreGrupo, String(g.periodoYear), `${g.nombreRepresentante} ${g.apellidosRepresentante}`, g.estado],
        raw: g,
      }));
    }

    if (type === "centro_poblado") {
      const filtered = centrosPoblados.filter(
        (cp) =>
          cp.municipalidadId === form.municipalidadId &&
          cp.tipo === "URBANO" &&
          cp.activo &&
          !cp.archivado &&
          (cp.nombre.toLowerCase().includes(q) || (cp.codigo && cp.codigo.toLowerCase().includes(q)))
      );
      const muni = municipalidades.find((m) => m.id === form.municipalidadId);
      return filtered.map((cp) => ({
        id: cp.id,
        cols: [
          muni?.departamento || "",
          muni?.provincia || "",
          muni?.distrito || "",
          cp.codigo || "",
          cp.nombre,
          "Urbano",
        ],
        raw: cp,
      }));
    }

    if (type === "centro_poblado_rural") {
      const filtered = centrosPoblados.filter(
        (cp) =>
          cp.municipalidadId === form.municipalidadId &&
          cp.tipo === "RURAL" &&
          cp.activo &&
          !cp.archivado &&
          (cp.nombre.toLowerCase().includes(q) || (cp.codigo && cp.codigo.toLowerCase().includes(q)))
      );
      const muni = municipalidades.find((m) => m.id === form.municipalidadId);
      return filtered.map((cp) => ({
        id: cp.id,
        cols: [
          muni?.departamento || "",
          muni?.provincia || "",
          muni?.distrito || "",
          cp.codigo || "",
          cp.nombre,
          "Rural",
        ],
        raw: cp,
      }));
    }

    if (type === "establecimiento") {
      const selectedGroup = grupos.find((g) => g.id === form.grupoTrabajoId);
      if (!selectedGroup) return [];
      const ests = selectedGroup.establecimientos || [];
      const filtered = ests.filter((e) => e.nombre.toLowerCase().includes(q) || (e.codigo && e.codigo.includes(q)));
      return filtered.map((e) => ({
        id: e.id,
        cols: [e.nombre, e.codigo || "-", e.direccion || "-"],
        raw: e,
      }));
    }

    return [];
  }, [searchModalConfig, municipalidades, grupos, sectores, form.municipalidadId, form.grupoTrabajoId]);

  const modalPaginatedItems = useMemo(() => {
    const start = searchModalConfig.page * 10;
    return modalFilteredItems.slice(start, start + 10);
  }, [modalFilteredItems, searchModalConfig.page]);

  function handleModalSelect(id: string, name: string, raw: any) {
    if (searchModalConfig.type === "municipalidad") {
      handleMuniChange(id);
    } else if (searchModalConfig.type === "grupo") {
      setForm((curr) => ({ ...curr, grupoTrabajoId: id, grupoEstablecimientoId: "" }));
    } else if (searchModalConfig.type === "centro_poblado") {
      setForm((curr) => ({
        ...curr,
        centroPobladoId: id,
      }));
    } else if (searchModalConfig.type === "centro_poblado_rural") {
      setForm((curr) => ({
        ...curr,
        centroPobladoId: id,
      }));
    } else if (searchModalConfig.type === "establecimiento") {
      setForm((curr) => ({ ...curr, grupoEstablecimientoId: id }));
    }

    setSearchModalConfig((curr) => ({ ...curr, isOpen: false }));
  }

  function renderRow(a: ActorSocialRecord) {
    return (
      <tr key={a.id} onClick={() => handleRowClick(a)} style={{ cursor: "pointer", opacity: a.activo ? 1 : 0.6 }}>
        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" readOnly /></td>
        <td>
          {a.grupoEstablecimientoId 
            ? (grupos.flatMap(g => g.establecimientos || []).find(e => e.id === a.grupoEstablecimientoId)?.nombre || "-")
            : "-"}
        </td>
        <td>{a.dni}</td>
        <td>{a.apellidos}</td>
        <td>{a.nombres}</td>
        <td>{tiposMap[a.tipoActorSocialId] || "Cargando..."}</td>
        {user?.rol === "ADMIN_GENERAL" && (
          <td>{munisMap[a.municipalidadId] || "Cargando..."}</td>
        )}
        <td>
          <span className={`status-pill is-active`} style={{
            backgroundColor: a.estado === "APROBADO" ? "#2e7d32" : a.estado === "VALIDO" ? "#0288d1" : "#e65100",
            color: "white"
          }}>{a.estado}</span>
        </td>
      </tr>
    );
  }

  // Render List View
  if (viewMode === "list") {
    return (
      <>
        <div className="admin-page-heading">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button className="admin-button is-primary" onClick={handleAddClick} style={{ backgroundColor: "#71639e", color: "white" }} type="button">
              Nuevo
            </button>
            <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Registro de Actores Sociales</h1>
          </div>
        </div>

        <section className="admin-content-card" aria-label="Listado de Actores Sociales" style={{ padding: "1.5rem", borderRadius: "0.55rem", border: "1px solid var(--border)", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          {error && (
            <div className="admin-alert is-error" style={{ marginBottom: "1.25rem" }}>
              {error}
            </div>
          )}
          {message && (
            <div className="admin-alert is-success" style={{ marginBottom: "1.25rem" }}>
              {message}
            </div>
          )}

          <div className="admin-actions-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="admin-search-field" style={{ position: "relative", flex: 1, maxWidth: "450px" }}>
              <LuSearch className="search-icon" size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Buscar por DNI, nombres o apellidos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
              />
            </div>

            <div className="admin-actions-group" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <label className="field" style={{ margin: 0, flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
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
                  <option value="tipoActor">Tipo de Actor</option>
                  <option value="establecimiento">Establecimiento</option>
                </select>
              </label>

              <button
                className={`admin-button is-ghost ${showFilters ? "is-active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                style={{ height: "38px" }}
                type="button"
              >
                Filtros {showFilters ? "▲" : "▼"}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="admin-filters-grid" style={{ marginBottom: "1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", padding: "1.25rem", background: "#f8f9fa", borderRadius: "0.55rem", border: "1px solid #eee" }}>
              {user?.rol === "ADMIN_GENERAL" && (
                <label className="field">
                  Municipalidad
                  <select value={muniFilter} onChange={(e) => setMuniFilter(e.target.value)}>
                    <option value="">Todas</option>
                    {municipalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field">
                Estado
                <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="REGISTRADO">Registrado</option>
                  <option value="VALIDO">Válido</option>
                  <option value="APROBADO">Aprobado</option>
                </select>
              </label>
            </div>
          )}

          <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
            <span>{filteredActores.length} actores sociales encontrados</span>
            <span>
              {isLoading ? "Cargando..." : `1-${filteredActores.length} de ${filteredActores.length}`}
            </span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}><input type="checkbox" readOnly /></th>
                  <th onClick={() => handleSort("establecimiento")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Establecimiento Salud{getSortIcon("establecimiento")}
                  </th>
                  <th onClick={() => handleSort("dni")} style={{ cursor: "pointer", userSelect: "none" }}>
                    DNI{getSortIcon("dni")}
                  </th>
                  <th onClick={() => handleSort("apellidos")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Apellidos{getSortIcon("apellidos")}
                  </th>
                  <th onClick={() => handleSort("nombres")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Nombres{getSortIcon("nombres")}
                  </th>
                  <th onClick={() => handleSort("tipoActor")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Tipo Actor Social{getSortIcon("tipoActor")}
                  </th>
                  {user?.rol === "ADMIN_GENERAL" && (
                    <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Municipalidad{getSortIcon("municipalidad")}
                    </th>
                  )}
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {groupBy ? (
                  groupedActores && Object.keys(groupedActores).map((groupName) => (
                    <Fragment key={groupName}>
                      <tr style={{ background: "#f8f9fa" }}>
                        <td colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                          📁 {groupName} ({groupedActores[groupName].length})
                        </td>
                      </tr>
                      {groupedActores[groupName].map((a) => renderRow(a))}
                    </Fragment>
                  ))
                ) : (
                  sortedActores.map((a) => renderRow(a))
                )}
                {!isLoading && filteredActores.length === 0 ? (
                  <tr>
                    <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7}>
                      No se encontraron actores sociales.
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

  // Form / Detail view
  const currentStepIndex = ["BORRADOR", "REGISTRADO", "VALIDO", "APROBADO"].indexOf(form.estado || "BORRADOR");

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "2rem" }}>
        
        {/* Detail/Create Top Left controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            className="admin-button is-ghost"
            onClick={() => handleAddClick()}
            style={{ backgroundColor: "#f5f5f5", color: "#333", border: "1px solid #ccc" }}
            type="button"
          >
            Nuevo
          </button>
          
          <span style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--text)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            {viewMode === "create" 
              ? "Registro de Actores Sociales / Nuevo" 
              : `Registro de Actores Sociales / [${viewingActor?.dni}] ${viewingActor?.apellidos} ${viewingActor?.nombres}`}
            
            {viewMode === "detail" && viewingActor && (
              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  type="button"
                  onClick={() => setIsGearMenuOpen(!isGearMenuOpen)}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: "0.25rem", color: "var(--muted)" }}
                >
                  <LuSettings size={18} />
                </button>
                {isGearMenuOpen && (
                  <div style={{ position: "absolute", top: "100%", left: 0, background: "white", border: "1px solid #ccc", borderRadius: "0.25rem", boxShadow: "0 2px 5px rgba(0,0,0,0.15)", zIndex: 10, width: "120px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsGearMenuOpen(false);
                        setConfirmConfig({
                          isOpen: true,
                          title: "Archivar Actor Social",
                          message: "¿Seguro que deseas archivar este actor social? No aparecerá en los listados activos pero mantendrá su historial.",
                          onConfirm: () => handleArchivar(viewingActor),
                        });
                      }}
                      style={{ width: "100%", border: "none", background: "transparent", padding: "0.5rem 0.75rem", cursor: "pointer", textAlign: "left", fontSize: "0.9rem" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      Archivar
                    </button>
                  </div>
                )}
              </div>
            )}
          </span>
          
          <button
            className="admin-button is-primary"
            onClick={viewMode === "create" ? handleCreateSubmit : handleUpdateSubmit}
            style={{ marginLeft: "1rem" }}
            disabled={
              isSaving ||
              !form.dni.trim() || form.dni.length !== 8 || 
              !form.nombres.trim() || 
              !form.apellidos.trim() || 
              !form.celular.trim() || form.celular.length !== 9 || 
              !form.tipoActorSocialId || 
              !form.grupoTrabajoId || 
              !form.grupoEstablecimientoId ||
              (user?.rol === "ADMIN_GENERAL" && !form.municipalidadId)
            }
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
          <button
            className="admin-button is-ghost"
            onClick={() => setViewMode("list")}
            type="button"
          >
            Cancelar
          </button>
        </div>

        {/* State Flow Bar (Top Right) */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {["Borrador", "Registrado", "Validado", "Aprobado"].map((step, idx) => {
            const stepEnum = step.toUpperCase() === "VALIDADO" ? "VALIDO" : step.toUpperCase();
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            return (
              <div
                key={step}
                onClick={() => {
                  if (viewMode === "detail" && viewingActor) {
                    setConfirmConfig({
                      isOpen: true,
                      title: "Cambiar Estado",
                      message: `¿Seguro que deseas cambiar el estado a ${stepEnum}?`,
                      onConfirm: () => handleTransitionEstado(viewingActor, stepEnum as EstadoActorSocial),
                    });
                  }
                }}
                style={{
                  padding: "0.5rem 1rem",
                  background: isActive ? "#71639e" : isCompleted ? "#f3e8ff" : "transparent",
                  color: isActive ? "white" : "var(--text)",
                  border: "1px solid #ccc",
                  borderLeft: idx > 0 ? "none" : "1px solid #ccc",
                  cursor: viewMode === "detail" ? "pointer" : "default",
                  borderRadius: idx === 0 ? "0.25rem 0 0 0.25rem" : idx === 3 ? "0 0.25rem 0.25rem 0" : "0",
                  fontSize: "0.9rem",
                  fontWeight: isActive ? "bold" : "normal"
                }}
              >
                {step}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="admin-alert is-error" style={{ marginBottom: "1.25rem" }}>
          {error}
        </div>
      )}
      {message && (
        <div className="admin-alert is-success" style={{ marginBottom: "1.25rem" }}>
          {message}
        </div>
      )}

      {/* Main detail page split layout */}
      <div style={{ display: "grid", gridTemplateColumns: "2.8fr 1.2fr", gap: "2rem" }}>
        
        {/* Left Side: General Form Panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr", gap: "2.5rem", background: "white", padding: "2rem", borderRadius: "0.55rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            
            {/* ACTOR SOCIAL FIELDSET */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", borderBottom: "2px solid #71639e", paddingBottom: "0.5rem", margin: 0 }}>ACTOR SOCIAL</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <label className="field">
                  Tipo Actor Social *
                  <select
                    value={form.tipoActorSocialId}
                    onChange={(e) => setForm((curr) => ({ ...curr, tipoActorSocialId: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona tipo...</option>
                    {tiposActor.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tipoActor}
                      </option>
                    ))}
                  </select>
                  {!form.tipoActorSocialId && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      El tipo de actor social es obligatorio.
                    </span>
                  )}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                    <label className="field" style={{ flex: 1, margin: 0 }}>
                      DNI *
                      <input
                        type="text"
                        maxLength={8}
                        required
                        value={form.dni}
                        onChange={(e) => setForm((curr) => ({ ...curr, dni: e.target.value }))}
                        placeholder="DNI de 8 dígitos"
                        disabled={viewMode === "detail"}
                      />
                    </label>
                    {viewMode === "create" && (
                      <button
                        className="admin-button is-primary"
                        type="button"
                        style={{ height: "42px" }}
                        disabled={isSearchingDni}
                        onClick={handleDniLookup}
                      >
                        {isSearchingDni ? "..." : "Consultar"}
                      </button>
                    )}
                  </div>
                  {(!form.dni.trim() || form.dni.length !== 8) && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      DNI debe tener exactamente 8 dígitos.
                    </span>
                  )}
                </div>

                <label className="field">
                  Apellidos (Autocompletado) *
                  <input
                    type="text"
                    required
                    disabled
                    value={form.apellidos}
                    placeholder="Se autocompleta con DNI"
                  />
                  {!form.apellidos.trim() && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      Los apellidos son obligatorios (consulte el DNI).
                    </span>
                  )}
                </label>

                <label className="field">
                  Nombres (Autocompletado) *
                  <input
                    type="text"
                    required
                    disabled
                    value={form.nombres}
                    placeholder="Se autocompleta con DNI"
                  />
                  {!form.nombres.trim() && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      Los nombres son obligatorios (consulte el DNI).
                    </span>
                  )}
                </label>

                <label className="field">
                  Dirección *
                  <input
                    type="text"
                    required
                    value={form.direccion}
                    onChange={(e) => setForm((curr) => ({ ...curr, direccion: e.target.value }))}
                    placeholder="Dirección del actor social"
                  />
                </label>

                <label className="field">
                  Fecha de Nacimiento *
                  <input
                    type="date"
                    required
                    value={form.fechaNac}
                    onChange={(e) => setForm((curr) => ({ ...curr, fechaNac: e.target.value }))}
                    disabled={viewMode === "detail"}
                  />
                </label>

                <label className="field">
                  Correo Electrónico *
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((curr) => ({ ...curr, email: e.target.value }))}
                    placeholder="correo@ejemplo.com"
                  />
                </label>

                <label className="field">
                  Celular (9 dígitos) *
                  <input
                    type="text"
                    maxLength={9}
                    required
                    value={form.celular}
                    onChange={(e) => setForm((curr) => ({ ...curr, celular: e.target.value }))}
                    placeholder="Ej. 987654321"
                  />
                  {(!form.celular.trim() || form.celular.length !== 9) && (
                    <span style={{ color: "#d32f2f", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                      Celular debe tener exactamente 9 dígitos.
                    </span>
                  )}
                </label>

                <label className="field">
                  Idioma de Origen *
                  <select
                    value={form.idiomaOrigen}
                    onChange={(e) => setForm((curr) => ({ ...curr, idiomaOrigen: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona idioma...</option>
                    {IDIOMAS_ORIGEN.map((i) => (
                      <option key={i} value={i}>
                        {i}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  Grado de Instrucción *
                  <select
                    value={form.gradoInstruccion}
                    onChange={(e) => setForm((curr) => ({ ...curr, gradoInstruccion: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona grado...</option>
                    {GRADOS_INSTRUCCION.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Status Toggles */}
                <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={() => {
                        if (viewMode === "detail" && viewingActor) {
                          void handleToggleActivoDirect(viewingActor);
                        } else {
                          setForm(curr => ({ ...curr, activo: !curr.activo }));
                        }
                      }}
                    />
                    <strong>Activo</strong>
                  </label>

                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", color: form.inactivadoPermanentemente ? "var(--color-danger)" : "inherit" }}>
                    <input
                      type="checkbox"
                      checked={form.inactivadoPermanentemente}
                      onChange={(e) => setForm(curr => ({ ...curr, inactivadoPermanentemente: e.target.checked }))}
                    />
                    <strong>Inactivado Permanentemente</strong>
                  </label>
                </div>

                <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>Tipo entidad: <strong>{selectedEntidadTipo || "-"}</strong></p>
                  <label className="field">
                    Entidad
                    <select
                      value={form.entidadId}
                      onChange={(e) => setForm((curr) => ({ ...curr, entidadId: e.target.value }))}
                    >
                      <option value="">Ninguno / Sin adscripción</option>
                      {entidades.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </div>

            {/* GRUPO DE TRABAJO FIELDSET */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", borderBottom: "2px solid #71639e", paddingBottom: "0.5rem", margin: 0 }}>GRUPO DE TRABAJO/ESTABLECIMIENTO DE SALUD</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {user?.rol === "ADMIN_GENERAL" && viewMode === "create" ? (
                  <AutocompleteSearch
                    label="Municipalidad"
                    placeholder="Escribe para buscar municipalidad..."
                    value={form.municipalidadId}
                    displayValue={selectedMuniName}
                    options={municipalidadesOptions}
                    onChange={(id) => handleMuniChange(id)}
                    onSearchMore={() => openSearchModal("municipalidad")}
                    required
                  />
                ) : null}

                <AutocompleteSearch
                  label="Grupo de trabajo"
                  placeholder="Buscar grupo de trabajo..."
                  value={form.grupoTrabajoId}
                  displayValue={selectedGrupoName}
                  options={gruposOptions}
                  onChange={(id) => setForm((curr) => ({ ...curr, grupoTrabajoId: id, grupoEstablecimientoId: "" }))}
                  onSearchMore={() => openSearchModal("grupo")}
                  required
                />

                <p style={{ margin: 0, fontSize: "0.9rem" }}>
                  <strong>Grupo de trabajo/Distrito:</strong><br />
                  <span style={{ color: "var(--muted)" }}>{selectedGrupoDistrito || "-"}</span>
                </p>

                {/* Combobox replacement for Centro Poblado (Urban) */}
                <AutocompleteSearch
                  label="Centro Poblado"
                  placeholder="Buscar Centro Poblado..."
                  value={form.centroPobladoId}
                  displayValue={selectedCpUrbanoName}
                  options={urbanCentroPobladosOptions}
                  onChange={(id) =>
                    setForm((curr) => ({
                      ...curr,
                      centroPobladoId: id,
                    }))
                  }
                  onSearchMore={() => openSearchModal("centro_poblado")}
                />

                {/* Combobox replacement for Centro Poblado Rural */}
                <AutocompleteSearch
                  label="Centro Poblado Rural"
                  placeholder="Buscar Centro Poblado Rural..."
                  value={form.centroPobladoId}
                  displayValue={selectedCpRuralName}
                  options={ruralCentroPobladosOptions}
                  onChange={(id) =>
                    setForm((curr) => ({
                      ...curr,
                      centroPobladoId: id,
                    }))
                  }
                  onSearchMore={() => openSearchModal("centro_poblado_rural")}
                />

                <AutocompleteSearch
                  label="Establecimiento Salud"
                  placeholder="Buscar establecimiento..."
                  value={form.grupoEstablecimientoId}
                  displayValue={selectedEstablecimientoName}
                  options={establecimientosOptions}
                  onChange={(id) => setForm((curr) => ({ ...curr, grupoEstablecimientoId: id }))}
                  onSearchMore={() => openSearchModal("establecimiento")}
                />

                {/* Sectores relation tags block */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Sectores</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", minHeight: "2.5rem", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.25rem", background: "var(--surface-muted)" }}>
                    {form.sectoresIds.map((id) => {
                      const sec = sectores.find((s) => s.id === id);
                      return sec ? (
                        <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.15rem 0.5rem", fontSize: "0.8rem", background: "#e8e8e8", borderRadius: "1rem", border: "1px solid #ccc" }}>
                          {sec.centroPoblado?.nombre || "-"} - {sec.nombreSector}
                          <button
                            type="button"
                            onClick={() => handleRemoveSectorTag(id)}
                            style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem", color: "#888" }}
                          >
                            ✕
                          </button>
                        </span>
                      ) : null;
                    })}
                    {form.sectoresIds.length === 0 && <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>Sin sectores asignados</span>}
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Sectores a corregir</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", minHeight: "2.5rem", padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "0.25rem", background: "var(--surface-muted)" }}>
                    {form.sectoresIds.map((id) => {
                      const sec = sectores.find((s) => s.id === id);
                      return sec ? (
                        <span key={id} style={{ display: "inline-flex", alignItems: "center", padding: "0.15rem 0.5rem", fontSize: "0.8rem", background: "#fde8e8", color: "#c81e1e", borderRadius: "1rem", border: "1px solid #f8b4b4" }}>
                          {sec.centroPoblado?.nombre || "-"} - {sec.nombreSector}
                        </span>
                      ) : null;
                    })}
                    {form.sectoresIds.length === 0 && <span style={{ fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>Sin sectores asignados</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab lists under form */}
          <div style={{ background: "white", padding: "2rem", borderRadius: "0.55rem", border: "1px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", borderBottom: "2px solid var(--border)", marginBottom: "1rem" }}>
              <button
                type="button"
                onClick={() => setActiveTab("registros")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === "registros" ? "3px solid #71639e" : "none",
                  fontWeight: activeTab === "registros" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                Registros
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("manzanas")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  border: "none",
                  borderBottom: activeTab === "manzanas" ? "3px solid #71639e" : "none",
                  fontWeight: activeTab === "manzanas" ? "bold" : "normal",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                Asignacion de manzanas
              </button>
            </div>

            {activeTab === "registros" ? (
              <div style={{ padding: "1rem 0", color: "var(--muted)", fontStyle: "italic" }}>
                No hay registros adicionales en esta sección.
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
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
                    <span style={{ alignSelf: "center", fontSize: "0.85rem" }}>
                      {manzanasPage * 20 + 1}-{Math.min((manzanasPage + 1) * 20, availableManzanas.length)} de {availableManzanas.length}
                    </span>
                    <button
                      className="admin-button is-ghost"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
                      disabled={(manzanasPage + 1) * 20 >= availableManzanas.length}
                      onClick={() => setManzanasPage(p => p + 1)}
                      type="button"
                    >
                      ▶
                    </button>
                  </div>
                </div>

                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Sector</th>
                        <th>Zona</th>
                        <th>Manzana</th>
                        <th style={{ width: "100px", textAlign: "center" }}>Asignado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedManzanas.map((m) => {
                        const isAssigned = form.sectoresIds.includes(m.id);
                        return (
                          <tr key={m.id}>
                            <td>{m.nombreSector}</td>
                            <td>{m.urbano?.zona || "-"}</td>
                            <td>{m.urbano?.manzana || "-"}</td>
                            <td style={{ textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isAssigned}
                                onChange={() => handleToggleManzanaAssignment(m.id)}
                                style={{ transform: "scale(1.2)", cursor: "pointer" }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      {availableManzanas.length === 0 && (
                        <tr>
                          <td className="admin-empty-cell" colSpan={4}>
                            No hay sectores urbanos en esta municipalidad.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Timeline / Chatter Log */}
        <div style={{ background: "#f8f9fa", border: "1px solid var(--border)", padding: "1.5rem", borderRadius: "0.55rem", display: "flex", flexDirection: "column", height: "fit-content" }}>
          
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              className="admin-button is-primary"
              style={{ flex: 1, backgroundColor: "#71639e" }}
              type="button"
              onClick={() => appendTimeline("Supervisor envió un mensaje")}
            >
              Enviar mensaje
            </button>
            <button
              className="admin-button is-ghost"
              style={{ flex: 1, border: "1px solid #ccc", background: "white" }}
              type="button"
              onClick={handleSendNote}
            >
              Registrar una nota
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--muted)", flex: 1 }}>Seguidores: <strong>1</strong></span>
            <button
              className="admin-button is-ghost"
              style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
              type="button"
            >
              Seguir
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "500px", overflowY: "auto", paddingRight: "0.5rem" }}>
            {timeline.map((item) => (
              <div key={item.id} style={{ background: "white", padding: "1rem", borderRadius: "0.25rem", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", borderLeft: "4px solid #71639e" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", fontSize: "0.85rem" }}>
                  <strong>{item.author}</strong>
                  <span style={{ color: "var(--muted)" }}>{item.date}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text)" }}>{item.text}</p>
              </div>
            ))}
            {timeline.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--muted)", padding: "2rem 0" }}>
                <span>💬</span><br />
                <span style={{ fontSize: "0.85rem" }}>La conversación está vacía.</span>
              </div>
            )}
          </div>

          <textarea
            rows={3}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Escribe una nota interna aquí..."
            style={{ marginTop: "1.5rem", padding: "0.75rem", borderRadius: "0.25rem", border: "1px solid var(--border)", width: "100%" }}
          />
        </div>
      </div>

      {/* Advanced Search Modal */}
      {searchModalConfig.isOpen && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: "800px", width: "90%" }}>
            <div className="admin-modal-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #ccc", padding: "1rem" }}>
              <h2 style={{ margin: 0 }}>{searchModalConfig.title}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setSearchModalConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
                style={{ fontSize: "1.5rem", border: "none", background: "transparent", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Sub-header displaying selected municipalidad details */}
            {searchModalConfig.type !== "municipalidad" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", padding: "0.75rem 1rem", background: "#f8f9fa", borderBottom: "1px solid #eee", fontSize: "0.9rem" }}>
                <div><strong>Departamento:</strong> {municipalidades.find((m) => m.id === form.municipalidadId)?.departamento || "No seleccionado"}</div>
                <div><strong>Provincia:</strong> {municipalidades.find((m) => m.id === form.municipalidadId)?.provincia || "No seleccionado"}</div>
                <div><strong>Distrito:</strong> {municipalidades.find((m) => m.id === form.municipalidadId)?.distrito || "No seleccionado"}</div>
              </div>
            )}

            <div style={{ padding: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", gap: "1rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <LuSearch style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#888" }} />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchModalConfig.query}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchModalConfig((curr) => ({ ...curr, query: val, page: 0 }));
                    }}
                    style={{
                      width: "100%",
                      paddingLeft: "2.5rem",
                      background: "white",
                      color: "#333",
                      border: "1px solid #ccc",
                      borderRadius: "0.25rem",
                      height: "38px",
                    }}
                  />
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
                  <button
                    className="admin-button is-ghost"
                    style={{ padding: "0.25rem 0.5rem" }}
                    disabled={searchModalConfig.page === 0}
                    onClick={() => setSearchModalConfig((curr) => ({ ...curr, page: curr.page - 1 }))}
                    type="button"
                  >
                    <LuChevronLeft />
                  </button>
                  <span>
                    {searchModalConfig.page * 10 + 1}-{Math.min((searchModalConfig.page + 1) * 10, modalFilteredItems.length)} de {modalFilteredItems.length}
                  </span>
                  <button
                    className="admin-button is-ghost"
                    style={{ padding: "0.25rem 0.5rem" }}
                    disabled={(searchModalConfig.page + 1) * 10 >= modalFilteredItems.length}
                    onClick={() => setSearchModalConfig((curr) => ({ ...curr, page: curr.page + 1 }))}
                    type="button"
                  >
                    <LuChevronRight />
                  </button>
                </div>
              </div>

              <div className="admin-table-wrap" style={{ maxHeight: "350px", overflowY: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      {searchModalConfig.type === "municipalidad" && (
                        <>
                          <th>Departamento</th>
                          <th>Provincia</th>
                          <th>Distrito</th>
                          <th>Ubigeo</th>
                          <th>Municipalidad</th>
                        </>
                      )}
                      {searchModalConfig.type === "grupo" && (
                        <>
                          <th>Nombre de Grupo</th>
                          <th>Año Periodo</th>
                          <th>Representante</th>
                          <th>Estado</th>
                        </>
                      )}
                      {(searchModalConfig.type === "centro_poblado" || searchModalConfig.type === "centro_poblado_rural") && (
                        <>
                          <th>Departamento</th>
                          <th>Provincia</th>
                          <th>Distrito</th>
                          <th>Ubigeo del CC.PP</th>
                          <th>Centro Poblado</th>
                          <th>Tipo</th>
                        </>
                      )}
                      {searchModalConfig.type === "establecimiento" && (
                        <>
                          <th>Establecimiento</th>
                          <th>Código</th>
                          <th>Dirección</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {modalPaginatedItems.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleModalSelect(item.id, item.cols[item.cols.length - 1], item.raw)}
                        style={{ cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5eeff")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {item.cols.map((col, idx) => (
                          <td key={idx}>{col}</td>
                        ))}
                      </tr>
                    ))}
                    {modalFilteredItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="admin-empty-cell">
                          No se encontraron registros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-form-actions" style={{ borderTop: "1px solid #ccc", padding: "1rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setSearchModalConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Motivo de Eliminación */}
      {isReasonModalOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <form className="admin-modal" style={{ maxWidth: "480px" }} onSubmit={handleDeleteSubmit}>
            <div className="admin-modal-header">
              <h2>Confirmar Eliminación Lógica</h2>
              <button className="admin-modal-close" onClick={() => setIsReasonModalOpen(false)} type="button">
                ×
              </button>
            </div>
            <div style={{ padding: "1rem" }}>
              <label className="field">
                Especifique el Motivo de la Eliminación (Obligatorio)
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Escriba aquí la justificación por la cual se elimina a este actor social del sistema..."
                />
              </label>
            </div>
            <div className="admin-form-actions">
              <button className="admin-button is-ghost" onClick={() => setIsReasonModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="admin-button" style={{ background: "var(--color-danger, #d32f2f)", color: "#fff" }} type="submit">
                Confirmar Eliminación
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Modal de Confirmación Genérico */}
      {confirmConfig.isOpen ? (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <div className="admin-modal" style={{ maxWidth: "480px" }}>
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
            <div style={{ padding: "1.5rem 1rem" }}>
              <p style={{ margin: 0, fontSize: "1.05rem", lineHeight: "1.5", color: "var(--text)" }}>
                {confirmConfig.message}
              </p>
            </div>
            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setConfirmConfig((curr) => ({ ...curr, isOpen: false }))}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                onClick={async () => {
                  setConfirmConfig((curr) => ({ ...curr, isOpen: false }));
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
