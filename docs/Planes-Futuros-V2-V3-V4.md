# Planificación de Fases Futuras: V2, V3 y V4

Este documento describe a nivel conceptual y de alto nivel las siguientes fases del sistema de **Visitas Domiciliarias**, permitiendo guiar los futuros desarrollos una vez finalizada y consolidada la Fase V1.

---

## Fase V2: Asignación Territorial y Flujo de Eliminación Lógica

### Objetivo
Habilitar la distribución geográfica del trabajo a nivel de sectores y manzanas para los actores sociales, e implementar políticas formales de eliminación de datos históricos.

### Componentes Clave
1. **Asignación de Sectores y Manzanas**:
   - Módulo de asignación para relacionar un actor social con uno o más sectores (urbanos/rurales) y manzanas censales específicas.
   - Restricciones para evitar superposición indebida de actores sociales en el mismo territorio.
2. **Flujo de Eliminación Lógica Aprobada**:
   - Habilitar el flujo real de bajas para miembros administrativos y actores sociales:
     - El usuario solicita la baja e ingresa un motivo obligatorio.
     - El registro entra en estado pendiente de aprobación y se marca `deleted_at = now()`, `archivado = true`.
     - El Administrador Municipal evalúa la solicitud y aprueba o rechaza la baja definitiva.
3. **Control de Historial**:
   - Registro de movimientos históricos de asignaciones territoriales para auditoría de campo.

---

## Fase V3: Gestión de Niños y Programación de Visitas Domiciliarias

### Objetivo
Incorporar el núcleo del negocio: la gestión de los niños menores de 1 año (eje central del seguimiento) y la ejecución física de las visitas de campo.

### Componentes Clave
1. **Padrón Nominal y Registro de Niños**:
   - CRUD de Niños y Madres/Responsables.
   - Datos geográficos detallados de residencia (incluyendo puntos de referencia).
2. **Asignación de Niños a Actores Sociales**:
   - Algoritmo de distribución automática o manual de niños a los actores asignados a la misma manzana/sector.
   - Historial y justificaciones de re-asignaciones entre actores.
3. **Módulo de Visitas**:
   - **Programación de Visitas**: Calendario y agenda sugerida de visitas basada en la edad del niño (0-5 meses y 6-12 meses).
   - **Ejecución (Intervención)**: Registro en campo de datos médicos/alimenticios, peso, suplementos de hierro, consejería a la madre, y alertas sanitarias.
   - **Seguimiento**: Evaluaciones posteriores y reporte de visitas inconclusas o reprogramadas.
4. **Panel Móvil del Actor Social**:
   - Interfaz simplificada y optimizada para dispositivos móviles orientada al actor de campo para registrar visitas in situ.

---

## Fase V4: Reportes Avanzados, Actas y Módulo de Auditoría

### Objetivo
Cerrar el ciclo con análisis de desempeño y coberturas de metas, además de formalización de grupos mediante documentación legal y firmas.

### Componentes Clave
1. **Actas de Conformación y Documentos Firmados**:
   - Generación de PDF de las actas de conformación del grupo de trabajo y su junta directiva.
   - Carga de actas firmadas digitalmente o escaneadas como requisito para la validación definitiva del grupo de trabajo por el Administrador General.
2. **Módulo de Reportes e Indicadores**:
   - Dashboard analítico con indicadores clave de rendimiento (KPIs), porcentaje de cobertura, visitas programadas vs ejecutadas, y avance del padrón nominal por sector/municipalidad.
   - Exportación de datos a Excel/PDF para reportes externos ante ministerios u otras entidades.
3. **Auditoría Avanzada**:
   - Registro detallado de logs de actividad (`Quién hizo qué y cuándo`) para todas las acciones sobre registros críticos.
4. **Notificaciones en Tiempo Real**:
   - Alertas para actores sociales sobre visitas pendientes y alertas a administradores municipales sobre reasignaciones pendientes o indicadores fuera de meta.
