const v1Modules = [
  "Autenticación",
  "Municipalidades",
  "Entidades",
  "Tipos de actor social",
  "Cargos de miembro de grupo",
  "Grupos de trabajo",
  "Establecimientos",
  "Miembros del grupo",
  "Sectores",
  "Actores sociales"
];

export function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <p className="eyebrow">V1 administrativa</p>
        <h1>Visitas Domiciliarias</h1>
        <p>
          Base inicial para gestionar municipalidades, grupos de trabajo,
          sectores y actores sociales, respetando alcance municipal desde el
          backend.
        </p>
      </section>

      <section className="module-card">
        <h2>Módulos V1 documentados</h2>
        <ul>
          {v1Modules.map((module) => (
            <li key={module}>{module}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
