const moduleRows = [
  ["Configuración", "Municipalidades, entidad y tipo actor social", "V1 base"],
  ["Grupo de Trabajo", "Conformación de grupo de trabajo", "V1 base"],
  ["Sectorización", "Sector urbano y sector rural", "V1 base"],
  ["Actores Sociales", "Registro de actores sociales", "V1 base"],
  ["Niños", "Panel de visitas", "Futuro"],
  ["Reportes", "Reporte actividad y reportes operativos", "Futuro"],
];

export function DashboardHomePage() {
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Panel administrativo</h1>
          <p>
            Gestiona la configuración, la conformación territorial y los actores
            sociales desde una navegación superior agrupada por dominio.
          </p>
        </div>
        <div className="breadcrumb-card" aria-label="Ruta actual">
          <span aria-hidden="true">⌂</span>
          <span>Inicio</span>
          <strong>Panel administrativo</strong>
        </div>
      </section>

      <section className="admin-content-card" aria-label="Resumen de módulos">
        <div className="admin-card-toolbar">
          <div>
            <h2>Módulos previstos</h2>
            <p>Vista de referencia para las próximas tablas y formularios V1.</p>
          </div>
          <span className="status-pill is-active">Sesión activa</span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Grupo</th>
                <th>Alcance</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map(([group, scope, status]) => (
                <tr key={group}>
                  <td>{group}</td>
                  <td>{scope}</td>
                  <td>
                    <span
                      className={
                        status === "Futuro"
                          ? "status-pill is-muted"
                          : "status-pill is-active"
                      }
                    >
                      {status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
