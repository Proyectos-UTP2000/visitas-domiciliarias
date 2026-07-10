import { useEffect, useState, useMemo } from "react";
import { 
  LuCalendar, 
  LuFilter, 
  LuDownload, 
  LuCircleCheck, 
  LuClock, 
  LuTriangleAlert, 
  LuRefreshCw, 
  LuUsers 
} from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import { listActores } from "../../actores-sociales/actores-sociales-api";
import { listSectores } from "../../sectores/sectores-api";
import { getReporteActividad } from "../reportes-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import type { ActorSocialRecord } from "../../actores-sociales/actores-sociales-types";
import type { SectorRecord } from "../../sectores/sectores-types";
import type { ReporteActividadData } from "../reportes-types";
import "../reportes.css";

export function ReporteActividadPage() {
  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  
  // Data lists
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [actores, setActores] = useState<ActorSocialRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  
  // Filters
  const [muniFilter, setMuniFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Report results
  const [reportData, setReportData] = useState<ReporteActividadData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_MUNICIPAL") {
        setMuniFilter(session.user.municipalidadId || "");
      }
    }
    void loadFiltersData();
  }, []);

  useEffect(() => {
    if (user) {
      void fetchReport();
    }
  }, [user, muniFilter, actorFilter, sectorFilter, fechaInicio, fechaFin]);

  async function loadFiltersData() {
    try {
      const session = getStoredSession();
      const userMuniId = session?.user.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;

      const [munData, actData, sectData] = await Promise.all([
        listMunicipalidades(),
        listActores(userMuniId || muniFilter || null),
        listSectores(userMuniId || muniFilter || null)
      ]);

      setMunicipalidades(munData);
      setActores(actData.filter((a) => a.activo));
      setSectores(sectData.filter((s) => s.activo));
    } catch (err: any) {
      console.error("Error al cargar los catálogos de filtros:", err);
    }
  }

  // Reload lists if municipal filter changes (for admin general)
  useEffect(() => {
    if (user?.rol === "ADMIN_GENERAL" && muniFilter) {
      void (async () => {
        try {
          const [actData, sectData] = await Promise.all([
            listActores(muniFilter),
            listSectores(muniFilter)
          ]);
          setActores(actData.filter((a) => a.activo));
          setSectores(sectData.filter((s) => s.activo));
          setActorFilter("");
          setSectorFilter("");
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [muniFilter, user]);

  async function fetchReport() {
    setIsLoading(true);
    setError(null);
    try {
      const targetMuni = user?.rol === "ADMIN_MUNICIPAL" ? user.municipalidadId : muniFilter;
      
      if (user?.rol === "ADMIN_GENERAL" && !targetMuni) {
        setReportData(null);
        return;
      }

      const data = await getReporteActividad({
        municipalidadId: targetMuni,
        actorSocialId: actorFilter || null,
        sectorId: sectorFilter || null,
        fechaInicio: fechaInicio || null,
        fechaFin: fechaFin || null,
      });

      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener el reporte de actividad.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleResetFilters() {
    if (user?.rol === "ADMIN_GENERAL") {
      setMuniFilter("");
    }
    setActorFilter("");
    setSectorFilter("");
    setFechaInicio("");
    setFechaFin("");
  }

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  function exportToCSV() {
    if (!reportData || reportData.detalles.length === 0) return;

    const headers = [
      "ID Visita",
      "DNI Niño",
      "Nombre Niño",
      "Apellidos Niño",
      "Fecha Programada",
      "Fecha Ejecución",
      "Estado",
      "Actor Social",
      "Sector",
      "Consejería Brindada",
      "Comentarios/Observaciones"
    ];

    const csvRows = [
      headers.join(";"),
      ...reportData.detalles.map((d) => [
        `"${d.id}"`,
        `"${d.ninoDni}"`,
        `"${d.ninoNombre.replace(/"/g, '""')}"`,
        `"${d.ninoApellidos.replace(/"/g, '""')}"`,
        `"${d.fechaProgramada}"`,
        `"${d.fechaEjecucion || ""}"`,
        `"${d.estado}"`,
        `"${d.actorNombre.replace(/"/g, '""')}"`,
        `"${d.sectorNombre.replace(/"/g, '""')}"`,
        `"${d.consejeriaBrindada ? 'SÍ' : 'NO'}"`,
        `"${(d.comentarios || "").replace(/"/g, '""').replace(/\n/g, " ")}"`
      ].join(";"))
    ];

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for excel spanish encoding support
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const muniName = user?.rol === "ADMIN_MUNICIPAL" 
      ? munisMap[user.municipalidadId || ""] 
      : munisMap[muniFilter];
    
    const filename = `Reporte_Actividad_Visitas_${muniName || "Municipal"}_${new Date().toISOString().split("T")[0]}.csv`;
    
    link.setAttribute("download", filename.replace(/\s+/g, "_"));
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Reporte de Actividad</h1>
          <p>Métricas de cobertura y desempeño operativo de visitas domiciliarias programadas y ejecutadas.</p>
        </div>
        <div className="breadcrumb-card">
          <span>⌂</span>
          <span>Inicio</span>
          <span>Reportes</span>
          <strong>Actividad</strong>
        </div>
      </section>

      {/* FILTROS */}
      <section className="admin-content-card filter-section">
        <div className="filter-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filter-title">
            <LuFilter />
            <span>Filtros de Reporte</span>
          </div>
          <button className="admin-button is-ghost size-sm">
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>

        {showFilters && (
          <div className="filter-grid" style={{ marginTop: "1rem" }}>
            {user?.rol === "ADMIN_GENERAL" && (
              <div className="form-group">
                <label htmlFor="muniFilter">Municipalidad</label>
                <select
                  id="muniFilter"
                  value={muniFilter}
                  onChange={(e) => setMuniFilter(e.target.value)}
                  className="admin-select"
                >
                  <option value="">-- Seleccionar Municipalidad --</option>
                  {municipalidades.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="actorFilter">Actor Social</label>
              <select
                id="actorFilter"
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className="admin-select"
                disabled={user?.rol === "ADMIN_GENERAL" && !muniFilter}
              >
                <option value="">Todos los actores sociales</option>
                {actores.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.apellidos}, {a.nombres} ({a.dni})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="sectorFilter">Sector</label>
              <select
                id="sectorFilter"
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="admin-select"
                disabled={user?.rol === "ADMIN_GENERAL" && !muniFilter}
              >
                <option value="">Todos los sectores</option>
                {sectores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombreSector} ({s.tipoSector})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fechaInicio">Fecha Inicio</label>
              <input
                type="date"
                id="fechaInicio"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fechaFin">Fecha Fin</label>
              <input
                type="date"
                id="fechaFin"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="admin-input"
              />
            </div>

            <div className="form-group filter-actions-container" style={{ display: "flex", alignItems: "flex-end" }}>
              <button 
                type="button" 
                onClick={handleResetFilters} 
                className="admin-button is-secondary" 
                style={{ width: "100%" }}
              >
                Restablecer Filtros
              </button>
            </div>
          </div>
        )}
      </section>

      {user?.rol === "ADMIN_GENERAL" && !muniFilter ? (
        <section className="admin-page-heading admin-empty-state">
          <div>
            <p className="eyebrow">ADMIN GENERAL</p>
            <h1>Selecciona una Municipalidad</h1>
            <p>Debes seleccionar una municipalidad para poder visualizar las métricas y reportes operativos.</p>
          </div>
        </section>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem" }}>
          <div className="loading-spinner">Cargando reporte de actividad...</div>
        </div>
      ) : error ? (
        <p className="alert alert-error">{error}</p>
      ) : reportData ? (
        <>
          {/* KPI CARDS */}
          <div className="reports-kpi-grid">
            <div className="kpi-card-custom purple">
              <div className="kpi-card-header">
                <span>Total Visitas</span>
                <LuCalendar className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.total}</div>
              <div className="kpi-card-desc">Visitas programadas en el periodo</div>
            </div>

            <div className="kpi-card-custom green">
              <div className="kpi-card-header">
                <span>Ejecutadas</span>
                <LuCircleCheck className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.ejecutadas}</div>
              <div className="kpi-card-desc">Visitas completadas exitosamente</div>
            </div>

            <div className="kpi-card-custom blue">
              <div className="kpi-card-header">
                <span>Pendientes</span>
                <LuClock className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.programadas}</div>
              <div className="kpi-card-desc">Visitas agendadas por realizar</div>
            </div>

            <div className="kpi-card-custom orange">
              <div className="kpi-card-header">
                <span>Inconclusas / Reprog.</span>
                <LuTriangleAlert className="kpi-icon" />
              </div>
              <div className="kpi-card-value">
                {reportData.summary.inconclusas} / {reportData.summary.reprogramadas}
              </div>
              <div className="kpi-card-desc">Visitas con problemas de ejecución</div>
            </div>

            <div className="kpi-card-custom primary-gradient text-white">
              <div className="kpi-card-header">
                <span className="text-white-muted">Cobertura de Visitas</span>
                <LuRefreshCw className="kpi-icon text-white" />
              </div>
              <div className="kpi-card-value text-white">{reportData.summary.porcentajeEjecucion}%</div>
              <div className="progress-container-custom">
                <div 
                  className="progress-bar-custom" 
                  style={{ width: `${reportData.summary.porcentajeEjecucion}%` }}
                ></div>
              </div>
              <div className="kpi-card-desc text-white-muted">Tasa de cumplimiento general</div>
            </div>
          </div>

          {/* DESEMPEÑO ACTORES SOCIALES */}
          <section className="admin-content-card" style={{ marginTop: "1.5rem" }}>
            <div className="admin-card-toolbar">
              <div>
                <h2>Desempeño de Actores Sociales</h2>
                <p>Lista de actores sociales asignados a la municipalidad y su porcentaje de cobertura de visitas.</p>
              </div>
              <div className="action-buttons-wrap">
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={reportData.detalles.length === 0}
                  className="admin-button is-primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <LuDownload />
                  <span>Exportar Detalles a CSV</span>
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Actor Social</th>
                    <th style={{ textAlign: "center" }}>Asignadas</th>
                    <th style={{ textAlign: "center" }}>Ejecutadas</th>
                    <th style={{ textAlign: "center" }}>Pendientes</th>
                    <th style={{ textAlign: "center" }}>Inconclusas</th>
                    <th style={{ textAlign: "center" }}>Reprogramadas</th>
                    <th style={{ textAlign: "right" }}>% Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.actores.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                        No hay actores sociales registrados.
                      </td>
                    </tr>
                  ) : (
                    reportData.actores.map((act) => (
                      <tr key={act.actorId}>
                        <td>{act.dni}</td>
                        <td>
                          <strong>{act.apellidos}, {act.nombres}</strong>
                        </td>
                        <td style={{ textAlign: "center" }}>{act.total}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className="status-pill is-active">{act.ejecutadas}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>{act.programadas}</td>
                        <td style={{ textAlign: "center" }}>
                          {act.inconclusas > 0 ? (
                            <span className="status-pill is-suspended">{act.inconclusas}</span>
                          ) : (
                            0
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>{act.reprogramadas}</td>
                        <td style={{ textAlign: "right" }}>
                          <span 
                            className={`status-pill ${
                              act.porcentajeEjecucion >= 80 
                                ? "is-active" 
                                : act.porcentajeEjecucion >= 50 
                                ? "is-pending" 
                                : "is-suspended"
                            }`}
                            style={{ fontWeight: "bold" }}
                          >
                            {act.porcentajeEjecucion}%
                          </span>
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
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
          <LuUsers style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }} />
          <p>No se encontraron datos para generar el reporte con los filtros seleccionados.</p>
        </div>
      )}
    </>
  );
}
