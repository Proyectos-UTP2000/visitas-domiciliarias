import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LuCalendar,
  LuCircleCheck,
  LuClock,
  LuTriangleAlert,
  LuRefreshCw,
  LuUsers,
  LuMapPin,
  LuBaby,
  LuClipboardList,
  LuBuilding,
  LuChevronRight,
  LuFileText
} from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import { listActores } from "../../actores-sociales/actores-sociales-api";
import { listSectores } from "../../sectores/sectores-api";
import { listGrupos } from "../../grupos-trabajo/grupos-api";
import { getReporteActividad, getReporteOperativo } from "../../reportes/reportes-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import type { GrupoTrabajoRecordWithRelations } from "../../grupos-trabajo/grupos-types";
import "./DashboardHomePage.css";

export function DashboardHomePage() {
  const [session, setSession] = useState<any>(null);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [selectedMuniId, setSelectedMuniId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Métricas
  const [totalNinos, setTotalNinos] = useState<number>(0);
  const [ninos0a5, setNinos0a5] = useState<number>(0);
  const [ninos6a12, setNinos6a12] = useState<number>(0);

  const [totalVisitas, setTotalVisitas] = useState<number>(0);
  const [visitasEjecutadas, setVisitasEjecutadas] = useState<number>(0);
  const [visitasProgramadas, setVisitasProgramadas] = useState<number>(0);
  const [visitasReprogramadas, setVisitasReprogramadas] = useState<number>(0);
  const [visitasInconclusas, setVisitasInconclusas] = useState<number>(0);
  const [porcentajeEjecucion, setPorcentajeEjecucion] = useState<number>(0);

  const [totalActores, setTotalActores] = useState<number>(0);
  const [totalSectores, setTotalSectores] = useState<number>(0);
  const [grupos, setGrupos] = useState<GrupoTrabajoRecordWithRelations[]>([]);

  // Detectar rol y muni en la sesión
  useEffect(() => {
    const activeSession = getStoredSession();
    if (activeSession) {
      setSession(activeSession);
      if (activeSession.user.rol === "ADMIN_MUNICIPAL") {
        setSelectedMuniId(activeSession.user.municipalidadId || "");
      }
    }
  }, []);

  // Cargar lista de municipalidades para ADMIN_GENERAL
  useEffect(() => {
    if (session?.user.rol === "ADMIN_GENERAL") {
      void (async () => {
        try {
          const list = await listMunicipalidades();
          setMunicipalidades(list.filter(m => m.activo));
        } catch (err) {
          console.error("Error al cargar municipalidades:", err);
        }
      })();
    }
  }, [session]);

  // Cargar datos consolidados o por municipalidad seleccionada
  useEffect(() => {
    if (session) {
      const targetMuni = session.user.rol === "ADMIN_MUNICIPAL"
        ? session.user.municipalidadId
        : selectedMuniId || null;

      void fetchDashboardData(targetMuni);
    }
  }, [session, selectedMuniId]);

  async function fetchDashboardData(muniId: string | null) {
    setIsLoading(true);
    setError(null);
    try {
      const [actData, opData, actList, sectList, groupList] = await Promise.all([
        getReporteActividad({ municipalidadId: muniId }),
        getReporteOperativo({ municipalidadId: muniId }),
        listActores(muniId),
        listSectores(muniId),
        listGrupos(muniId)
      ]);

      setTotalNinos(opData.summary.totalNinos);
      setNinos0a5(opData.summary.ninos0a5);
      setNinos6a12(opData.summary.ninos6a12);

      setTotalVisitas(actData.summary.total);
      setVisitasEjecutadas(actData.summary.ejecutadas);
      setVisitasProgramadas(actData.summary.programadas);
      setVisitasReprogramadas(actData.summary.reprogramadas);
      setVisitasInconclusas(actData.summary.inconclusas);
      setPorcentajeEjecucion(actData.summary.porcentajeEjecucion);

      setTotalActores(actList.filter(a => a.activo).length);
      setTotalSectores(sectList.filter(s => s.activo).length);
      setGrupos(groupList);
    } catch (err: any) {
      console.error("Error al cargar datos del dashboard:", err);
      setError("Error al obtener la información de las métricas en tiempo real.");
    } finally {
      setIsLoading(false);
    }
  }

  // Grupo de Trabajo correspondiente
  const municipalidadGrupo = useMemo(() => {
    if (!grupos.length) return null;
    if (session?.user.rol === "ADMIN_MUNICIPAL") {
      return grupos[0] || null;
    }
    if (selectedMuniId) {
      return grupos.find(g => g.municipalidadId === selectedMuniId) || null;
    }
    return null;
  }, [grupos, selectedMuniId, session]);

  // Consolidado de grupos (para Admin General sin muni seleccionada)
  const consolidadoGrupos = useMemo(() => {
    const summary = {
      total: grupos.length,
      borrador: 0,
      registrado: 0,
      validado: 0,
      aprobado: 0
    };
    grupos.forEach(g => {
      if (g.estado === "BORRADOR") summary.borrador++;
      else if (g.estado === "REGISTRADO") summary.registrado++;
      else if (g.estado === "VALIDADO") summary.validado++;
      else if (g.estado === "APROBADO") summary.aprobado++;
    });
    return summary;
  }, [grupos]);

  const currentStepIndex = useMemo(() => {
    if (!municipalidadGrupo) return -1;
    const states = ["BORRADOR", "REGISTRADO", "VALIDADO", "APROBADO"];
    return states.indexOf(municipalidadGrupo.estado);
  }, [municipalidadGrupo]);

  // Donut SVG logic
  const donutRadius = 50;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutStrokeDashoffset = useMemo(() => {
    return donutCircumference - (porcentajeEjecucion / 100) * donutCircumference;
  }, [porcentajeEjecucion, donutCircumference]);

  const userRoleText = session?.user.rol === "ADMIN_GENERAL" ? "Administrador General" : "Administrador Municipal";

  return (
    <div className="animate-fade-in">
      <section className="admin-page-heading">
        <div>
          <span className={`role-badge ${session?.user.rol === "ADMIN_GENERAL" ? "general" : ""}`}>
            {userRoleText}
          </span>
          <h1>Panel administrativo</h1>
          <p>
            {session?.user.rol === "ADMIN_GENERAL"
              ? "Gestiona la configuración global, conformación de equipos territoriales y supervisa todas las municipalidades registradas."
              : "Gestiona la conformación de grupos de trabajo, sectorización, actores sociales y realiza el seguimiento de visitas domiciliarias."}
          </p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Inicio</span>
          <strong>Panel administrativo</strong>
        </div>
      </section>

      {/* Selector Municipal para Admin General */}
      {session?.user.rol === "ADMIN_GENERAL" && (
        <div className="dashboard-muni-selector-wrap">
          <label htmlFor="muniSelect">Visualizar Municipalidad:</label>
          <select
            id="muniSelect"
            value={selectedMuniId}
            onChange={(e) => setSelectedMuniId(e.target.value)}
            className="dashboard-muni-selector"
          >
            <option value="">-- Todas las Municipalidades (Consolidado) --</option>
            {municipalidades.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-loading-container">
          <div className="dashboard-loading-spinner" />
          <div className="dashboard-loading-text">Cargando métricas del panel...</div>
        </div>
      ) : error ? (
        <div className="admin-content-card" style={{ textAlign: "center", padding: "3rem" }}>
          <LuTriangleAlert style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1rem" }} />
          <h3>Error en la carga</h3>
          <p style={{ color: "var(--muted)" }}>{error}</p>
          <button
            onClick={() => fetchDashboardData(selectedMuniId || null)}
            className="admin-button is-primary"
            style={{ marginTop: "1.5rem" }}
          >
            Reintentar cargar
          </button>
        </div>
      ) : (
        <>
          {/* Tarjetas de KPI */}
          <div className="dashboard-kpi-grid">
            <div className="dash-kpi-card ninos">
              <div className="dash-kpi-header">
                <span>Niños en Padrón</span>
                <LuBaby className="dash-kpi-icon" />
              </div>
              <div className="dash-kpi-value-row">
                <div className="dash-kpi-value">{totalNinos}</div>
                <div className="dash-kpi-unit">bebés</div>
              </div>
              <div className="dash-kpi-footer">
                <strong>{ninos0a5}</strong> de 0-5 meses | <strong>{ninos6a12}</strong> de 6-12 meses
              </div>
            </div>

            <div className="dash-kpi-card actores">
              <div className="dash-kpi-header">
                <span>Actores Sociales</span>
                <LuUsers className="dash-kpi-icon" />
              </div>
              <div className="dash-kpi-value-row">
                <div className="dash-kpi-value">{totalActores}</div>
                <div className="dash-kpi-unit">activos</div>
              </div>
              <div className="dash-kpi-footer">
                Personal asignado a visitas de campo en la zona.
              </div>
            </div>

            <div className="dash-kpi-card sectores">
              <div className="dash-kpi-header">
                <span>Sectores / CP</span>
                <LuMapPin className="dash-kpi-icon" />
              </div>
              <div className="dash-kpi-value-row">
                <div className="dash-kpi-value">{totalSectores}</div>
                <div className="dash-kpi-unit">zonas</div>
              </div>
              <div className="dash-kpi-footer">
                Sectores urbanos, rurales y centros poblados registrados.
              </div>
            </div>

            <div className="dash-kpi-card visitas">
              <div className="dash-kpi-header">
                <span>Tasa de Visitas</span>
                <LuCircleCheck className="dash-kpi-icon" />
              </div>
              <div className="dash-kpi-value-row">
                <div className="dash-kpi-value">{porcentajeEjecucion}%</div>
                <div className="dash-kpi-unit">avance</div>
              </div>
              <div className="dash-kpi-footer">
                <strong>{visitasEjecutadas}</strong> completadas de <strong>{totalVisitas}</strong> programadas.
              </div>
            </div>
          </div>

          {/* Dos Columnas: Grupo de Trabajo y Donut de Visitas */}
          <div className="dashboard-two-cols">
            {/* Columna 1: Grupo de Trabajo */}
            <div className="dash-section-card">
              <div className="dash-card-title-wrap">
                <h3>Estado de la Conformación del Equipo</h3>
                <p>Monitoreo del grupo de trabajo y establecimientos asociados.</p>
              </div>

              {session?.user.rol === "ADMIN_GENERAL" && !selectedMuniId ? (
                // Consolidado de grupos para Admin General
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1, justifyContent: "center" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Grupos Conformados:</strong>
                    <span className="status-pill is-active" style={{ fontSize: "0.9rem" }}>
                      {consolidadoGrupos.total} total
                    </span>
                  </div>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between" }}>
                      <span>Borrador:</span>
                      <strong>{consolidadoGrupos.borrador}</strong>
                    </div>
                    <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between" }}>
                      <span>En Revisión (Registrado):</span>
                      <strong>{consolidadoGrupos.registrado}</strong>
                    </div>
                    <div style={{ display: "flex", justifyItems: "center", justifyContent: "space-between" }}>
                      <span>Validados / Aprobados:</span>
                      <strong>{consolidadoGrupos.validado + consolidadoGrupos.aprobado}</strong>
                    </div>
                  </div>
                  <Link to="/grupos-trabajo" className="admin-button is-primary" style={{ marginTop: "1rem", textAlign: "center" }}>
                    <LuBuilding style={{ marginRight: "0.5rem" }} />
                    Ver Todos los Grupos de Trabajo
                  </Link>
                </div>
              ) : municipalidadGrupo ? (
                // Detalle del grupo de la municipalidad
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <div className={`workgroup-state-banner ${municipalidadGrupo.estado.toLowerCase()}`}>
                    {municipalidadGrupo.estado === "BORRADOR" && (
                      <>
                        <LuTriangleAlert />
                        <span>Grupo en BORRADOR. Pendiente de completar y enviar.</span>
                      </>
                    )}
                    {municipalidadGrupo.estado === "REGISTRADO" && (
                      <>
                        <LuClock />
                        <span>GRUPO REGISTRADO. En revisión para aprobación.</span>
                      </>
                    )}
                    {municipalidadGrupo.estado === "VALIDADO" && (
                      <>
                        <LuCircleCheck />
                        <span>GRUPO VALIDADO. Operaciones autorizadas.</span>
                      </>
                    )}
                    {municipalidadGrupo.estado === "APROBADO" && (
                      <>
                        <LuCircleCheck />
                        <span>GRUPO APROBADO DEFINITIVAMENTE.</span>
                      </>
                    )}
                  </div>

                  <div className="workgroup-stepper">
                    <div className={`workgroup-step-item ${currentStepIndex >= 0 ? "completed" : "active"}`}>
                      <div className="workgroup-step-indicator" />
                      <div className="workgroup-step-content">
                        <span className="workgroup-step-title">1. Creación (Borrador)</span>
                        <span className="workgroup-step-desc">Se definen datos generales, establecimientos y miembros.</span>
                      </div>
                    </div>

                    <div className={`workgroup-step-item ${currentStepIndex > 1 ? "completed" : currentStepIndex === 1 ? "active" : ""}`}>
                      <div className="workgroup-step-indicator" />
                      <div className="workgroup-step-content">
                        <span className="workgroup-step-title">2. Registrado (En Revisión)</span>
                        <span className="workgroup-step-desc">El grupo se envía a revisión por el Administrador Municipal.</span>
                      </div>
                    </div>

                    <div className={`workgroup-step-item ${currentStepIndex > 2 ? "completed" : currentStepIndex === 2 ? "active" : ""}`}>
                      <div className="workgroup-step-indicator" />
                      <div className="workgroup-step-content">
                        <span className="workgroup-step-title">3. Validado</span>
                        <span className="workgroup-step-desc">El grupo recibe la validación formal de las autoridades locales.</span>
                      </div>
                    </div>

                    <div className={`workgroup-step-item ${currentStepIndex === 3 ? "completed" : ""}`}>
                      <div className="workgroup-step-indicator" />
                      <div className="workgroup-step-content">
                        <span className="workgroup-step-title">4. Aprobado</span>
                        <span className="workgroup-step-desc">Conformación completada y lista para operaciones históricas.</span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/grupos-trabajo/${municipalidadGrupo.id}`} className="admin-button is-primary" style={{ marginTop: "auto", display: "inline-flex", justifyContent: "center" }}>
                    <LuFileText style={{ marginRight: "0.5rem" }} />
                    Ver Detalles del Grupo
                  </Link>
                </div>
              ) : (
                // No hay grupo conformado
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1rem", textAlign: "center", flex: 1, gap: "1rem" }}>
                  <LuBuilding style={{ fontSize: "3rem", color: "var(--muted)", opacity: 0.5 }} />
                  <div>
                    <strong>Sin Grupo de Trabajo</strong>
                    <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginTop: "0.25rem" }}>
                      No se ha registrado una conformación de grupo de trabajo para esta municipalidad.
                    </p>
                  </div>
                  {session?.user.rol === "ADMIN_MUNICIPAL" && (
                    <Link to="/grupos-trabajo" className="admin-button is-primary">
                      Configurar Grupo de Trabajo
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Columna 2: Distribución de Visitas (SVG Donut Chart) */}
            <div className="dash-section-card">
              <div className="dash-card-title-wrap">
                <h3>Cobertura y Estado de Visitas</h3>
                <p>Desglose del progreso de visitas programadas en la zona.</p>
              </div>

              {totalVisitas === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
                  <LuCalendar style={{ fontSize: "3rem", opacity: 0.5, marginBottom: "1rem" }} />
                  <strong>No hay visitas programadas</strong>
                  <p style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                    Aún no se han programado visitas de seguimiento en el periodo seleccionado.
                  </p>
                </div>
              ) : (
                <div className="dash-donut-chart-container">
                  <div className="dash-donut-svg-wrap">
                    <svg viewBox="0 0 120 120" className="dash-donut-svg">
                      {/* Fondo de círculo */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="transparent"
                        stroke="var(--border)"
                        strokeWidth="10"
                      />
                      {/* Círculo indicador de avance */}
                      <circle
                        cx="60"
                        cy="60"
                        r={donutRadius}
                        fill="transparent"
                        stroke="var(--primary)"
                        strokeWidth="10"
                        strokeDasharray={donutCircumference}
                        strokeDashoffset={donutStrokeDashoffset}
                        strokeLinecap="round"
                        style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
                      />
                    </svg>
                    <div className="dash-donut-text">
                      <span className="dash-donut-percentage">{porcentajeEjecucion}%</span>
                      <span className="dash-donut-label">Avance</span>
                    </div>
                  </div>

                  <div className="dash-chart-legend">
                    <div className="dash-legend-item">
                      <div className="dash-legend-color" style={{ backgroundColor: "var(--primary)" }} />
                      <span>Ejecutadas</span>
                      <span className="dash-legend-value">{visitasEjecutadas}</span>
                    </div>

                    <div className="dash-legend-item">
                      <div className="dash-legend-color" style={{ backgroundColor: "#3b82f6" }} />
                      <span>Pendientes</span>
                      <span className="dash-legend-value">{visitasProgramadas}</span>
                    </div>

                    <div className="dash-legend-item">
                      <div className="dash-legend-color" style={{ backgroundColor: "#f97316" }} />
                      <span>Reprogramadas</span>
                      <span className="dash-legend-value">{visitasReprogramadas}</span>
                    </div>

                    <div className="dash-legend-item">
                      <div className="dash-legend-color" style={{ backgroundColor: "#ef4444" }} />
                      <span>Inconclusas</span>
                      <span className="dash-legend-value">{visitasInconclusas}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Accesos Rápidos */}
          <section className="dashboard-actions-section">
            <h3 className="dashboard-actions-title">Accesos rápidos del sistema</h3>
            <div className="dashboard-actions-grid">
              <Link to="/actores-sociales" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuUsers />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Actores Sociales</span>
                  <span className="dash-action-card-desc">Registrar y gestionar credenciales</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>

              <Link to="/sectores/urbano" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuMapPin />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Sectores y Manzanas</span>
                  <span className="dash-action-card-desc">Configuración urbana y rural</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>

              <Link to="/ninos" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuBaby />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Padrón de Niños</span>
                  <span className="dash-action-card-desc">Registro y control de menores</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>

              <Link to="/visitas" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuClipboardList />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Seguimiento de Visitas</span>
                  <span className="dash-action-card-desc">Planificación y visitas domiciliarias</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>

              <Link to="/reportes/actividad" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuFileText />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Reportes Operativos</span>
                  <span className="dash-action-card-desc">Métricas de cobertura y actividad</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>

              <Link to="/grupos-trabajo" className="dash-action-card">
                <div className="dash-action-card-icon-wrap">
                  <LuBuilding />
                </div>
                <div className="dash-action-card-info">
                  <span className="dash-action-card-title">Grupo de Trabajo</span>
                  <span className="dash-action-card-desc">Conformación y establecimientos</span>
                </div>
                <LuChevronRight className="dash-action-card-chevron" />
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
