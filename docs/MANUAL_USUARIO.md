# Manual de Usuario y Roles

Este manual proporciona instrucciones paso a paso para los diferentes perfiles que operan el sistema de **Visitas Domiciliarias**.

---

## 1. Perfiles y Credenciales Iniciales

El sistema soporta cinco niveles de acceso. Para desarrollo y pruebas locales, puedes consultar la lista completa de usuarios y contraseñas de demostración en el archivo [Users.md](file:///home/rvelasco/Proyectos/visitas-domiciliarias/docs/Users.md).

> [!NOTE]
> La contraseña por defecto para todas las cuentas de demostración (excepto el administrador general) es `password123`.

---

## 2. Guía para el Administrador General (`ADMIN_GENERAL`)

El Administrador General controla el sistema completo de forma global y no interviene en la operación diaria local de las municipalidades.

### Acciones Principales:
1. **Configuración de Municipalidades:**
   - Registrar nuevas municipalidades definiendo su Ubigeo, Código de tres letras, Nombre oficial, Tipo (Provincial o Distrital) y Prioridad.
2. **Gestión de Catálogos base:**
   - Crear y mantener **Entidades** (como establecimientos de salud de referencia, ONGs, etc.).
   - Modificar las tarifas urbana/rural de los **Tipos de Actor Social**.
   - Crear los cargos oficiales para los miembros de los Grupos de Trabajo (ej. Presidente, Secretario, Vocal).

---

## 3. Guía para el Administrador Municipal (`ADMIN_MUNICIPAL`)

El Administrador Municipal es el encargado de coordinar, aprobar y supervisar todo el despliegue territorial en su jurisdicción local (`municipalidadId`).

### Flujo de Trabajo Operativo:

#### Paso A: Aprobación del Grupo de Trabajo (Conformación)
1. Ve al panel de **Grupo de Trabajo**.
2. Identifica las conformaciones que han sido enviadas (estado `REGISTRADO`).
3. Revisa la lista de personal administrativo (Miembros) y los establecimientos asignados. Descarga el PDF del acta si está adjunto.
4. Selecciona **Validar** (para habilitar el grupo operativamente) u **Observar / Rechazar** (para devolver el grupo al estado `BORRADOR` con comentarios correctivos).

#### Paso B: Configuración de Sectores
1. Accede al menú de **Sectores**.
2. Crea un nuevo sector seleccionando la clasificación:
   - **Urbano:** Ingresa la Zona (3 dígitos) y Manzana.
   - **Rural:** Ingresa las Coordenadas Geográficas (Latitud y Longitud) y la Población estimada.
3. El sistema validará automáticamente que no se mezclen datos urbanos con rurales.

#### Paso C: Registro y Habilitación de Actores Sociales
1. Ve al módulo de **Actores Sociales**.
2. Registra un nuevo Actor Social ingresando sus datos personales (DNI, Nombres, Grado de Instrucción, Idioma).
3. Vincula al actor con el Grupo de Trabajo aprobado y sus correspondientes sectores de cobertura territorial.
4. Al guardar, el sistema le creará automáticamente una cuenta de usuario con el rol `ACTOR_SOCIAL` para que pueda iniciar sesión en el aplicativo móvil.

---

## 4. Guía para el Actor Social (`ACTOR_SOCIAL`)

El Actor Social es el agente de campo que realiza las visitas a los hogares y registra la información del menor y del responsable.

### Operaciones Diarias:

#### Paso 1: Consultar la Agenda de Visitas
- Ingresa al aplicativo con tus credenciales.
- Revisa la lista de visitas `PROGRAMADAS` correspondientes a tu sector de cobertura para la fecha actual.

#### Paso 2: Ejecución y Reporte de Visitas
- En cada domicilio, realiza el control correspondiente y selecciona la visita programada para rellenar los datos del formulario:
  - **Estado:** Marca como **Ejecutada**.
  - **Peso:** Registra el peso en kilogramos medido al menor.
  - **Suplementación:** Confirma si se hizo entrega de las gotas o jarabe de Hierro (`hierro_entregado: true/false`).
  - **Consejería:** Detalla si se brindó la charla sobre lactancia y prevención de anemia.
  - **Alertas y Comentarios:** Escribe notas sobre el estado de salud observado.

#### Paso 3: Qué hacer si el responsable no está (Visita Inconclusa)
- Si no encuentras a la madre/responsable o se niega a recibir la visita, marca el estado de la visita como **Inconclusa**.
- Escribe el motivo del fallo (ej. "Familia de viaje", "Dirección incorrecta").
- El sistema automáticamente programará una nueva visita en tu agenda y marcará la anterior como **Reprogramada**.
