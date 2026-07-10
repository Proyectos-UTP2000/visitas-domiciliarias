import { useEffect, useState, useMemo } from "react";
import { 
  LuFilter, 
  LuDownload, 
  LuSmile, 
  LuFileText, 
  LuShieldAlert,
  LuCompass,
  LuPhone,
  LuSearch,
  LuChevronLeft,
  LuChevronRight,
  LuFolder,
  LuList
} from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import { listSectores } from "../../sectores/sectores-api";
import { getReporteOperativo } from "../reportes-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import type { SectorRecord } from "../../sectores/sectores-types";
import type { ReporteOperativoData } from "../reportes-types";
import "../reportes.css";

// Donut Chart SVG premium hecho en casa
function DonutChart({ value, total, color, label, subtitle }: { value: number; total: number; color: string; label: string; subtitle?: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="donut-chart-container">
      <div className="donut-svg-wrap">
        <svg viewBox="0 0 100 100" className="donut-svg">
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--border)" strokeWidth="7" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="donut-progress-circle"
            style={{ stroke: color }}
          />
        </svg>
        <div className="donut-text-overlay">
          <span className="donut-percentage">{Math.round(percentage)}%</span>
          {subtitle && <span className="donut-subtitle">{subtitle}</span>}
        </div>
      </div>
      <div className="donut-info">
        <span className="donut-label">{label}</span>
        <span className="donut-value">{value} de {total}</span>
      </div>
    </div>
  );
}

