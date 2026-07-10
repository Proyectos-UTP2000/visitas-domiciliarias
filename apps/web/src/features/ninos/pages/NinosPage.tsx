import { useState, useEffect, Fragment } from "react";
import { getStoredSession } from "../../auth/auth-storage";
import {
  listNinos,
  createNino,
  updateNino,
  setNinoActivo,
  archiveNino,
  unarchiveNino,
  asignarActorSocial,
  desasignarActorSocial,
  listHistorialAsignaciones,
} from "../ninos-api";
import type { NinoRecord, NinoFormState } from "../ninos-types";
import { listResponsables } from "../../responsables/responsables-api";
import type { ResponsableRecord } from "../../responsables/responsables-types";
import { listSectores } from "../../sectores/sectores-api";
import type { SectorRecord } from "../../sectores/sectores-types";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { listActores } from "../../actores-sociales/actores-sociales-api";
import {
  LuSearch,
  LuPlus,
  LuPencil,
  LuTrash2,
  LuCircleCheck,
  LuCircleX,
  LuUserPlus,
  LuEye,
  LuArchiveRestore,
  LuUserX,
  LuChevronDown,
  LuChevronRight,
} from "react-icons/lu";
import { consultarDni } from "../../dni/dni-api";

const INITIAL_FORM: NinoFormState = {
  municipalidadId: "",
  responsableId: "",
  sectorId: "",
  dni: "",
  cnv: "",
  nombres: "",
  apellidos: "",
  sexo: "MASCULINO",
  fechaNac: "",
  direccion: "",
  referencia: "",
  latitud: null,
  longitud: null,
};

