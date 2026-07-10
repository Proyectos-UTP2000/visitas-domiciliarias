import { useState, useEffect, useMemo, Fragment } from "react";
import { getStoredSession } from "../../auth/auth-storage";
import {
  listVisitas,
  programarVisita,
  programarVisitasBulk,
  ejecutarVisita,
  marcarInconclusaVisita,
  reprogramarVisita,
} from "../visitas-api";
import type {
  VisitaDomiciliariaRecord,
  ProgramarVisitaFormState,
  EjecutarVisitaFormState,
  EstadoVisita,
} from "../visitas-types";
import { listNinos } from "../../ninos/ninos-api";
import type { NinoRecord } from "../../ninos/ninos-types";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { listActores } from "../../actores-sociales/actores-sociales-api";
import type { ActorSocialRecord } from "../../actores-sociales/actores-sociales-types";
import { listSectores } from "../../sectores/sectores-api";
import {
  LuSearch,
  LuPlus,
  LuCircleCheck,
  LuCircleX,
  LuCalendar,
  LuTriangleAlert,
  LuMessageSquare,
  LuChevronLeft,
  LuChevronRight,
  LuList,
  LuClock,
  LuArrowUp,
  LuArrowDown,
  LuArrowUpDown,
} from "react-icons/lu";
import { AutocompleteSearch } from "../../../shared/AutocompleteSearch";

const INITIAL_PROGRAMAR_FORM: ProgramarVisitaFormState = {
  ninoId: "",
  actorSocialId: "",
  fechaProgramada: "",
};

const INITIAL_EJECUTAR_FORM: EjecutarVisitaFormState = {
  fechaEjecucion: new Date().toISOString().split("T")[0],
  peso: "",
  hierroEntregado: false,
  consejeriaBrindada: false,
  alertas: "",
  comentarios: "",
  tipoRegistro: "Visita presencial",
  latitud: "",
  longitud: "",
  evidenciaUrl: "",
};