export function ReporteOperativosPage() {
  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  
  // Data lists
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [sectores, setSectores] = useState<SectorRecord[]>([]);
  
  // Filters
  const [muniFilter, setMuniFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [showFilters, setShowFilters] = useState(true);

  // Tab view selection
  const [activeTab, setActiveTab] = useState<"resumen" | "padron">("resumen");

  // Local search and page for detailed Padron Nominal
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
      setCurrentPage(1); // Reset page on new data
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

  // Local filtering for detailed Padron Nominal
  const filteredPadron = useMemo(() => {
    if (!reportData) return [];
    if (!searchQuery.trim()) return reportData.detalles;
    const lowerQuery = searchQuery.toLowerCase();
    return reportData.detalles.filter(
      (d) =>
        d.dni.includes(lowerQuery) ||
        d.cnv.includes(lowerQuery) ||
        d.nombres.toLowerCase().includes(lowerQuery) ||
        d.apellidos.toLowerCase().includes(lowerQuery) ||
        d.sectorNombre.toLowerCase().includes(lowerQuery) ||
        d.responsableNombre.toLowerCase().includes(lowerQuery)
    );
  }, [reportData, searchQuery]);

  // Paged padron
  const pagedPadron = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPadron.slice(start, start + itemsPerPage);
  }, [filteredPadron, currentPage]);

  const totalPages = Math.ceil(filteredPadron.length / itemsPerPage);

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

    const csvContent = "\uFEFF" + csvRows.join("\n");
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
      <section className="admin-page-heading animate-fade-in">
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
      <section className="admin-content-card filter-section card-premium">
        <div className="filter-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filter-title">
            <LuFilter className="pulse-icon" />
            <span>Filtros de Reporte</span>
          </div>
          <button className="admin-button is-ghost size-sm">
            {showFilters ? "Ocultar filtros" : "Mostrar filtros"}
          </button>
        </div>

        {showFilters && (
          <div className="filter-grid" style={{ marginTop: "1.25rem" }}>
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
                style={{ width: "100%", fontWeight: "600" }}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        )}
      </section>

      {user?.rol === "ADMIN_GENERAL" && !muniFilter ? (
        <section className="admin-page-heading admin-empty-state card-premium">
          <div>
            <p className="eyebrow">ADMIN GENERAL</p>
            <h1>Selecciona una Municipalidad</h1>
            <p>Debes seleccionar una municipalidad para poder visualizar las métricas y reportes operativos.</p>
          </div>
        </section>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <div className="loading-spinner">Generando reporte operativo...</div>
        </div>
      ) : error ? (
        <p className="alert alert-error">{error}</p>
      ) : reportData ? (
        <>
          {/* KPI CARDS & DONUT DIAGRAMS */}
          <div className="kpi-and-charts-layout">
            <div className="reports-kpi-grid" style={{ flex: 3 }}>
              <div className="kpi-card-custom indigo border-gradient">
                <div className="kpi-card-header">
                  <span>Padrón de Niños</span>
                  <LuSmile className="kpi-icon" />
                </div>
                <div className="kpi-card-value">{reportData.summary.totalNinos}</div>
                <div className="kpi-card-desc">Total niños menores de 1 año</div>
              </div>

              <div className="kpi-card-custom purple border-gradient">
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

              <div className="kpi-card-custom blue border-gradient">
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

              <div className="kpi-card-custom orange border-gradient">
                <div className="kpi-card-header">
                  <span>Responsables</span>
                  <LuPhone className="kpi-icon" />
                </div>
                <div className="kpi-card-value">{reportData.summary.totalResponsables}</div>
                <div className="kpi-card-desc">Madres o tutores únicos</div>
              </div>
            </div>

            <div className="chart-card-premium" style={{ flex: 1.2 }}>
              <DonutChart 
                value={reportData.summary.totalConsejeria} 
                total={reportData.summary.totalVisitasEjecutadas} 
                color="var(--primary)" 
                label="Cobertura de Consejería"
                subtitle="brindada"
              />
            </div>
          </div>

          {/* VISTAS DE PESTAÑAS (TABS) */}
          <div className="tabs-navigation-container">
            <button
              className={`tab-btn ${activeTab === "resumen" ? "is-active" : ""}`}
              onClick={() => setActiveTab("resumen")}
            >
              <LuFolder />
              <span>Resumen por Sector</span>
            </button>
            <button
              className={`tab-btn ${activeTab === "padron" ? "is-active" : ""}`}
              onClick={() => setActiveTab("padron")}
            >
              <LuList />
              <span>Padrón Nominal ({reportData.detalles.length})</span>
            </button>
          </div>

          {activeTab === "resumen" ? (
            /* DESEMPEÑO POR SECTOR */
            <section className="admin-content-card card-premium animate-fade-in" style={{ marginTop: "1rem" }}>
              <div className="admin-card-toolbar">
                <div>
                  <h2>Desglose Operativo por Sector</h2>
                  <p>Estadísticas demográficas de niños y cobertura de consejerías por sector/comunidad.</p>
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
                        <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                          No hay sectores registrados con datos demográficos.
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
                              style={{ fontWeight: "800" }}
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
          ) : (
            /* PADRÓN NOMINAL DETALLADO CON BUSCADOR Y PAGINACIÓN */
            <section className="admin-content-card card-premium animate-fade-in" style={{ marginTop: "1rem" }}>
              <div className="admin-card-toolbar" style={{ flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <h2>Detalle del Padrón Nominal</h2>
                  <p>Consulta el listado completo de los niños menores de 1 año registrados en la municipalidad.</p>
                </div>
                
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div className="search-box-custom">
                    <LuSearch className="search-icon-custom" />
                    <input
                      type="text"
                      placeholder="Buscar por DNI, CNV, niño, sector..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="search-input-custom"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={exportToCSV}
                    disabled={reportData.detalles.length === 0}
                    className="admin-button is-primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <LuDownload />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>DNI / CNV</th>
                      <th>Niño</th>
                      <th>Fecha Nac.</th>
                      <th style={{ textAlign: "center" }}>Edad</th>
                      <th>Rango</th>
                      <th>Sector / Comunidad</th>
                      <th>Responsable (Madre/Tutor)</th>
                      <th>Celular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPadron.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: "var(--muted)" }}>
                          No se encontraron niños que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      pagedPadron.map((det) => (
                        <tr key={det.id}>
                          <td>
                            {det.dni ? (
                              <span className="status-pill is-active">DNI: {det.dni}</span>
                            ) : (
                              <span className="status-pill is-pending">CNV: {det.cnv}</span>
                            )}
                          </td>
                          <td>
                            <strong>{det.apellidos}, {det.nombres}</strong>
                          </td>
                          <td>{det.fechaNac}</td>
                          <td style={{ textAlign: "center" }}>
                            <strong>{det.edadMeses} meses</strong>
                          </td>
                          <td>
                            <span 
                              className={`status-pill ${
                                det.rangoEdad.includes("0 a 5") ? "is-active" : "is-pending"
                              }`}
                            >
                              {det.rangoEdad}
                            </span>
                          </td>
                          <td>{det.sectorNombre}</td>
                          <td>{det.responsableNombre}</td>
                          <td>
                            {det.responsableCelular ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                <LuPhone style={{ fontSize: "0.75rem", color: "var(--muted)" }} />
                                {det.responsableCelular}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="pagination-container-custom">
                  <span className="pagination-info">
                    Mostrando {Math.min(filteredPadron.length, (currentPage - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredPadron.length, currentPage * itemsPerPage)} de {filteredPadron.length} niños
                  </span>
                  <div className="pagination-buttons">
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <LuChevronLeft />
                      <span>Anterior</span>
                    </button>
                    <span className="pagination-page-indicator">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <span>Siguiente</span>
                      <LuChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }} className="card-premium">
          <LuSmile style={{ fontSize: "3.5rem", marginBottom: "1rem", opacity: 0.4 }} />
          <p>No se encontraron datos para generar el reporte con los filtros seleccionados.</p>
        </div>
      )}
    </>
  );
}