export default function NinosPage() {
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<NinoRecord[]>([]);
  const [responsables, setResponsables] = useState<ResponsableRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  const [munis, setMunis] = useState<MunicipalidadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMuni, setFilterMuni] = useState("");
  const [filterActivo, setFilterActivo] = useState("TODOS");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<NinoFormState>(INITIAL_FORM);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isSearchingDni, setIsSearchingDni] = useState(false);

  // Nuevos estados
  const [verArchivados, setVerArchivados] = useState(false);
  const [allActiveRecords, setAllActiveRecords] = useState<NinoRecord[]>([]);
  const [showUnassignedModal, setShowUnassignedModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailNino, setDetailNino] = useState<NinoRecord | null>(null);
  const [detailHistory, setDetailHistory] = useState<any[]>([]);
  const [groupBy, setGroupBy] = useState<"NONE" | "ACTOR_SOCIAL" | "SECTOR" | "PERIODO">("NONE");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  function getAgeInMonthsNum(fechaNacStr: string): number {
    const birth = new Date(fechaNacStr);
    if (isNaN(birth.getTime())) return -1;
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  async function handleOpenDetailModal(record: NinoRecord) {
    setDetailNino(record);
    setDetailHistory([]);
    setShowDetailModal(true);
    try {
      const history = await listHistorialAsignaciones(record.id);
      setDetailHistory(history);
    } catch (e) {
      console.error("Error al cargar historial de asignaciones", e);
    }
  }

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

  // Asignaciones
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningNino, setAssigningNino] = useState<NinoRecord | null>(null);
  const [selectedActorId, setSelectedActorId] = useState("");
  const [assignMotivo, setAssignMotivo] = useState("");
  const [assignHistory, setAssignHistory] = useState<any[]>([]);
  const [actoresSociales, setActoresSociales] = useState<any[]>([]);

  async function handleOpenAssignModal(record: NinoRecord) {
    setAssigningNino(record);
    setSelectedActorId("");
    setAssignMotivo("");
    setAssignHistory([]);
    setActoresSociales([]);
    setError(null);
    setMessage(null);

    const activeAsig = record.asignaciones && record.asignaciones[0];
    if (activeAsig) {
      setSelectedActorId(activeAsig.actorSocialId);
    }

    try {
      const actors = await listActores(record.municipalidadId);
      setActoresSociales(actors.filter((a) => a.activo));
      const history = await listHistorialAsignaciones(record.id);
      setAssignHistory(history);
    } catch (e: any) {
      setError(e.message || "Error al cargar datos de asignación");
    }
    setShowAssignModal(true);
  }

  async function handleSaveAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!assigningNino) return;
    setError(null);
    setMessage(null);

    if (!selectedActorId) {
      setError("Debe seleccionar un Actor Social");
      return;
    }
    if (!assignMotivo.trim()) {
      setError("Debe ingresar el motivo detallado");
      return;
    }

    try {
      await asignarActorSocial(assigningNino.id, selectedActorId, assignMotivo);
      setMessage("Asignación guardada correctamente");
      setShowAssignModal(false);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al guardar asignación");
    }
  }

  async function handleDesasignar() {
    if (!assigningNino) return;
    if (!confirm("¿Está seguro de remover la asignación de este niño?")) return;
    setError(null);
    setMessage(null);

    try {
      await desasignarActorSocial(assigningNino.id);
      setMessage("Se ha removido la asignación correctamente");
      setShowAssignModal(false);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al desasignar");
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
  }, [user, verArchivados]);

  // Cargar dependencias (responsables y sectores) cuando cambie la municipalidad seleccionada en el formulario
  useEffect(() => {
    const targetMuniId = form.municipalidadId || user?.municipalidadId;
    if (targetMuniId && showModal) {
      listResponsables(targetMuniId)
        .then((data) => setResponsables(data.filter((r) => r.activo)))
        .catch(console.error);

      listSectores(targetMuniId)
        .then((data) => setSectores(data.filter((s) => s.activo)))
        .catch(console.error);
    } else {
      setResponsables([]);
      setSectores([]);
    }
  }, [form.municipalidadId, showModal, user?.municipalidadId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const muniId = user?.rol === "ADMIN_MUNICIPAL" ? user.municipalidadId : null;
      if (verArchivados) {
        const [archivedData, activeData] = await Promise.all([
          listNinos(muniId, true),
          listNinos(muniId, false)
        ]);
        setRecords(archivedData);
        setAllActiveRecords(activeData);
      } else {
        const activeData = await listNinos(muniId, false);
        setRecords(activeData);
        setAllActiveRecords(activeData);
      }
    } catch (e: any) {
      setError(e.message || "Error al cargar niños");
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

  function handleOpenEdit(record: NinoRecord) {
    setModalMode("EDIT");
    setSelectedId(record.id);
    
    // Formatear fecha a YYYY-MM-DD para el input de fecha
    const rawDate = new Date(record.fechaNac);
    const formattedDate = !isNaN(rawDate.getTime()) 
      ? rawDate.toISOString().split("T")[0] 
      : "";

    setForm({
      municipalidadId: record.municipalidadId,
      responsableId: record.responsableId,
      sectorId: record.sectorId || "",
      dni: record.dni || "",
      cnv: record.cnv || "",
      nombres: record.nombres,
      apellidos: record.apellidos,
      sexo: record.sexo,
      fechaNac: formattedDate,
      direccion: record.direccion,
      referencia: record.referencia || "",
      latitud: record.latitud,
      longitud: record.longitud,
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
    if (!form.responsableId) {
      setValidationErrors({ responsableId: ["El responsable es obligatorio"] });
      return;
    }
    if (!form.dni.trim() && !form.cnv.trim()) {
      setValidationErrors({ Dni: ["Debe ingresar el DNI o el CNV del niño"] });
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
    if (!form.fechaNac) {
      setValidationErrors({ fechaNac: ["La fecha de nacimiento es obligatoria"] });
      return;
    }
    if (!form.direccion.trim()) {
      setValidationErrors({ direccion: ["La dirección es obligatoria"] });
      return;
    }

    try {
      if (modalMode === "CREATE") {
        await createNino(form);
        setMessage("Niño registrado correctamente");
      } else if (selectedId) {
        await updateNino(selectedId, {
          responsableId: form.responsableId,
          sectorId: form.sectorId,
          dni: form.dni,
          cnv: form.cnv,
          nombres: form.nombres,
          apellidos: form.apellidos,
          sexo: form.sexo,
          fechaNac: form.fechaNac,
          direccion: form.direccion,
          referencia: form.referencia,
          latitud: form.latitud,
          longitud: form.longitud,
        });
        setMessage("Datos del niño actualizados correctamente");
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

  async function handleToggleActivo(record: NinoRecord) {
    setError(null);
    setMessage(null);
    try {
      await setNinoActivo(record.id, !record.activo);
      setMessage(`Estado del niño actualizado a ${!record.activo ? "Activo" : "Inactivo"}`);
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al actualizar estado");
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("¿Está seguro de archivar a este niño? Se mantendrá en el historial pero ya no aparecerá en el padrón activo.")) return;
    setError(null);
    setMessage(null);
    try {
      await archiveNino(id);
      setMessage("Niño archivado correctamente.");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al archivar niño");
    }
  }

  async function handleUnarchive(id: string) {
    if (!confirm("¿Está seguro de restaurar a este niño al padrón activo?")) return;
    setError(null);
    setMessage(null);
    try {
      await unarchiveNino(id);
      setMessage("Niño restaurado correctamente.");
      loadData();
    } catch (e: any) {
      setError(e.message || "Error al restaurar niño");
    }
  }

  // Calcular edad en meses
  function calculateAgeInMonths(fechaNacStr: string): string {
    const birth = new Date(fechaNacStr);
    const now = new Date();
    if (isNaN(birth.getTime())) return "-";
    const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${diffMonths} meses`;
  }

  const filtered = records.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (r.dni && r.dni.includes(term)) ||
      (r.cnv && r.cnv.includes(term)) ||
      r.nombres.toLowerCase().includes(term) ||
      r.apellidos.toLowerCase().includes(term);

    const matchesMuni = !filterMuni || r.municipalidadId === filterMuni;

    const matchesActivo =
      filterActivo === "TODOS" ||
      (filterActivo === "ACTIVOS" && r.activo) ||
      (filterActivo === "INACTIVOS" && !r.activo);

    return matchesSearch && matchesMuni && matchesActivo;
  });

  const unassignedActiveNinos = allActiveRecords.filter(
    (r) => r.activo && (!r.asignaciones || r.asignaciones.length === 0)
  );
  const unassignedCount = unassignedActiveNinos.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const minDateObj = new Date();
  minDateObj.setMonth(minDateObj.getMonth() - 24);
  const minDateStr = minDateObj.toISOString().split("T")[0];

  const groupedRecords = (() => {
    if (groupBy === "NONE") return null;

    const groupsMap: Record<string, { label: string; items: NinoRecord[] }> = {};

    filtered.forEach((r) => {
      let key = "";
      let label = "";

      if (groupBy === "ACTOR_SOCIAL") {
        const asig = r.asignaciones && r.asignaciones[0];
        if (asig && asig.actorSocial) {
          key = asig.actorSocialId;
          label = `Actor Social: ${asig.actorSocial.apellidos}, ${asig.actorSocial.nombres}`;
        } else {
          key = "UNASSIGNED";
          label = "Sin Actor Social Asignado";
        }
      } else if (groupBy === "SECTOR") {
        if (r.sector) {
          key = r.sectorId || "NO_SECTOR";
          label = `Sector: ${r.sector.nombreSector} (${r.sector.codigo})`;
        } else {
          key = "NO_SECTOR";
          label = "Sin Sector Geográfico";
        }
      } else if (groupBy === "PERIODO") {
        const age = getAgeInMonthsNum(r.fechaNac);
        if (age >= 0 && age <= 5) {
          key = "0_5";
          label = "Periodo de Atención: De 0 a 5 meses";
        } else if (age >= 6 && age <= 12) {
          key = "6_12";
          label = "Periodo de Atención: De 6 a 12 meses";
        } else if (age > 12) {
          key = "OVER_12";
          label = "De 13 a 24 meses";
        } else {
          key = "UNKNOWN";
          label = "Periodo Desconocido";
        }
      }

      if (!groupsMap[key]) {
        groupsMap[key] = { label, items: [] };
      }
      groupsMap[key].items.push(r);
    });

    return Object.entries(groupsMap).map(([key, data]) => ({
      groupKey: key,
      groupLabel: data.label,
      items: data.items,
    }));
  })();

  function renderRowCells(n: NinoRecord) {
    return (
      <>
        <td>
          {n.dni ? (
            <div>
              <span className="badge badge-light" style={{ marginRight: "0.5rem" }}>DNI</span>
              <strong>{n.dni}</strong>
            </div>
          ) : (
            <div>
              <span className="badge badge-light" style={{ marginRight: "0.5rem" }}>CNV</span>
              <strong>{n.cnv}</strong>
            </div>
          )}
        </td>
        <td>{n.apellidos}, {n.nombres}</td>
        <td>{calculateAgeInMonths(n.fechaNac)}</td>
        <td>
          {n.responsable ? (
            <span>{n.responsable.apellidos}, {n.responsable.nombres}</span>
          ) : (
            <span className="text-muted">Sin asignar</span>
          )}
        </td>
        <td>
          {n.sector ? (
            <span className="badge badge-success">{n.sector.nombreSector}</span>
          ) : (
            <span className="text-muted">Sin sector</span>
          )}
        </td>
        <td>
          {n.asignaciones && n.asignaciones.length > 0 ? (
            <strong>{n.asignaciones[0].actorSocial.apellidos}, {n.asignaciones[0].actorSocial.nombres}</strong>
          ) : (
            <span className="text-muted">Sin asignar</span>
          )}
        </td>
        <td>
          <span className={`badge ${n.activo ? "badge-success" : "badge-error"}`}>
            {n.activo ? "Activo" : "Inactivo"}
          </span>
        </td>
        <td>
          <div className="admin-row-actions">
            <button
              className="admin-icon-button"
              onClick={() => handleOpenDetailModal(n)}
              title="Ver detalles"
              type="button"
            >
              <LuEye size={16} />
            </button>
            {!n.archivado && (
              <button
                className="admin-icon-button"
                onClick={() => handleOpenAssignModal(n)}
                title="Asignar Actor Social"
                type="button"
              >
                <LuUserPlus size={16} />
              </button>
            )}
            {!n.archivado && (
              <button
                className="admin-icon-button"
                onClick={() => handleOpenEdit(n)}
                title="Editar"
                type="button"
              >
                <LuPencil size={16} />
              </button>
            )}
            {!n.archivado && (
              <button
                className="admin-icon-button"
                onClick={() => handleToggleActivo(n)}
                title={n.activo ? "Desactivar" : "Activar"}
                type="button"
              >
                {n.activo ? (
                  <LuCircleCheck size={16} style={{ color: "var(--success)" }} />
                ) : (
                  <LuCircleX size={16} style={{ color: "var(--muted)" }} />
                )}
              </button>
            )}
            {n.archivado ? (
              <button
                className="admin-icon-button"
                onClick={() => handleUnarchive(n.id)}
                title="Restaurar niño"
                style={{ color: "var(--success)" }}
                type="button"
              >
                <LuArchiveRestore size={16} />
              </button>
            ) : (
              <button
                className="admin-icon-button is-danger"
                onClick={() => handleArchive(n.id)}
                title="Archivar"
                type="button"
              >
                <LuTrash2 size={16} />
              </button>
            )}
          </div>
        </td>
      </>
    );
  }

  return (
    <div className="admin-page-container">
      <section className="admin-page-heading">
        <div>
          <h1>Padrón Nominal: Niños</h1>
          <div className="breadcrumb-card" aria-label="Ruta actual">
            <span>Inicio</span>
            <span className="separator">/</span>
            <span className="current">Niños</span>
          </div>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Niños">
        <div className="admin-actions-row">
          <label className="admin-search-field">
            <LuSearch style={{ marginRight: "0.5rem" }} />
            <input
              type="search"
              placeholder="Buscar por DNI, CNV o Nombres..."
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

            <select
              className="admin-select"
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as any);
                setExpandedGroups({});
              }}
              style={{ width: "180px" }}
            >
              <option value="NONE">Sin agrupar</option>
              <option value="ACTOR_SOCIAL">Agrupar por Actor Social</option>
              <option value="SECTOR">Agrupar por Sector</option>
              <option value="PERIODO">Agrupar por Periodo de Atención</option>
            </select>

            <button
              className="admin-button"
              style={{ background: "#ffc107", color: "black", borderColor: "#ffc107" }}
              onClick={() => setShowUnassignedModal(true)}
              type="button"
            >
              <LuUserX size={18} style={{ marginRight: "0.5rem" }} />
              Niños sin asignación ({unassignedCount})
            </button>

            <button
              className={`admin-button ${verArchivados ? "is-primary" : "is-ghost"}`}
              onClick={() => setVerArchivados((prev) => !prev)}
              type="button"
            >
              <LuArchiveRestore size={18} style={{ marginRight: "0.5rem" }} />
              {verArchivados ? "Ver Activos" : "Ver Archivados"}
            </button>

            {!verArchivados && (
              <button className="admin-button is-primary" onClick={handleOpenCreate} type="button">
                <LuPlus size={18} style={{ marginRight: "0.5rem" }} />
                Registrar Niño
              </button>
            )}
          </div>
        </div>

        {message && <p className="alert alert-success" style={{ marginTop: "1rem" }}>{message}</p>}
        {error && <p className="alert alert-error" style={{ marginTop: "1rem" }}>{error}</p>}

        <div className="admin-table-meta" style={{ marginTop: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>{filtered.length} Niños encontrados</span>
            {groupBy !== "NONE" && (
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="admin-button is-ghost"
                  onClick={() => {
                    const expanded: Record<string, boolean> = {};
                    groupedRecords?.forEach((g) => {
                      expanded[g.groupKey] = true;
                    });
                    setExpandedGroups(expanded);
                  }}
                  style={{ padding: 0, height: "auto", fontSize: "0.85rem", color: "var(--primary)" }}
                >
                  Expandir todo
                </button>
                <span style={{ color: "#ccc" }}>|</span>
                <button
                  type="button"
                  className="admin-button is-ghost"
                  onClick={() => setExpandedGroups({})}
                  style={{ padding: 0, height: "auto", fontSize: "0.85rem", color: "var(--primary)" }}
                >
                  Colapsar todo
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Documento / CNV</th>
                <th>Apellidos y Nombres</th>
                <th>Edad (Meses)</th>
                <th>Responsable</th>
                <th>Sector</th>
                <th>Actor Social</th>
                <th>Estado</th>
                <th style={{ width: "150px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "2rem" }}>
                    Cargando padrón de niños...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-empty-cell">
                    No se encontraron niños registrados en el padrón.
                  </td>
                </tr>
              ) : groupBy !== "NONE" && groupedRecords ? (
                groupedRecords.map((group) => {
                  const isExpanded = !!expandedGroups[group.groupKey];
                  return (
                    <Fragment key={group.groupKey}>
                      <tr
                        onClick={() => toggleGroup(group.groupKey)}
                        style={{ cursor: "pointer", background: "#f8f9fa", fontWeight: "bold" }}
                      >
                        <td colSpan={8} style={{ padding: "0.75rem 1rem", borderLeft: "4px solid var(--primary, #0d6efd)" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {isExpanded ? <LuChevronDown size={18} /> : <LuChevronRight size={18} />}
                              <span>{group.groupLabel}</span>
                            </div>
                            <span className="badge badge-light">{group.items.length} niños</span>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && group.items.map((n) => (
                        <tr key={n.id}>
                          {renderRowCells(n)}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              ) : (
                filtered.map((n) => (
                  <tr key={n.id}>
                    {renderRowCells(n)}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Registro/Edición */}
      {showModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
          <form className="admin-modal" onSubmit={handleSubmit} style={{ maxWidth: "950px" }}>
            <div className="admin-modal-header">
              <h2>{modalMode === "CREATE" ? "Registrar Niño" : "Editar Datos del Niño"}</h2>
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

              <div className="field">
                <span>DNI</span>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    placeholder="Ej. 76543210 (8 dígitos)"
                    value={form.dni}
                    onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="admin-button"
                    onClick={handleDniLookup}
                    disabled={isSearchingDni || form.dni.trim().length !== 8}
                    style={{ height: "2.9rem", padding: "0 1rem" }}
                  >
                    {isSearchingDni ? "..." : "Buscar"}
                  </button>
                </div>
                {validationErrors.dni?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </div>

              <label className="field">
                <span>CNV (Certificado de Nacido Vivo)</span>
                <input
                  type="text"
                  placeholder="Requerido si no tiene DNI"
                  value={form.cnv}
                  onChange={(e) => setForm((f) => ({ ...f, cnv: e.target.value }))}
                />
                {validationErrors.cnv?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field">
                <span>Nombres *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Liam Gael"
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
                  placeholder="Ej. Quispe Ramos"
                  value={form.apellidos}
                  onChange={(e) => setForm((f) => ({ ...f, apellidos: e.target.value }))}
                />
                {validationErrors.apellidos?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field">
                <span>Sexo *</span>
                <select
                  value={form.sexo}
                  onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value as any }))}
                >
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                </select>
              </label>

              <label className="field">
                <span>Fecha de Nacimiento *</span>
                <input
                  type="date"
                  required
                  disabled={modalMode === "EDIT"}
                  value={form.fechaNac}
                  onChange={(e) => setForm((f) => ({ ...f, fechaNac: e.target.value }))}
                  min={minDateStr}
                  max={todayStr}
                />
                {validationErrors.fechaNac?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field admin-form-wide">
                <span>Madre / Responsable *</span>
                <select
                  required
                  value={form.responsableId}
                  onChange={(e) => setForm((f) => ({ ...f, responsableId: e.target.value }))}
                >
                  <option value="">Seleccionar madre o responsable de la familia...</option>
                  {responsables.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.tipoDocumento}: {r.dni}] {r.apellidos}, {r.nombres}
                    </option>
                  ))}
                </select>
                {validationErrors.responsableId?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field admin-form-wide">
                <span>Sector Geográfico (Residencia)</span>
                <select
                  value={form.sectorId}
                  onChange={(e) => setForm((f) => ({ ...f, sectorId: e.target.value }))}
                >
                  <option value="">Sin sector asignado...</option>
                  {sectores.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.tipoSector}] {s.nombreSector} ({s.codigo})
                    </option>
                  ))}
                </select>
                {validationErrors.sectorId?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field admin-form-wide">
                <span>Dirección Completa *</span>
                <input
                  type="text"
                  required
                  placeholder="Ej. Av. Los Libertadores Nro 123"
                  value={form.direccion}
                  onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                />
                {validationErrors.direccion?.map((err, i) => (
                  <span key={i} className="field-error">{err}</span>
                ))}
              </label>

              <label className="field admin-form-wide">
                <span>Referencia Geográfica de Domicilio</span>
                <textarea
                  rows={2}
                  placeholder="Ej. Portón verde, frente a la farmacia..."
                  value={form.referencia}
                  onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                />
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
                {modalMode === "CREATE" ? "Registrar Niño" : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Asignación de Actor Social */}
      {showAssignModal && assigningNino && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 999 }}>
          <div className="admin-modal" style={{ maxWidth: "750px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Asignación de Actor Social</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowAssignModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.5rem" }} className="form-stack">
              <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem" }}>
                <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem" }}>
                  Niño: {assigningNino.apellidos}, {assigningNino.nombres}
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <strong>Documento/CNV:</strong> {assigningNino.dni || assigningNino.cnv} | <strong>Dirección:</strong> {assigningNino.direccion}
                </p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <strong>Sector:</strong> {assigningNino.sector ? `${assigningNino.sector.nombreSector} (${assigningNino.sector.codigo})` : "Sin sector"}
                </p>
              </div>

              <form onSubmit={handleSaveAssignment} className="admin-form-grid" style={{ gap: "1rem" }}>
                <label className="field admin-form-wide">
                  <span>Actor Social Encargado *</span>
                  <select
                    required
                    value={selectedActorId}
                    onChange={(e) => setSelectedActorId(e.target.value)}
                  >
                    <option value="">Seleccionar actor social...</option>
                    {actoresSociales.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.apellidos}, {a.nombres} ({a.dni})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field admin-form-wide">
                  <span>Motivo de Asignación / Transferencia *</span>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detalla el motivo de la asignación de este actor social a este niño..."
                    value={assignMotivo}
                    onChange={(e) => setAssignMotivo(e.target.value)}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "white", color: "var(--text)" }}
                  />
                </label>

                <div className="admin-form-wide" style={{ display: "flex", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <div>
                    {assigningNino.asignaciones && assigningNino.asignaciones.length > 0 && (
                      <button
                        className="admin-button is-ghost"
                        style={{ color: "var(--color-error)", borderColor: "var(--color-error)" }}
                        onClick={handleDesasignar}
                        type="button"
                      >
                        Remover Asignación
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      className="admin-button is-ghost"
                      onClick={() => setShowAssignModal(false)}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button className="admin-button is-primary" type="submit" disabled={!selectedActorId || !assignMotivo.trim()}>
                      Guardar Asignación
                    </button>
                  </div>
                </div>
              </form>

              <hr style={{ border: 0, borderTop: "1px solid #eee", margin: "1.5rem 0" }} />

              <h3 style={{ fontSize: "1rem", margin: "0 0 1rem" }}>Historial de Asignaciones Territoriales</h3>
              <div className="admin-table-wrap" style={{ maxHeight: "200px", overflowY: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Actor Social</th>
                      <th>Asignado Por</th>
                      <th>Motivo</th>
                      <th>Vigente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="admin-empty-cell">
                          No hay registros históricos de asignación para este niño.
                        </td>
                      </tr>
                    ) : (
                      assignHistory.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontSize: "0.85rem" }}>
                            {new Date(h.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ fontSize: "0.85rem" }}>
                            {h.actorSocial ? `${h.actorSocial.apellidos}, ${h.actorSocial.nombres}` : "-"}
                          </td>
                          <td style={{ fontSize: "0.85rem" }}>
                            {h.asignadoPor ? h.asignadoPor.username : "-"}
                          </td>
                          <td style={{ fontSize: "0.85rem", whiteSpace: "normal" }}>
                            {h.motivo || "-"}
                          </td>
                          <td>
                            <span className={`badge ${h.activo ? "badge-success" : "badge-light"}`}>
                              {h.activo ? "Sí" : "No"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles del Niño */}
      {showDetailModal && detailNino && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 999 }}>
          <div className="admin-modal" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Detalles del Niño: {detailNino.apellidos}, {detailNino.nombres}</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowDetailModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.5rem" }} className="form-stack">
              <div className="admin-form-grid" style={{ gap: "1.5rem" }}>
                <div className="admin-form-wide" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", background: "#f8f9fa", padding: "1rem", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Documento</span>
                    <strong>{detailNino.dni ? `DNI: ${detailNino.dni}` : `CNV: ${detailNino.cnv}`}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Sexo</span>
                    <strong>{detailNino.sexo}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Fecha de Nacimiento</span>
                    <strong>{new Date(detailNino.fechaNac).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Edad</span>
                    <strong>{calculateAgeInMonths(detailNino.fechaNac)}</strong>
                  </div>
                </div>

                <div className="admin-form-wide">
                  <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", margin: "1rem 0 0.5rem" }}>Información del Domicilio</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Dirección</span>
                      <span>{detailNino.direccion}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Referencia</span>
                      <span>{detailNino.referencia || "-"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Latitud</span>
                      <span>{detailNino.latitud ?? "-"}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Longitud</span>
                      <span>{detailNino.longitud ?? "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="admin-form-wide">
                  <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", margin: "1rem 0 0.5rem" }}>Responsable y Sector</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Madre o Responsable</span>
                      {detailNino.responsable ? (
                        <strong>{detailNino.responsable.apellidos}, {detailNino.responsable.nombres} ({detailNino.responsable.dni})</strong>
                      ) : (
                        <span className="text-muted">No registrado</span>
                      )}
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Sector Geográfico</span>
                      {detailNino.sector ? (
                        <strong>[{detailNino.sector.tipoSector}] {detailNino.sector.nombreSector} ({detailNino.sector.codigo})</strong>
                      ) : (
                        <span className="text-muted">Sin sector asignado</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="admin-form-wide">
                  <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", margin: "1rem 0 0.5rem" }}>Estado en el Sistema</h3>
                  <div style={{ display: "flex", gap: "1.5rem" }}>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Operatividad</span>
                      <span className={`badge ${detailNino.activo ? "badge-success" : "badge-error"}`}>
                        {detailNino.activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block" }}>Archivado</span>
                      <span className={`badge ${detailNino.archivado ? "badge-error" : "badge-success"}`}>
                        {detailNino.archivado ? "Sí (Archivado)" : "No (Activo)"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="admin-form-wide">
                  <h3 style={{ fontSize: "1rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.25rem", margin: "1rem 0 0.5rem" }}>Historial de Asignaciones</h3>
                  <div className="admin-table-wrap" style={{ maxHeight: "150px", overflowY: "auto" }}>
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Actor Social</th>
                          <th>Asignado Por</th>
                          <th>Motivo</th>
                          <th>Vigente</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailHistory.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="admin-empty-cell">
                              No hay registros de asignación para este niño.
                            </td>
                          </tr>
                        ) : (
                          detailHistory.map((h) => (
                            <tr key={h.id}>
                              <td style={{ fontSize: "0.85rem" }}>
                                {new Date(h.createdAt).toLocaleDateString()}
                              </td>
                              <td style={{ fontSize: "0.85rem" }}>
                                {h.actorSocial ? `${h.actorSocial.apellidos}, ${h.actorSocial.nombres}` : "-"}
                              </td>
                              <td style={{ fontSize: "0.85rem" }}>
                                {h.asignadoPor ? h.asignadoPor.username : "-"}
                              </td>
                              <td style={{ fontSize: "0.85rem", whiteSpace: "normal" }}>
                                {h.motivo || "-"}
                              </td>
                              <td>
                                <span className={`badge ${h.activo ? "badge-success" : "badge-light"}`}>
                                  {h.activo ? "Sí" : "No"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="admin-button is-primary"
                onClick={() => setShowDetailModal(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Niños sin Asignación */}
      {showUnassignedModal && (
        <div aria-modal="true" className="admin-modal-backdrop" role="dialog" style={{ zIndex: 998 }}>
          <div className="admin-modal" style={{ maxWidth: "800px", width: "95%" }}>
            <div className="admin-modal-header">
              <h2>Niños sin Asignación de Actor Social ({unassignedCount})</h2>
              <button
                className="admin-modal-close"
                onClick={() => setShowUnassignedModal(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div style={{ padding: "1.5rem" }} className="form-stack">
              <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                A continuación se listan los niños activos del padrón que no tienen un actor social asignado.
              </p>
              <div className="admin-table-wrap" style={{ maxHeight: "400px", overflowY: "auto" }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Apellidos y Nombres</th>
                      <th>Edad</th>
                      <th>Sector</th>
                      <th style={{ width: "100px", textAlign: "right" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unassignedActiveNinos.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="admin-empty-cell">
                          Todos los niños activos tienen un actor social asignado.
                        </td>
                      </tr>
                    ) : (
                      unassignedActiveNinos.map((n) => (
                        <tr key={n.id}>
                          <td>{n.dni ? `DNI: ${n.dni}` : `CNV: ${n.cnv}`}</td>
                          <td>{n.apellidos}, {n.nombres}</td>
                          <td>{calculateAgeInMonths(n.fechaNac)}</td>
                          <td>
                            {n.sector ? (
                              <span className="badge badge-success">{n.sector.nombreSector}</span>
                            ) : (
                              <span className="text-muted">Sin sector</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="admin-button is-primary"
                              onClick={() => {
                                setShowUnassignedModal(false);
                                handleOpenAssignModal(n);
                              }}
                              style={{ padding: "0.25rem 0.75rem", fontSize: "0.85rem", height: "auto" }}
                              type="button"
                            >
                              Asignar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-modal-footer" style={{ padding: "1rem 1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                className="admin-button is-ghost"
                onClick={() => setShowUnassignedModal(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
