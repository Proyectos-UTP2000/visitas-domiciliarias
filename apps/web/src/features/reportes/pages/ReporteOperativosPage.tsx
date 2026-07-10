import { useEffect, useState, useMemo } from "react";
import { 
  LuFilter, 
  LuDownload, 
  LuSmile, 
  LuFileText, 
  LuShieldAlert,
  LuCompass,
  LuPhone
} from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import { listSectores } from "../../sectores/sectores-api";
import { getReporteOperativo } from "../reportes-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import type { SectorRecord } from "../../sectores/sectores-types";
import type { ReporteOperativoData } from "../reportes-types";
import "../reportes.css";

export function ReporteOperativosPage() {
  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  
  // Data lists
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  
  // Filters
  const [muniFilter, setMuniFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Report results
  const [reportData, setReportData] = useState<ReporteOperativoData | null>(null);
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
  }, [user, muniFilter, sectorFilter]);

  async function loadFiltersData() {
    try {
      const session = getStoredSession();
      const userMuniId = session?.user.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;

      const [munData, sectData] = await Promise.all([
        listMunicipalidades(),
        listSectores(userMuniId || muniFilter || null)
      ]);

      setMunicipalidades(munData);
      setSectores(sectData.filter((s) => s.activo));
    } catch (err: any) {
      console.error("Error al cargar los catálogos de filtros operativos:", err);
    }
  }

  // Reload sectors if municipal filter changes (for admin general)
  useEffect(() => {
    if (user?.rol === "ADMIN_GENERAL" && muniFilter) {
      void (async () => {
        try {
          const sectData = await listSectores(muniFilter);
          setSectores(sectData.filter((s) => s.activo));
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

      const data = await getReporteOperativo({
        municipalidadId: targetMuni,
        sectorId: sectorFilter || null,
      });

      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener el reporte operativo.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleResetFilters() {
    if (user?.rol === "ADMIN_GENERAL") {
      setMuniFilter("");
    }
    setSectorFilter("");
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
      "ID Niño",
      "DNI",
      "CNV",
      "Nombres",
      "Apellidos",
      "Fecha Nacimiento",
      "Edad (Meses)",
      "Rango de Edad",
      "Sector",
      "Responsable",
      "Celular Responsable"
    ];

    const csvRows = [
      headers.join(";"),
      ...reportData.detalles.map((d) => [
        `"${d.id}"`,
        `"${d.dni}"`,
        `"${d.cnv}"`,
        `"${d.nombres.replace(/"/g, '""')}"`,
        `"${d.apellidos.replace(/"/g, '""')}"`,
        `"${d.fechaNac}"`,
        `"${d.edadMeses}"`,
        `"${d.rangoEdad}"`,
        `"${d.sectorNombre.replace(/"/g, '""')}"`,
        `"${d.responsableNombre.replace(/"/g, '""')}"`,
        `"${d.responsableCelular}"`
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
    
    const filename = `Padron_Nominal_Ninos_${muniName || "Municipal"}_${new Date().toISOString().split("T")[0]}.csv`;
    
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
          <h1>Reporte Operativo</h1>
          <p>Métricas operativas del Padrón Nominal, distribución por edades y cobertura de consejería brindada.</p>
        </div>
        <div className="breadcrumb-card">
          <span>⌂</span>
          <span>Inicio</span>
          <span>Reportes</span>
          <strong>Operativos</strong>
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
          <div className="loading-spinner">Cargando reporte operativo...</div>
        </div>
      ) : error ? (
        <p className="alert alert-error">{error}</p>
      ) : reportData ? (
        <>
          {/* KPI CARDS */}
          <div className="reports-kpi-grid">
            <div className="kpi-card-custom indigo">
              <div className="kpi-card-header">
                <span>Padrón de Niños</span>
                <LuSmile className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.totalNinos}</div>
              <div className="kpi-card-desc">Total niños menores de 1 año</div>
            </div>

            <div className="kpi-card-custom purple">
              <div className="kpi-card-header">
                <span>Periodo 0-5 meses</span>
                <LuFileText className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.ninos0a5}</div>
              <div className="kpi-card-desc">
                {reportData.summary.totalNinos > 0 
                  ? `${((reportData.summary.ninos0a5 / reportData.summary.totalNinos) * 100).toFixed(1)}%` 
                  : "0%"}{" "}
                del total de niños
              </div>
            </div>

            <div className="kpi-card-custom blue">
              <div className="kpi-card-header">
                <span>Periodo 6-12 meses</span>
                <LuCompass className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.ninos6a12}</div>
              <div className="kpi-card-desc">
                {reportData.summary.totalNinos > 0 
                  ? `${((reportData.summary.ninos6a12 / reportData.summary.totalNinos) * 100).toFixed(1)}%` 
                  : "0%"}{" "}
                del total de niños
              </div>
            </div>

            <div className="kpi-card-custom orange">
              <div className="kpi-card-header">
                <span>Responsables</span>
                <LuPhone className="kpi-icon" />
              </div>
              <div className="kpi-card-value">{reportData.summary.totalResponsables}</div>
              <div className="kpi-card-desc">Madres o tutores únicos</div>
            </div>

            <div className="kpi-card-custom primary-gradient text-white">
              <div className="kpi-card-header">
                <span className="text-white-muted">Cobertura Consejería</span>
                <LuShieldAlert className="kpi-icon text-white" />
              </div>
              <div className="kpi-card-value text-white">{reportData.summary.porcentajeConsejeria}%</div>
              <div className="progress-container-custom">
                <div 
                  className="progress-bar-custom" 
                  style={{ width: `${reportData.summary.porcentajeConsejeria}%` }}
                ></div>
              </div>
              <div className="kpi-card-desc text-white-muted">
                {reportData.summary.totalConsejeria} de {reportData.summary.totalVisitasEjecutadas} visitas
              </div>
            </div>
          </div>

          {/* DESEMPEÑO POR SECTOR */}
          <section className="admin-content-card" style={{ marginTop: "1.5rem" }}>
            <div className="admin-card-toolbar">
              <div>
                <h2>Desglose Operativo por Sector</h2>
                <p>Estadísticas del Padrón Nominal y consejerías registradas según sector o centro poblado.</p>
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
                  <span>Exportar Padrón Nominal (CSV)</span>
                </button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Sector / Comunidad</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "center" }}>Total Niños</th>
                    <th style={{ textAlign: "center" }}>0-5 meses</th>
                    <th style={{ textAlign: "center" }}>6-12 meses</th>
                    <th style={{ textAlign: "center" }}>Visitas Ejecutadas</th>
                    <th style={{ textAlign: "center" }}>Consejerías</th>
                    <th style={{ textAlign: "right" }}>% Consejería</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.sectores.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
                        No hay sectores registrados con datos.
                      </td>
                    </tr>
                  ) : (
                    reportData.sectores.map((sec) => (
                      <tr key={sec.sectorId}>
                        <td>{sec.codigo}</td>
                        <td>
                          <strong>{sec.nombre}</strong>
                        </td>
                        <td>
                          <span className={`status-pill ${sec.tipoSector === "URBANO" ? "is-active" : "is-pending"}`}>
                            {sec.tipoSector}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>{sec.totalNinos}</td>
                        <td style={{ textAlign: "center" }}>{sec.ninos0a5}</td>
                        <td style={{ textAlign: "center" }}>{sec.ninos6a12}</td>
                        <td style={{ textAlign: "center" }}>{sec.visitasEjecutadas}</td>
                        <td style={{ textAlign: "center" }}>{sec.consejeriaBrindada}</td>
                        <td style={{ textAlign: "right" }}>
                          <span 
                            className={`status-pill ${
                              sec.porcentajeConsejeria >= 80 
                                ? "is-active" 
                                : sec.porcentajeConsejeria >= 50 
                                ? "is-pending" 
                                : "is-suspended"
                            }`}
                            style={{ fontWeight: "bold" }}
                          >
                            {sec.porcentajeConsejeria}%
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
          <LuSmile style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }} />
          <p>No se encontraron datos para generar el reporte con los filtros seleccionados.</p>
        </div>
      )}
    </>
  );
}