export default function VisitasPage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<VisitaDomiciliariaRecord[]>([]);
  const [ninos, setNinos] = useState<NinoRecord[]>([]);
  const [actores, setActores] = useState<ActorSocialRecord[]>([]);
  const [munis, setMunis] = useState<MunicipalidadRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Nuevos estados
  const [viewMode, setViewMode] = useState<"TABLE" | "CALENDAR">("TABLE");
  const [calendarDate, setCalendarDate] = useState(new Date());

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Generador automático
  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoNinoId, setAutoNinoId] = useState("");
  const [autoStartDate, setAutoStartDate] = useState(tomorrowStr);
  const [autoVisitas, setAutoVisitas] = useState<any[]>([]);

  // Programación en lote
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSectorId, setBulkSectorId] = useState("");
  const [bulkSelectedNinoIds, setBulkSelectedNinoIds] = useState<Record<string, boolean>>({});
  const [bulkDate, setBulkDate] = useState("");
  const [sectores, setSectores] = useState<any[]>([]);

  // Nuevos estados para listado por niños
  const [selectedNinoId, setSelectedNinoId] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<"NONE" | "ACTOR" | "SECTOR" | "CENTRO_POBLADO">("NONE");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<"NAME" | "SECTOR" | "ACTOR" | "VISITAS" | "NONE">("NONE");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEjecutarForm((prev) => ({
          ...prev,
          evidenciaUrl: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  function openEjecutarModal(v: VisitaDomiciliariaRecord) {
    setSelectedVisita(v);
    setEjecutarForm({
      fechaEjecucion: v.fechaEjecucion ? v.fechaEjecucion.split("T")[0] : new Date().toISOString().split("T")[0],
      peso: v.peso ? String(v.peso) : "",
      hierroEntregado: !!v.hierroEntregado,
      consejeriaBrindada: !!v.consejeriaBrindada,
      alertas: v.alertas || "",
      comentarios: v.comentarios || "",
      tipoRegistro: v.tipoRegistro || "Visita presencial",
      latitud: v.latitud || "",
      longitud: v.longitud || "",
      evidenciaUrl: v.evidenciaUrl || "",
    });
    setShowEjecutarModal(true);
  }

  function getAgeInMonthsAndDays(fechaNacStr: string): string {
    const birth = new Date(fechaNacStr);
    if (isNaN(birth.getTime())) return "";
    const now = new Date();
    
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();
    
    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      days += prevMonth;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    
    const totalMonths = years * 12 + months;
    return `${totalMonths} meses y ${days} días`;
  }

  function getAgeInMonthsNum(fechaNacStr: string): number {
    const birth = new Date(fechaNacStr);
    if (isNaN(birth.getTime())) return -1;
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  }

  // Filtros
  const [search, setSearch] = useState("");
  const [filterMuni, setFilterMuni] = useState("");
  const [filterActor, setFilterActor] = useState("TODOS");
  const [filterEstado, setFilterEstado] = useState<string>("TODOS");

  // Modales
  const [showProgramarModal, setShowProgramarModal] = useState(false);
  const [programarForm, setProgramarForm] = useState<ProgramarVisitaFormState>(INITIAL_PROGRAMAR_FORM);

  const [showEjecutarModal, setShowEjecutarModal] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<VisitaDomiciliariaRecord | null>(null);
  const [ejecutarForm, setEjecutarForm] = useState<EjecutarVisitaFormState>(INITIAL_EJECUTAR_FORM);

  const [showInconclusaModal, setShowInconclusaModal] = useState(false);
  const [motivoInconclusa, setMotivoInconclusa] = useState("");

  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [nuevaFechaProgramada, setNuevaFechaProgramada] = useState("");
  const [motivoReprog, setMotivoReprog] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda Avanzada (Autocomplete fallbacks)
  const [searchModalConfig, setSearchModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    type: "municipalidad" | "actor";
    query: string;
    page: number;
  }>({
    isOpen: false,
    title: "",
    type: "municipalidad",
    query: "",
    page: 0,
  });

  function openSearchModal(type: "municipalidad" | "actor") {
    let title = "";
    if (type === "municipalidad") title = "Buscar Municipalidad";
    else if (type === "actor") title = "Buscar Actor Social";

    setSearchModalConfig({
      isOpen: true,
      title,
      type,
      query: "",
      page: 0,
    });
  }

  function handleModalSelect(id: string, name: string, raw?: any) {
    if (searchModalConfig.type === "municipalidad") {
      setFilterMuni(id === "TODAS_MUNIS" ? "" : id);
    } else {
      setFilterActor(id);
    }
    setSearchModalConfig((curr) => ({ ...curr, isOpen: false }));
  }

  // Filtrado y paginación interna del modal de búsqueda avanzada
  const modalFilteredItems = useMemo(() => {
    const q = searchModalConfig.query.toLowerCase().trim();
    const type = searchModalConfig.type;

    if (type === "municipalidad") {
      const filtered = munis.filter((m) => m.nombre.toLowerCase().includes(q));
      const base = filtered.map((m) => ({
        id: m.id,
        name: m.nombre,
        sub: `${m.departamento} > ${m.provincia} > ${m.distrito}`,
        raw: m,
      }));
      // Opción de "Todas" si no hay query o coincide
      if (!q || "todas las municipalidades".includes(q)) {
        return [{ id: "TODAS_MUNIS", name: "Todas las municipalidades...", sub: "Mostrar visitas de todas las municipalidades", raw: null }, ...base];
      }
      return base;
    }

    if (type === "actor") {
      const filtered = actores.filter((a) =>
        `${a.apellidos} ${a.nombres}`.toLowerCase().includes(q) ||
        a.dni.includes(q)
      );
      const base = filtered.map((a) => ({
        id: a.id,
        name: `${a.apellidos}, ${a.nombres}`,
        sub: `DNI: ${a.dni} | Celular: ${a.celular || "-"}`,
        raw: a,
      }));
      if (!q || "todos los actores sociales".includes(q)) {
        return [{ id: "TODOS", name: "Todos los actores sociales", sub: "Mostrar visitas de todos los actores sociales", raw: null }, ...base];
      }
      return base;
    }

    return [];
  }, [searchModalConfig.query, searchModalConfig.type, munis, actores]);

  const modalPaginatedItems = useMemo(() => {
    const start = searchModalConfig.page * 10;
    return modalFilteredItems.slice(start, start + 10);
  }, [modalFilteredItems, searchModalConfig.page]);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_GENERAL") {
        listMunicipalidades().then(setMunis).catch(console.error);
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
      const muniId = user.rol === "ADMIN_MUNICIPAL" ? user.municipalidadId : null;
      const targetMuni = muniId || filterMuni;
      if (targetMuni) {
        listNinos(targetMuni)
          .then((data) => setNinos(data.filter((n) => n.activo)))
          .catch(console.error);

        listActores(targetMuni)
          .then((data) => setActores(data.filter((a) => a.activo)))
          .catch(console.error);

        listSectores(targetMuni)
          .then((data) => setSectores(data.filter((s) => s.activo)))
          .catch(console.error);
      }
    }
  }, [user, filterMuni]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const muniId = user?.rol === "ADMIN_MUNICIPAL" ? user.municipalidadId : filterMuni || null;
      const data = await listVisitas({
        municipalidadId: muniId,
        actorSocialId: user?.rol === "ACTOR_SOCIAL" ? user.actorSocialId : null,
      });
      setRecords(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar visitas domiciliarias");
    } finally {
      setLoading(false);
    }
  }

  // Auto-seleccionar actor social asignado al niño
  function handleNinoChange(ninoId: string) {
    const selectedNino = ninos.find((n) => n.id === ninoId);
    let actorId = "";
    if (selectedNino && selectedNino.asignaciones && selectedNino.asignaciones.length > 0) {
      actorId = selectedNino.asignaciones[0].actorSocialId;
    }
    setProgramarForm((prev) => ({
      ...prev,
      ninoId,
      actorSocialId: actorId,
    }));
  }

  async function handleProgramarSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!programarForm.ninoId || !programarForm.actorSocialId || !programarForm.fechaProgramada) {
      setError("Todos los campos marcados con * son obligatorios");
      return;
    }

    try {
      await programarVisita(programarForm);
      setMessage("Visita domiciliaria programada exitosamente");
      setShowProgramarModal(false);
      setProgramarForm(INITIAL_PROGRAMAR_FORM);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al programar visita");
    }
  }

  async function handleEjecutarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisita) return;
    setError(null);
    setMessage(null);

    try {
      await ejecutarVisita(selectedVisita.id, ejecutarForm);
      setMessage("Visita ejecutada registrada correctamente");
      setShowEjecutarModal(false);
      setSelectedVisita(null);
      setEjecutarForm(INITIAL_EJECUTAR_FORM);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al registrar ejecución");
    }
  }

  async function handleInconclusaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisita) return;
    setError(null);
    setMessage(null);

    if (!motivoInconclusa.trim()) {
      setError("Debe detallar el motivo");
      return;
    }

    try {
      await marcarInconclusaVisita(selectedVisita.id, motivoInconclusa);
      setMessage("Visita marcada como inconclusa");
      setShowInconclusaModal(false);
      setSelectedVisita(null);
      setMotivoInconclusa("");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado");
    }
  }

  async function handleReprogramarSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVisita) return;
    setError(null);
    setMessage(null);

    if (!nuevaFechaProgramada || !motivoReprog.trim()) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      await reprogramarVisita(selectedVisita.id, nuevaFechaProgramada, motivoReprog);
      setMessage("Visita reprogramada exitosamente");
      setShowReprogramarModal(false);
      setSelectedVisita(null);
      setNuevaFechaProgramada("");
      setMotivoReprog("");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al reprogramar visita");
    }
  }

  // Cálculos automáticos de visitas propuestas
  useEffect(() => {
    if (!autoNinoId) {
      setAutoVisitas([]);
      return;
    }
    const nino = ninos.find((n) => n.id === autoNinoId);
    if (!nino) return;

    const ageMonths = getAgeInMonthsNum(nino.fechaNac);
    const actorId = nino.asignaciones && nino.asignaciones.length > 0 ? nino.asignaciones[0].actorSocialId : "";
    const start = new Date(autoStartDate);
    const proposed = [];

    const visitsCount = ageMonths < 12 ? (12 - ageMonths) : 3;
    for (let i = 1; i <= visitsCount; i++) {
      const vAge = ageMonths + i;
      const vDate = new Date(start);
      vDate.setDate(start.getDate() + (i * 30));
      proposed.push({
        label: ageMonths < 12 ? `Mes ${vAge} (${vAge} meses)` : `Seguimiento Extra +${i}`,
        fechaProgramada: vDate.toISOString().split("T")[0],
        actorSocialId: actorId,
      });
    }
    setAutoVisitas(proposed);
  }, [autoNinoId, autoStartDate, ninos]);

  async function handleAutoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const validVisitas = autoVisitas.filter(v => v.fechaProgramada && v.actorSocialId);
    if (validVisitas.length === 0) {
      setError("Debe configurar al menos una visita válida");
      return;
    }

    try {
      await programarVisitasBulk({
        visitas: validVisitas.map(v => ({
          ninoId: autoNinoId,
          actorSocialId: v.actorSocialId,
          fechaProgramada: v.fechaProgramada,
        }))
      });
      setMessage("Cronograma de visitas programado exitosamente");
      setShowAutoModal(false);
      setAutoNinoId("");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al programar cronograma de visitas");
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const selectedNinoIds = Object.keys(bulkSelectedNinoIds).filter((id) => bulkSelectedNinoIds[id]);
    if (selectedNinoIds.length === 0) {
      setError("Debe seleccionar al menos un niño");
      return;
    }
    if (!bulkDate) {
      setError("Debe seleccionar una fecha de visita");
      return;
    }

    const payload: any[] = [];
    let unassignedNames: string[] = [];

    selectedNinoIds.forEach((id) => {
      const nino = ninos.find((n) => n.id === id);
      if (nino) {
        const actorId = nino.asignaciones && nino.asignaciones.length > 0
          ? nino.asignaciones[0].actorSocialId
          : null;
        if (actorId) {
          payload.push({
            ninoId: nino.id,
            actorSocialId: actorId,
            fechaProgramada: bulkDate,
          });
        } else {
          unassignedNames.push(`${nino.apellidos}, ${nino.nombres}`);
        }
      }
    });

    if (unassignedNames.length > 0) {
      setError(`No se puede programar en lote: Los siguientes niños no tienen actor social asignado: ${unassignedNames.join(", ")}`);
      return;
    }

    try {
      await programarVisitasBulk({ visitas: payload });
      setMessage("Visitas programadas masivamente de forma correcta");
      setShowBulkModal(false);
      setBulkSelectedNinoIds({});
      setBulkDate("");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error en la programación en lote");
    }
  }

  // Filtrado local
  const filtered = records.filter((r) => {
    const ninoFullName = `${r.nino?.apellidos || ""} ${r.nino?.nombres || ""}`.toLowerCase();
    const actorFullName = `${r.actorSocial?.apellidos || ""} ${r.actorSocial?.nombres || ""}`.toLowerCase();
    const matchSearch =
      ninoFullName.includes(search.toLowerCase()) ||
      (r.nino?.dni && r.nino.dni.includes(search)) ||
      (r.nino?.cnv && r.nino.cnv.includes(search)) ||
      actorFullName.includes(search.toLowerCase());

    const matchActor = filterActor === "TODOS" || r.actorSocialId === filterActor;
    const matchEstado = filterEstado === "TODOS" || r.estado === filterEstado;

    return matchSearch && matchActor && matchEstado;
  });

  // Métricas del Dashboard
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = filtered.length;
    const ejecutadas = filtered.filter((v) => v.estado === "EJECUTADA").length;
    const inconclusas = filtered.filter((v) => v.estado === "INCONCLUSA").length;
    const programadas = filtered.filter((v) => v.estado === "PROGRAMADA" || v.estado === "REPROGRAMADA").length;
    
    const vencidas = filtered.filter((v) => {
      return (
        (v.estado === "PROGRAMADA" || v.estado === "REPROGRAMADA") &&
        new Date(v.fechaProgramada) < today
      );
    }).length;

    const complianceRate = total > 0 
      ? Math.round((ejecutadas / (ejecutadas + inconclusas + vencidas || 1)) * 100) 
      : 0;

    return {
      total,
      ejecutadas,
      inconclusas,
      programadas,
      vencidas,
      complianceRate,
    };
  }, [filtered]);

  // Cálculos para vista Calendario
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return (day + 6) % 7;
  };

  const numDays = daysInMonth(calendarDate);
  const startOffset = firstDayOfMonth(calendarDate);

  const prevMonthDate = new Date(year, month - 1, 1);
  const numDaysPrevMonth = daysInMonth(prevMonthDate);

  const cells = [];

  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      day: numDaysPrevMonth - i,
      isCurrentMonth: false,
      date: new Date(year, month - 1, numDaysPrevMonth - i),
    });
  }

  for (let i = 1; i <= numDays; i++) {
    cells.push({
      day: i,
      isCurrentMonth: true,
      date: new Date(year, month, i),
    });
  }

  const totalCells = Math.ceil(cells.length / 7) * 7;
  const nextMonthPadding = totalCells - cells.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    cells.push({
      day: i,
      isCurrentMonth: false,
      date: new Date(year, month + 1, i),
    });
  }

  const getVisitasForDate = (cellDate: Date) => {
    const dStr = cellDate.toISOString().split("T")[0];
    return filtered.filter(v => new Date(v.fechaProgramada).toISOString().split("T")[0] === dStr);
  };

  const filteredChildrenForBulk = ninos.filter(n => !bulkSectorId || n.sectorId === bulkSectorId);

  const filteredNinos = useMemo(() => {
    return ninos.filter((n) => {
      const ninoFullName = `${n.apellidos || ""} ${n.nombres || ""}`.toLowerCase();
      const matchSearch =
        !search ||
        ninoFullName.includes(search.toLowerCase()) ||
        (n.dni && n.dni.includes(search)) ||
        (n.cnv && n.cnv.includes(search));
      
      const actorId = n.asignaciones && n.asignaciones[0]?.actorSocialId;
      const matchActor = filterActor === "TODOS" || actorId === filterActor;

      return matchSearch && matchActor;
    });
  }, [ninos, search, filterActor]);

  const getNinoVisitasSummary = (ninoId: string) => {
    const ninoVisitas = records.filter(v => v.ninoId === ninoId);
    const prog = ninoVisitas.filter(v => v.estado === "PROGRAMADA" || v.estado === "REPROGRAMADA").length;
    const ejec = ninoVisitas.filter(v => v.estado === "EJECUTADA").length;
    const inc = ninoVisitas.filter(v => v.estado === "INCONCLUSA").length;
    return { prog, ejec, inc, total: ninoVisitas.length };
  };

  const sortedNinos = useMemo(() => {
    const list = [...filteredNinos];
    if (sortField === "NONE") return list;

    list.sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortField === "NAME") {
        valA = `${a.apellidos || ""} ${a.nombres || ""}`.toLowerCase();
        valB = `${b.apellidos || ""} ${b.nombres || ""}`.toLowerCase();
      } else if (sortField === "SECTOR") {
        valA = (a.sector?.nombreSector || "").toLowerCase();
        valB = (b.sector?.nombreSector || "").toLowerCase();
      } else if (sortField === "ACTOR") {
        const actorA = a.asignaciones && a.asignaciones[0]?.actorSocial;
        const actorB = b.asignaciones && b.asignaciones[0]?.actorSocial;
        valA = actorA ? `${actorA.apellidos}, ${actorA.nombres}`.toLowerCase() : "";
        valB = actorB ? `${actorB.apellidos}, ${actorB.nombres}`.toLowerCase() : "";
      } else if (sortField === "VISITAS") {
        const summaryA = getNinoVisitasSummary(a.id).total;
        const summaryB = getNinoVisitasSummary(b.id).total;
        return sortOrder === "ASC" ? summaryA - summaryB : summaryB - summaryA;
      }

      if (valA < valB) return sortOrder === "ASC" ? -1 : 1;
      if (valA > valB) return sortOrder === "ASC" ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredNinos, sortField, sortOrder, records]);

  const groupedNinos = useMemo(() => {
    if (groupBy === "NONE") return null;

    const groups: Record<string, NinoRecord[]> = {};

    sortedNinos.forEach((n) => {
      let key = "Sin Asignar";
      if (groupBy === "ACTOR") {
        const actor = n.asignaciones && n.asignaciones[0]?.actorSocial;
        key = actor ? `${actor.apellidos}, ${actor.nombres}` : "Sin Actor Social Asignado";
      } else if (groupBy === "SECTOR") {
        key = n.sector?.nombreSector || "Sin Sector";
      } else if (groupBy === "CENTRO_POBLADO") {
        key = n.sector?.centroPoblado?.nombre || "Sin Centro Poblado";
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });

    return groups;
  }, [sortedNinos, groupBy]);

  const expandAllGroups = () => {
    if (!groupedNinos) return;
    const expanded: Record<string, boolean> = {};
    Object.keys(groupedNinos).forEach((key) => {
      expanded[key] = false;
    });
    setCollapsedGroups(expanded);
  };

  const collapseAllGroups = () => {
    if (!groupedNinos) return;
    const collapsed: Record<string, boolean> = {};
    Object.keys(groupedNinos).forEach((key) => {
      collapsed[key] = true;
    });
    setCollapsedGroups(collapsed);
  };

  useEffect(() => {
    if (groupBy !== "NONE" && groupedNinos) {
      const initialCollapsed: Record<string, boolean> = {};
      Object.keys(groupedNinos).forEach((key) => {
        initialCollapsed[key] = true;
      });
      setCollapsedGroups(initialCollapsed);
    }
  }, [groupBy]);

  const handleSort = (field: "NAME" | "SECTOR" | "ACTOR" | "VISITAS") => {
    if (sortField === field) {
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else {
        setSortField("NONE");
      }
    } else {
      setSortField(field);
      setSortOrder("ASC");
    }
  };

  const renderSortIcon = (field: "NAME" | "SECTOR" | "ACTOR" | "VISITAS") => {
    if (sortField !== field) {
      return <LuArrowUpDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", opacity: 0.4 }} />;
    }
    return sortOrder === "ASC" ? (
      <LuArrowUp size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    ) : (
      <LuArrowDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    );
  };

  const selectedNino = ninos.find(n => n.id === selectedNinoId);
  const selectedNinoVisitas = records.filter(v => v.ninoId === selectedNinoId);

  return (
    <div className="admin-page-container">
      {selectedNinoId && selectedNino ? (
        <>
          {/* Breadcrumbs & Header */}
          <section className="admin-page-heading" style={{ gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Panel de Visitas &gt; Digita las visitas o seguimiento telefónico y revisa que se estén realizando según programación
              </div>
              <h1 style={{ fontSize: "1.5rem", margin: "0.25rem 0 0 0" }}>
                {selectedNino.apellidos.toUpperCase()}, {selectedNino.nombres.toUpperCase()}
              </h1>
            </div>
            <button
              className="admin-button is-ghost"
              onClick={() => setSelectedNinoId(null)}
              type="button"
            >
              Volver al listado
            </button>
          </section>

          {/* Dos columnas superiores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }} className="child-detail-grid">
            {/* Columna Izquierda: Datos del Niño */}
            <div className="admin-content-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "0.5rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "1.1rem" }}>
                Datos del Niño
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                <div><strong>Nombre completo:</strong> {selectedNino.apellidos}, {selectedNino.nombres}</div>
                <div><strong>DNI:</strong> {selectedNino.dni || selectedNino.cnv || "Sin documento"}</div>
                <div><strong>Fecha Nacimiento:</strong> {new Date(selectedNino.fechaNac).toLocaleDateString()}</div>
                <div><strong>Edad:</strong> {getAgeInMonthsAndDays(selectedNino.fechaNac)}</div>
                
                <div style={{ borderTop: "1px solid #eee", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                  <strong>Madre / Responsable:</strong>
                  <div>{selectedNino.responsable?.apellidos || ""}, {selectedNino.responsable?.nombres || "No especificada"}</div>
                  {selectedNino.responsable?.dni && <div>DNI: {selectedNino.responsable.dni}</div>}
                </div>

                <div>
                  <strong>Contacto:</strong>
                  <div>Celular: {selectedNino.responsable?.celular || "No especificado"}</div>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Dirección referencial y Asignación */}
            <div className="admin-content-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "0.5rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "1.1rem" }}>
                Datos referenciales de la dirección
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.95rem" }}>
                <div><strong>Dirección en Padrón:</strong> {selectedNino.direccion || "No especificada"}</div>
                <div><strong>Centro Poblado:</strong> {selectedNino.sector?.centroPoblado?.nombre || "No especificado"}</div>
                <div><strong>Sector:</strong> {selectedNino.sector?.nombreSector || "Sin sector"}</div>
                
                <div style={{ borderTop: "1px solid #eee", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                  <strong>Asignación Territorial:</strong>
                  <div>
                    Actor Social: {selectedNino.asignaciones && selectedNino.asignaciones[0]
                      ? `${selectedNino.asignaciones[0].actorSocial.apellidos}, ${selectedNino.asignaciones[0].actorSocial.nombres}`
                      : "⚠️ Sin actor social asignado"}
                  </div>
                </div>

                <div>
                  <strong>Referencia de Dirección:</strong>
                  <div>{selectedNino.referencia || "Sin referencias adicionales"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sección: Intervenciones (Visitas del Niño) */}
          <section className="admin-content-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ borderBottom: "2px solid var(--primary)", paddingBottom: "0.5rem", marginBottom: "1rem", color: "var(--primary)", fontSize: "1.1rem" }}>
              Intervenciones (Visitas Domiciliarias)
            </h3>
            
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Actor Social</th>
                    <th>Fecha Programada</th>
                    <th>Estado</th>
                    <th>Detalles de Ejecución</th>
                    <th style={{ width: "180px", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedNinoVisitas.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-empty-cell">
                        No hay visitas programadas para este niño.
                      </td>
                    </tr>
                  ) : (
                    selectedNinoVisitas.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.actorSocial ? `${v.actorSocial.apellidos}, ${v.actorSocial.nombres}` : "Sin actor"}
                        </td>
                        <td>{new Date(v.fechaProgramada).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${
                            v.estado === "EJECUTADA"
                              ? "badge-success"
                              : v.estado === "PROGRAMADA"
                              ? "badge-info"
                              : v.estado === "INCONCLUSA"
                              ? "badge-error"
                              : "badge-warning"
                          }`}>
                            {v.estado}
                          </span>
                        </td>
                        <td>
                          {v.estado === "EJECUTADA" ? (
                            <div style={{ fontSize: "0.85rem" }}>
                              <div><strong>Tipo:</strong> {v.tipoRegistro || "Presencial"}</div>
                              <div><strong>Peso:</strong> {v.peso ? `${v.peso} Kg` : "-"}</div>
                              {v.evidenciaUrl && <div style={{ color: "var(--primary)" }}>✓ Tiene evidencia adjunta</div>}
                            </div>
                          ) : v.estado === "INCONCLUSA" || v.estado === "REPROGRAMADA" ? (
                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              Motivo: {v.motivoInconclusa}
                            </div>
                          ) : "-"}
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              className="admin-icon-button"
                              onClick={() => openEjecutarModal(v)}
                              title="Ver detalles / Registrar"
                              style={{ color: "var(--primary)" }}
                              type="button"
                            >
                              <LuSearch size={16} />
                            </button>
                            
                            {(v.estado === "PROGRAMADA" || v.estado === "REPROGRAMADA") && (
                              <>
                                <button
                                  className="admin-icon-button"
                                  onClick={() => {
                                    setSelectedVisita(v);
                                    setShowInconclusaModal(true);
                                  }}
                                  title="Marcar Inconclusa"
                                  style={{ color: "var(--color-error)" }}
                                  type="button"
                                >
                                  <LuCircleX size={16} />
                                </button>
                                <button
                                  className="admin-icon-button"
                                  onClick={() => {
                                    setSelectedVisita(v);
                                    setNuevaFechaProgramada("");
                                    setMotivoReprog("");
                                    setShowReprogramarModal(true);
                                  }}
                                  title="Reprogramar Visita"
                                  type="button"
                                >
                                  <LuCalendar size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
      <section className="admin-page-heading" style={{ gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1>Seguimiento de Visitas Domiciliarias</h1>
          <p className="admin-subtitle">
            Programa, registra la ejecución o reprograma las visitas domiciliarias de control
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            className={`admin-button ${viewMode === "TABLE" ? "is-primary" : "is-ghost"}`}
            onClick={() => setViewMode("TABLE")}
            type="button"
          >
            <LuList size={18} style={{ marginRight: "0.5rem" }} />
            Tabla
          </button>
          <button
            className={`admin-button ${viewMode === "CALENDAR" ? "is-primary" : "is-ghost"}`}
            onClick={() => setViewMode("CALENDAR")}
            type="button"
          >
            <LuCalendar size={18} style={{ marginRight: "0.5rem" }} />
            Calendario
          </button>

          {user?.rol === "ADMIN_MUNICIPAL" && (
            <>
              <button
                className="admin-button is-primary"
                onClick={() => {
                  setProgramarForm(INITIAL_PROGRAMAR_FORM);
                  setShowProgramarModal(true);
                }}
                type="button"
              >
                <LuPlus size={18} style={{ marginRight: "0.5rem" }} />
                Programar Visita
              </button>
              <button
                className="admin-button"
                style={{ background: "#4285f4", color: "white", borderColor: "#4285f4" }}
                onClick={() => {
                  setAutoNinoId("");
                  setAutoStartDate(tomorrowStr);
                  setAutoVisitas([]);
                  setShowAutoModal(true);
                }}
                type="button"
              >
                <LuCalendar size={18} style={{ marginRight: "0.5rem" }} />
                Auto Cronograma
              </button>
              <button
                className="admin-button"
                style={{ background: "#34a853", color: "white", borderColor: "#34a853" }}
                onClick={() => {
                  setBulkSectorId("");
                  setBulkSelectedNinoIds({});
                  setBulkDate("");
                  setShowBulkModal(true);
                }}
                type="button"
              >
                <LuPlus size={18} style={{ marginRight: "0.5rem" }} />
                Programar en Lote
              </button>
            </>
          )}
        </div>
      </section>

      <section className="admin-content-card">
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Dashboard de Métricas */}
        <div className="admin-metrics-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="metric-card" style={{ background: "white", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ background: "#e8f0fe", color: "var(--primary)", padding: "0.75rem", borderRadius: "50%", display: "flex" }}>
              <LuCalendar size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Programadas</span>
              <strong style={{ fontSize: "1.3rem" }}>{metrics.programadas}</strong>
            </div>
          </div>

          <div className="metric-card" style={{ background: "white", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ background: "#e6f4ea", color: "var(--success)", padding: "0.75rem", borderRadius: "50%", display: "flex" }}>
              <LuCircleCheck size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Ejecutadas</span>
              <strong style={{ fontSize: "1.3rem" }}>{metrics.ejecutadas}</strong>
            </div>
          </div>

          <div className="metric-card" style={{ background: "white", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ background: "#fce8e6", color: "var(--error, #ea4335)", padding: "0.75rem", borderRadius: "50%", display: "flex" }}>
              <LuCircleX size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Inconclusas</span>
              <strong style={{ fontSize: "1.3rem" }}>{metrics.inconclusas}</strong>
            </div>
          </div>

          <div className="metric-card" style={{ background: "white", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ background: "#fef7e0", color: "#f9ab00", padding: "0.75rem", borderRadius: "50%", display: "flex" }}>
              <LuTriangleAlert size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Vencidas</span>
              <strong style={{ fontSize: "1.3rem", color: metrics.vencidas > 0 ? "var(--error, #ea4335)" : "inherit" }}>{metrics.vencidas}</strong>
            </div>
          </div>

          <div className="metric-card" style={{ background: "white", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ background: "#e8f0fe", color: "var(--primary)", padding: "0.75rem", borderRadius: "50%", display: "flex" }}>
              <LuClock size={20} />
            </div>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Cumplimiento</span>
              <strong style={{ fontSize: "1.3rem" }}>{metrics.complianceRate}%</strong>
            </div>
          </div>
        </div>

        {/* Panel de Filtros */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div className="admin-filters-grid">
            <div className="field">
              <span>Buscar Niño / Actor Social / DNI</span>
              <div className="admin-search-field" style={{ border: "1px solid var(--border)", background: "white" }}>
                <LuSearch style={{ marginRight: "0.5rem" }} />
                <input
                  type="text"
                  placeholder="Escribe nombres, apellidos o documento..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {user?.rol === "ADMIN_GENERAL" && (
              <AutocompleteSearch
                label="Municipalidad"
                placeholder="Todas las municipalidades..."
                value={filterMuni || "TODAS_MUNIS"}
                displayValue={filterMuni ? (munis.find((m) => m.id === filterMuni)?.nombre || "") : "Todas las municipalidades..."}
                options={[
                  { id: "TODAS_MUNIS", name: "Todas las municipalidades...", subtext: "Mostrar visitas de todas las municipalidades" },
                  ...munis.map((m) => ({ id: m.id, name: m.nombre, subtext: `${m.departamento} > ${m.provincia} > ${m.distrito}` })),
                ]}
                onChange={(id: string) => setFilterMuni(id === "TODAS_MUNIS" ? "" : id)}
                onSearchMore={() => openSearchModal("municipalidad")}
              />
            )}

            {user?.rol !== "ACTOR_SOCIAL" && (
              <AutocompleteSearch
                label="Actor Social"
                placeholder="Todos los actores sociales"
                value={filterActor}
                displayValue={filterActor === "TODOS" ? "Todos los actores sociales" : (() => {
                  const act = actores.find((a) => a.id === filterActor);
                  return act ? `${act.apellidos}, ${act.nombres}` : "Todos los actores sociales";
                })()}
                options={[
                  { id: "TODOS", name: "Todos los actores sociales", subtext: "Mostrar visitas de todos los actores sociales" },
                  ...actores.map((a) => ({ id: a.id, name: `${a.apellidos}, ${a.nombres}`, subtext: `DNI: ${a.dni}` })),
                ]}
                onChange={(id: string) => setFilterActor(id)}
                onSearchMore={() => openSearchModal("actor")}
              />
            )}

            <div className="field">
              <span>Estado de Visita</span>
              <select className="admin-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
                <option value="TODOS">Todos los estados</option>
                <option value="PROGRAMADA">PROGRAMADA</option>
                <option value="EJECUTADA">EJECUTADA</option>
                <option value="REPROGRAMADA">REPROGRAMADA</option>
                <option value="INCONCLUSA">INCONCLUSA</option>
              </select>
            </div>

            <div className="field">
              <span>Agrupar Niños por</span>
              <select
                className="admin-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as any)}
              >
                <option value="NONE">Sin agrupamiento</option>
                <option value="ACTOR">Actor Social</option>
                <option value="SECTOR">Sector</option>
                <option value="CENTRO_POBLADO">Centro Poblado</option>
              </select>
              {groupBy !== "NONE" && (
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                  <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={expandAllGroups}>
                    Expandir todos
                  </button>
                  <span style={{ color: "#ccc" }}>|</span>
                  <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={collapseAllGroups}>
                    Colapsar todos
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabla de Resultados / Calendario */}
        {viewMode === "CALENDAR" ? (
          <div className="calendar-container" style={{ background: "white", padding: "1.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            {/* Header del Calendario */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: "bold", color: "var(--text)" }}>
                {calendarDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).toUpperCase()}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  className="admin-button is-ghost"
                  onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                  type="button"
                  style={{ padding: "0.4rem 0.6rem", height: "auto" }}
                >
                  <LuChevronLeft size={20} />
                </button>
                <button
                  className="admin-button is-ghost"
                  onClick={() => setCalendarDate(new Date())}
                  type="button"
                  style={{ padding: "0.4rem 0.8rem", height: "auto", fontSize: "0.85rem" }}
                >
                  Hoy
                </button>
                <button
                  className="admin-button is-ghost"
                  onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                  type="button"
                  style={{ padding: "0.4rem 0.6rem", height: "auto" }}
                >
                  <LuChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Grid de días de la semana */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", fontWeight: "bold", borderBottom: "1px solid var(--border)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            {/* Grid de días */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "minmax(120px, auto)", gap: "1px", background: "var(--border)", border: "1px solid var(--border)" }}>
              {cells.map((cell, idx) => {
                const cellVisitas = getVisitasForDate(cell.date);
                const isToday = new Date().toDateString() === cell.date.toDateString();

                return (
                  <div
                    key={idx}
                    style={{
                      background: cell.isCurrentMonth ? "white" : "#f8f9fa",
                      padding: "0.5rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.25rem",
                      color: cell.isCurrentMonth ? "var(--text)" : "var(--text-muted)",
                      cursor: user?.rol === "ADMIN_MUNICIPAL" ? "pointer" : "default",
                      border: isToday ? "2px solid var(--primary, #0d6efd)" : "none",
                      minHeight: "120px",
                    }}
                    onClick={(e) => {
                      if (e.target === e.currentTarget && user?.rol === "ADMIN_MUNICIPAL") {
                        setProgramarForm({
                          ...INITIAL_PROGRAMAR_FORM,
                          fechaProgramada: cell.date.toISOString().split("T")[0],
                        });
                        setShowProgramarModal(true);
                      }
                    }}
                  >
                    <div style={{ fontWeight: isToday ? "bold" : "normal", fontSize: "0.9rem", alignSelf: "flex-end", color: isToday ? "var(--primary)" : "inherit" }}>
                      {cell.day}
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", flex: 1, maxHeight: "90px" }}>
                      {cellVisitas.map((v) => {
                        let color = "var(--primary)";
                        let prefix = "[P]";
                        if (v.estado === "EJECUTADA") {
                          color = "var(--success)";
                          prefix = "[E]";
                        } else if (v.estado === "INCONCLUSA") {
                          color = "var(--color-error, #dc3545)";
                          prefix = "[I]";
                        } else if (v.estado === "REPROGRAMADA") {
                          color = "#ffc107";
                          prefix = "[R]";
                        }

                        return (
                          <div
                            key={v.id}
                            style={{
                              background: color,
                              color: v.estado === "REPROGRAMADA" ? "black" : "white",
                              padding: "2px 4px",
                              borderRadius: "3px",
                              fontSize: "0.72rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}
                            title={`${v.estado}: ${v.nino?.apellidos}, ${v.nino?.nombres}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVisita(v);
                              if (v.estado === "PROGRAMADA" || v.estado === "REPROGRAMADA") {
                                setShowEjecutarModal(true);
                              } else {
                                alert(`Detalles de Visita (${v.estado}):\nNiño: ${v.nino?.apellidos}, ${v.nino?.nombres}\nActor: ${v.actorSocial?.apellidos}, ${v.actorSocial?.nombres}\nFecha Prog.: ${new Date(v.fechaProgramada).toLocaleDateString()}\nFecha Ejec.: ${v.fechaEjecucion ? new Date(v.fechaEjecucion).toLocaleDateString() : "-"}\nPeso: ${v.peso ? `${v.peso} Kg` : "-"}\nHierro/Consejería: ${v.hierroEntregado ? "Sí" : "No"} / ${v.consejeriaBrindada ? "Sí" : "No"}\nMotivo/Comentarios: ${v.motivoInconclusa || v.comentarios || "-"}`);
                              }
                            }}
                          >
                            {prefix} {v.nino?.nombres}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("NAME")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Niño / DNI {renderSortIcon("NAME")}
                    </th>
                    <th onClick={() => handleSort("SECTOR")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Sector / Dirección {renderSortIcon("SECTOR")}
                    </th>
                    <th onClick={() => handleSort("ACTOR")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Actor Social Asignado {renderSortIcon("ACTOR")}
                    </th>
                    <th onClick={() => handleSort("VISITAS")} style={{ cursor: "pointer", userSelect: "none" }}>
                      Visitas {renderSortIcon("VISITAS")}
                    </th>
                    <th style={{ width: "160px", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "2rem" }}>
                        Cargando niños...
                      </td>
                    </tr>
                  ) : sortedNinos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-empty-cell">
                        No se encontraron niños.
                      </td>
                    </tr>
                  ) : groupBy !== "NONE" && groupedNinos ? (
                    Object.entries(groupedNinos).map(([groupName, groupChildren]) => {
                      const isCollapsed = !!collapsedGroups[groupName];
                      return (
                        <Fragment key={groupName}>
                          {/* Fila de encabezado de grupo */}
                          <tr 
                            style={{ background: "#f8f9fa", cursor: "pointer", userSelect: "none" }}
                            onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupName]: !isCollapsed }))}
                          >
                            <td colSpan={5} style={{ fontWeight: "bold", padding: "0.75rem 1rem", fontSize: "0.95rem", borderBottom: "1px solid var(--border)", borderTop: "1px solid var(--border)" }}>
                              <span style={{ marginRight: "0.5rem", color: "var(--primary)" }}>
                                {isCollapsed ? "▶" : "▼"}
                              </span>
                              {groupBy === "ACTOR" && `Actor Social: ${groupName}`}
                              {groupBy === "SECTOR" && `Sector: ${groupName}`}
                              {groupBy === "CENTRO_POBLADO" && `Centro Poblado: ${groupName}`}
                              <span style={{ fontWeight: "normal", color: "var(--text-muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                                ({groupChildren.length} niños)
                              </span>
                            </td>
                          </tr>
                          
                          {/* Filas de niños del grupo (si no está colapsado) */}
                          {!isCollapsed && groupChildren.map((n) => {
                            const summary = getNinoVisitasSummary(n.id);
                            const actorName = n.asignaciones && n.asignaciones[0]
                              ? `${n.asignaciones[0].actorSocial.apellidos}, ${n.asignaciones[0].actorSocial.nombres}`
                              : "Sin asignar";
                            return (
                              <tr key={n.id}>
                                <td>
                                  <div style={{ paddingLeft: "1rem" }}>
                                    <strong>{n.apellidos}, {n.nombres}</strong>
                                  </div>
                                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", paddingLeft: "1rem" }}>
                                    DNI/CNV: {n.dni || n.cnv}
                                  </div>
                                </td>
                                <td>
                                  <div>{n.sector?.nombreSector || "Sin sector"}</div>
                                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                    {n.direccion || "-"}
                                  </div>
                                </td>
                                <td>{actorName}</td>
                                <td>
                                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                    <span className="badge badge-info" title="Programadas">{summary.prog} Prog</span>
                                    <span className="badge badge-success" title="Ejecutadas">{summary.ejec} Ejec</span>
                                    {summary.inc > 0 && (
                                      <span className="badge badge-error" title="Inconclusas">{summary.inc} Inc</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <button
                                    className="admin-button is-ghost"
                                    style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", height: "auto" }}
                                    onClick={() => setSelectedNinoId(n.id)}
                                    type="button"
                                  >
                                    Ver Seguimiento
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  ) : (
                    sortedNinos.map((n) => {
                      const summary = getNinoVisitasSummary(n.id);
                      const actorName = n.asignaciones && n.asignaciones[0]
                        ? `${n.asignaciones[0].actorSocial.apellidos}, ${n.asignaciones[0].actorSocial.nombres}`
                        : "Sin asignar";
                      return (
                        <tr key={n.id}>
                          <td>
                            <div>
                              <strong>{n.apellidos}, {n.nombres}</strong>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              DNI/CNV: {n.dni || n.cnv}
                            </div>
                          </td>
                          <td>
                            <div>{n.sector?.nombreSector || "Sin sector"}</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                              {n.direccion || "-"}
                            </div>
                          </td>
                          <td>{actorName}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                              <span className="badge badge-info" title="Programadas">{summary.prog} Prog</span>
                              <span className="badge badge-success" title="Ejecutadas">{summary.ejec} Ejec</span>
                              {summary.inc > 0 && (
                                <span className="badge badge-error" title="Inconclusas">{summary.inc} Inc</span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="admin-button is-ghost"
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", height: "auto" }}
                              onClick={() => setSelectedNinoId(n.id)}
                              type="button"
                            >
                              Ver Seguimiento
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      </>)}

      {/* Modal de Programar Visita */}
      {showProgramarModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleProgramarSubmit} style={{ maxWidth: "600px" }}>
            <div className="admin-modal-header">
              <h2>Programar Visita Domiciliaria</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowProgramarModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              <label className="field">
                <span>Niño a visitar *</span>
                <select
                  required
                  value={programarForm.ninoId}
                  onChange={(e) => handleNinoChange(e.target.value)}
                >
                  <option value="">Seleccione niño...</option>
                  {ninos.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.apellidos}, {n.nombres} ({n.dni || n.cnv})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Actor Social Encargado *</span>
                <select
                  required
                  value={programarForm.actorSocialId}
                  onChange={(e) =>
                    setProgramarForm((prev) => ({ ...prev, actorSocialId: e.target.value }))
                  }
                >
                  <option value="">Seleccione actor social...</option>
                  {actores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.apellidos}, {a.nombres} ({a.dni})
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Fecha Programada *</span>
                <input
                  required
                  type="date"
                  min={tomorrowStr}
                  value={programarForm.fechaProgramada}
                  onChange={(e) =>
                    setProgramarForm((prev) => ({ ...prev, fechaProgramada: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setShowProgramarModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit">
                Programar Visita
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Registro de Ejecución / Abrir: Intervención */}
      {showEjecutarModal && selectedVisita && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 9999 }}>
          <form className="admin-modal" onSubmit={handleEjecutarSubmit} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Detalles de Intervención: Visita Domiciliaria</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowEjecutarModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              {/* DATOS DEL ACTOR / PACIENTE */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", background: "#f8f9fa", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "1rem" }}>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)", fontSize: "0.9rem", textTransform: "uppercase" }}>Datos del Actor</h4>
                  <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div><strong>Actor Social:</strong> {selectedVisita.actorSocial ? `[${selectedVisita.actorSocial.dni}] ${selectedVisita.actorSocial.apellidos}, ${selectedVisita.actorSocial.nombres}` : "-"}</div>
                    <div><strong>EE.SS:</strong> Centro de Salud local / Pomahuaca</div>
                    <div><strong>Tipo Actor Social:</strong> Agente Comunitario de Salud</div>
                  </div>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 0.5rem 0", color: "var(--primary)", fontSize: "0.9rem", textTransform: "uppercase" }}>Datos del Paciente</h4>
                  <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <div><strong>Paciente:</strong> {selectedVisita.nino ? `[${selectedVisita.nino.dni || selectedVisita.nino.cnv}] ${selectedVisita.nino.apellidos}, ${selectedVisita.nino.nombres}` : "-"}</div>
                    <div><strong>Fecha Nac.:</strong> {selectedVisita.nino ? new Date(selectedVisita.nino.fechaNac).toLocaleDateString() : "-"}</div>
                  </div>
                </div>
              </div>

              {/* REGISTRO DE INTERVENCIONES */}
              <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", margin: "1rem 0 0.5rem 0" }}>Registro de Intervención</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Tipo de Registro *</span>
                  <select
                    value={ejecutarForm.tipoRegistro}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, tipoRegistro: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                  >
                    <option value="Visita presencial">Visita presencial</option>
                    <option value="Seguimiento telefónico">Seguimiento telefónico</option>
                  </select>
                </label>

                <label className="field">
                  <span>Seleccionar la Etapa *</span>
                  <select
                    disabled={selectedVisita.estado === "EJECUTADA"}
                    defaultValue={selectedVisita.nino ? (getAgeInMonthsNum(selectedVisita.nino.fechaNac) < 6 ? "1" : "2") : "1"}
                  >
                    <option value="1">Visita Domiciliaria (1 a 5 meses)</option>
                    <option value="2">Visita Domiciliaria (6 a 12 meses)</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Fecha de Ejecución *</span>
                  <input
                    type="date"
                    required
                    max={todayStr}
                    value={ejecutarForm.fechaEjecucion}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, fechaEjecucion: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                  />
                </label>

                <label className="field">
                  <span>Estado</span>
                  <input
                    type="text"
                    disabled
                    value={selectedVisita.estado === "EJECUTADA" ? "Ejecutado" : "Pendiente de registro"}
                  />
                </label>

                <label className="field">
                  <span>Edad del Paciente</span>
                  <input
                    type="text"
                    disabled
                    value={selectedVisita.nino ? getAgeInMonthsAndDays(selectedVisita.nino.fechaNac) : ""}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Registro</span>
                  <input
                    type="text"
                    disabled
                    value="WEB"
                  />
                </label>

                <label className="field">
                  <span>Latitud de Visita</span>
                  <input
                    type="text"
                    placeholder="Ej. -6.790298"
                    value={ejecutarForm.latitud}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, latitud: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                  />
                </label>

                <label className="field">
                  <span>Longitud de Visita</span>
                  <input
                    type="text"
                    placeholder="Ej. -79.850438"
                    value={ejecutarForm.longitud}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, longitud: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Peso del Niño (Kg)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej. 7.5"
                    value={ejecutarForm.peso}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, peso: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                  />
                </label>
                
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "1.2rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={ejecutarForm.hierroEntregado}
                      onChange={(e) => setEjecutarForm(prev => ({ ...prev, hierroEntregado: e.target.checked }))}
                      disabled={selectedVisita.estado === "EJECUTADA"}
                    />
                    <span>¿Hierro Entregado?</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={ejecutarForm.consejeriaBrindada}
                      onChange={(e) => setEjecutarForm(prev => ({ ...prev, consejeriaBrindada: e.target.checked }))}
                      disabled={selectedVisita.estado === "EJECUTADA"}
                    />
                    <span>¿Consejería?</span>
                  </label>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Alertas Identificadas</span>
                  <textarea
                    rows={2}
                    value={ejecutarForm.alertas}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, alertas: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                    placeholder="Ninguna"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                  />
                </label>

                <label className="field">
                  <span>Comentarios Adicionales</span>
                  <textarea
                    rows={2}
                    value={ejecutarForm.comentarios}
                    onChange={(e) => setEjecutarForm(prev => ({ ...prev, comentarios: e.target.value }))}
                    disabled={selectedVisita.estado === "EJECUTADA"}
                    placeholder="Comentarios u observaciones"
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                  />
                </label>
              </div>

              {/* ARCHIVO / EVIDENCIA */}
              <div style={{ marginTop: "1rem", background: "#f1f3f4", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem" }}>Evidencia de la Intervención</h4>
                
                {selectedVisita.estado !== "EJECUTADA" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      style={{ fontSize: "0.85rem" }}
                    />
                    {ejecutarForm.evidenciaUrl && (
                      <div style={{ fontSize: "0.85rem", color: "var(--success)" }}>
                        ✓ Archivo cargado correctamente para guardar.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {selectedVisita.evidenciaUrl ? (
                      <div>
                        {selectedVisita.evidenciaUrl.startsWith("data:image/") ? (
                          <div style={{ marginTop: "0.5rem" }}>
                            <img
                              src={selectedVisita.evidenciaUrl}
                              alt="Evidencia"
                              style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                            />
                          </div>
                        ) : (
                          <a
                            href={selectedVisita.evidenciaUrl}
                            download="evidencia"
                            className="admin-button"
                            style={{ display: "inline-block", textDecoration: "none", fontSize: "0.85rem", padding: "0.25rem 0.5rem", height: "auto" }}
                          >
                            Descargar Evidencia Guardada
                          </a>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        No se cargó evidencia en esta visita.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setShowEjecutarModal(false)}
                type="button"
              >
                Descartar
              </button>
              {selectedVisita.estado !== "EJECUTADA" && (
                <button className="admin-button is-primary" type="submit">
                  Guardar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Modal de Inconclusa */}
      {showInconclusaModal && selectedVisita && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleInconclusaSubmit} style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h2>Registrar Visita Inconclusa</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowInconclusaModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Detalla por qué no se concretó la visita programada para{" "}
                <strong>
                  {selectedVisita.nino?.apellidos}, {selectedVisita.nino?.nombres}
                </strong>
                .
              </p>

              <label className="field">
                <span>Motivo Detallado *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. La madre no se encontraba en casa, dirección incorrecta, etc."
                  value={motivoInconclusa}
                  onChange={(e) => setMotivoInconclusa(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </label>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setShowInconclusaModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit" disabled={!motivoInconclusa.trim()}>
                Guardar Motivo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Reprogramación */}
      {showReprogramarModal && selectedVisita && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleReprogramarSubmit} style={{ maxWidth: "500px" }}>
            <div className="admin-modal-header">
              <h2>Reprogramar Visita Domiciliaria</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowReprogramarModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Reprogramar visita para{" "}
                <strong>
                  {selectedVisita.nino?.apellidos}, {selectedVisita.nino?.nombres}
                </strong>
                .
              </p>

              <label className="field">
                <span>Nueva Fecha Programada *</span>
                <input
                  required
                  type="date"
                  min={tomorrowStr}
                  value={nuevaFechaProgramada}
                  onChange={(e) => setNuevaFechaProgramada(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Motivo de la Reprogramación *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="Detalle por qué se está cambiando la fecha de la visita..."
                  value={motivoReprog}
                  onChange={(e) => setMotivoReprog(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </label>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-button is-ghost"
                onClick={() => setShowReprogramarModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit" disabled={!nuevaFechaProgramada || !motivoReprog.trim()}>
                Reprogramar Visita
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Auto Cronograma */}
      {showAutoModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 998 }}>
          <form className="admin-modal" onSubmit={handleAutoSubmit} style={{ maxWidth: "750px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Generar Cronograma Automático de Visitas</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowAutoModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="field">
                  <span>Niño a programar plan *</span>
                  <select
                    required
                    value={autoNinoId}
                    onChange={(e) => setAutoNinoId(e.target.value)}
                  >
                    <option value="">Seleccione niño...</option>
                    {ninos.map((n) => {
                      const age = getAgeInMonthsNum(n.fechaNac);
                      return (
                        <option key={n.id} value={n.id}>
                          {n.apellidos}, {n.nombres} ({age >= 0 ? `${age} meses` : "-"})
                        </option>
                      );
                    })}
                  </select>
                </label>

                <label className="field">
                  <span>Fecha de inicio del cronograma *</span>
                  <input
                    type="date"
                    required
                    min={tomorrowStr}
                    value={autoStartDate}
                    onChange={(e) => setAutoStartDate(e.target.value)}
                  />
                </label>
              </div>

              {autoVisitas.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Visitas Propuestas para Generación</h3>
                  <div className="admin-table-wrap" style={{ maxHeight: "250px", overflowY: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Visita</th>
                          <th>Fecha Propuesta *</th>
                          <th>Actor Social Responsable</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autoVisitas.map((v, idx) => (
                          <tr key={idx}>
                            <td>
                              <strong>{v.label}</strong>
                            </td>
                            <td>
                              <input
                                type="date"
                                required
                                min={tomorrowStr}
                                value={v.fechaProgramada}
                                onChange={(e) => {
                                  const updated = [...autoVisitas];
                                  updated[idx].fechaProgramada = e.target.value;
                                  setAutoVisitas(updated);
                                }}
                                style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", width: "150px" }}
                              />
                            </td>
                            <td>
                              <select
                                required
                                value={v.actorSocialId}
                                onChange={(e) => {
                                  const updated = [...autoVisitas];
                                  updated[idx].actorSocialId = e.target.value;
                                  setAutoVisitas(updated);
                                }}
                                style={{ padding: "0.25rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", width: "100%" }}
                              >
                                <option value="">Seleccione actor...</option>
                                {actores.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.apellidos}, {a.nombres}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="admin-form-actions" style={{ padding: "1rem 1.5rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setShowAutoModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className="admin-button is-primary" type="submit" disabled={!autoNinoId || autoVisitas.length === 0}>
                Confirmar y Generar Cronograma
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Programación en Lote */}
      {showBulkModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 998 }}>
          <form className="admin-modal" onSubmit={handleBulkSubmit} style={{ maxWidth: "750px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Programación Masiva en Lote</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowBulkModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="admin-modal-body form-stack">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                <label className="field">
                  <span>Filtrar por Sector Geográfico</span>
                  <select
                    value={bulkSectorId}
                    onChange={(e) => {
                      setBulkSectorId(e.target.value);
                      setBulkSelectedNinoIds({});
                    }}
                  >
                    <option value="">Todos los sectores...</option>
                    {sectores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombreSector} ({s.codigo})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Fecha de Visita Común *</span>
                  <input
                    type="date"
                    required
                    min={tomorrowStr}
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                  />
                </label>
              </div>

              <div>
                <span style={{ fontSize: "0.9rem", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
                  Seleccione Niños a Programar ({filteredChildrenForBulk.length} disponibles)
                </span>
                <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.5rem", background: "white" }}>
                  {filteredChildrenForBulk.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No hay niños disponibles para programar en este sector.
                    </div>
                  ) : (
                    filteredChildrenForBulk.map((n) => {
                      const actorName = n.asignaciones && n.asignaciones.length > 0
                        ? `${n.asignaciones[0].actorSocial.apellidos}, ${n.asignaciones[0].actorSocial.nombres}`
                        : null;
                      return (
                        <label
                          key={n.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "0.5rem",
                            borderBottom: "1px solid #f0f0f0",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!bulkSelectedNinoIds[n.id]}
                            onChange={(e) => {
                              setBulkSelectedNinoIds((prev) => ({
                                ...prev,
                                [n.id]: e.target.checked,
                              }));
                            }}
                            style={{ marginRight: "0.75rem", width: "1.1rem", height: "1.1rem" }}
                          />
                          <div style={{ flex: 1 }}>
                            <strong>{n.apellidos}, {n.nombres}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              DNI/CNV: {n.dni || n.cnv} | {actorName ? `Actor: ${actorName}` : "⚠️ Sin actor social asignado"}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="admin-form-actions" style={{ padding: "1rem 1.5rem" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setShowBulkModal(false)}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="admin-button is-primary"
                type="submit"
                disabled={!bulkDate || Object.values(bulkSelectedNinoIds).filter(Boolean).length === 0}
              >
                Programar Visitas en Lote ({Object.values(bulkSelectedNinoIds).filter(Boolean).length})
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
