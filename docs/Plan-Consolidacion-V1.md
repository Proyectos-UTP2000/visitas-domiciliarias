# Plan de Implementación: Consolidación de la Fase V1

Este documento detalla el plan paso a paso para consolidar la Fase V1 del sistema de **Visitas Domiciliarias**, incorporando las validaciones de DNI único, edición de conformación de grupo de trabajo en estado borrador, carga de archivos adjuntos (PDFs), aislamiento multi-municipal para `ADMIN_MUNICIPAL` e integración de la API externa de DNI.

---

## Tarea 1: Validación de DNI Único en Grupo de Trabajo

### Objetivo
Evitar que el DNI del representante se registre en múltiples grupos de trabajo para el mismo periodo/año y municipalidad.

### Cambios en Backend
1. **Modificación de Service (`grupos-trabajo.service.ts`)**:
   - En `createGrupo`, antes de llamar al repositorio, consultar si existe un grupo de trabajo con el mismo `dniRepresentante` y `periodoYear` dentro de la misma municipalidad.
   - En `updateGrupo` (nuevo método de actualización), aplicar la misma validación excluyendo el ID del grupo actual.
   - Si existe una coincidencia, lanzar un `HttpError(400, "El DNI del representante ya está registrado para este periodo en la municipalidad")`.
2. **Pruebas Unitarias (`grupos-trabajo.service.test.ts`)**:
   - Crear un caso de prueba que simule la existencia de un representante y verifique que lanza un error.
   - Verificar que permite crear si el DNI pertenece a otro periodo o a otra municipalidad.

---

## Tarea 2: Edición de Información General de Grupo de Trabajo (Estado Borrador)

### Objetivo
Permitir la modificación de los datos del grupo (fecha límite, representante, período, etc.) únicamente mientras su estado sea `BORRADOR`.

### Cambios en Backend
1. **Ruta (`grupos-trabajo.routes.ts`)**:
   - Registrar la ruta `PUT /api/v1/grupos-trabajo/:id`.
   - Validar el body usando el esquema de validación correspondiente.
2. **Servicio (`grupos-trabajo.service.ts`)**:
   - Implementar el método `updateGrupo(id, input)`.
   - Obtener el grupo actual de la base de datos y verificar su estado:
     ```typescript
     if (grupo.estado !== "BORRADOR") {
       throw new HttpError(400, "Solo se pueden editar grupos de trabajo en estado borrador");
     }
     ```
   - Aplicar la validación de DNI único del representante.
   - Guardar los cambios mediante el repositorio.

### Cambios en Frontend
1. **Pantalla de Detalle (`GrupoDetailPage.tsx`)**:
   - Renderizar botones de "Editar" en los bloques de información general.
   - Habilitar los campos y el formulario de edición solo si `grupo.estado === "BORRADOR"`.
   - Implementar la llamada a la API `PUT /grupos-trabajo/:id` para guardar cambios.

---

## Tarea 3: Subida de Archivos Adjuntos (PDF, etc.) en Grupo de Trabajo

### Objetivo
Permitir a los usuarios cargar y descargar actas o documentos en formato PDF y otros tipos de archivo, asociados a un grupo de trabajo, únicamente en estado `BORRADOR`.

### Cambios en Base de Datos
1. **Prisma Schema (`schema.prisma`)**:
   - Definir el modelo `GrupoTrabajoArchivo` para almacenar la metadata de los archivos cargados:
     ```prisma
     model GrupoTrabajoArchivo {
       id             String   @id @default(uuid()) @db.Uuid
       grupoTrabajoId String   @map("grupo_trabajo_id") @db.Uuid
       nombreArchivo  String   @map("nombre_archivo") @db.VarChar(255)
       rutaArchivo    String   @map("ruta_archivo") @db.Text
       mimeType       String   @map("mime_type") @db.VarChar(100)
       createdAt      DateTime @default(now()) @map("created_at")

       grupoTrabajo   GrupoTrabajo @relation(fields: [grupoTrabajoId], references: [id], onDelete: Cascade)

       @@map("grupo_trabajo_archivo")
     }
     ```
   - Añadir la relación `archivos GrupoTrabajoArchivo[]` en el modelo `GrupoTrabajo`.
2. **Migración**:
   - Ejecutar `pnpm db:migrate` para crear la tabla en PostgreSQL.

### Cambios en Backend
1. **Instalación de Dependencias**:
   - Instalar `multer` y `@types/multer` para el procesamiento multipart/form-data.
2. **Endpoints**:
   - `POST /api/v1/grupos-trabajo/:id/archivos`:
     - Validar que el grupo esté en estado `BORRADOR`.
     - Utilizar `multer` para guardar el archivo en un directorio local configurable (e.g. `apps/api/uploads/`, ignorado en git).
     - Guardar la metadata en la tabla `grupo_trabajo_archivo`.
   - `GET /api/v1/grupos-trabajo/:id/archivos`: Listar todos los archivos asociados.
   - `GET /api/v1/grupos-trabajo/archivos/:archivoId`: Endpoint de descarga del archivo físico.
   - `DELETE /api/v1/grupos-trabajo/:id/archivos/:archivoId`: Eliminar archivo adjunto (solo en estado `BORRADOR`).

### Cambios en Frontend
1. **Pantalla de Detalle (`GrupoDetailPage.tsx`)**:
   - Añadir una sección de "Documentos Adjuntos".
   - Integrar un control de subida de archivos (input file o drag and drop) que acepte formatos comunes (principalmente PDF).
   - Ocultar/deshabilitar los controles de subida y eliminación de archivos si el estado del grupo no es `BORRADOR`.
   - Listar los archivos subidos con enlace de descarga.

---

## Tarea 4: Control de Acceso y Aislamiento por Municipalidad

### Objetivo
Garantizar que un `ADMIN_MUNICIPAL` solo pueda ver y modificar grupos de trabajo correspondientes a su municipalidad, mientras que un `ADMIN_GENERAL` tenga visibilidad y control global.

### Cambios en Backend
1. **Rutas (`grupos-trabajo.routes.ts`)**:
   - En `GET /`, recuperar el rol y `municipalidadId` del token JWT (`req.auth`).
   - Si es `ADMIN_MUNICIPAL`, forzar el filtrado pasando el `municipalidadId` al servicio.
   - Si es `ADMIN_GENERAL`, permitir listar todo o filtrar por el query parameter `?municipalidadId=...`.
   - En `POST /` y `PUT /:id`, realizar una validación de autorización:
     ```typescript
     if (rol === "ADMIN_MUNICIPAL" && payload.municipalidadId !== municipalidadId) {
       res.status(403).json({ message: "No tiene permiso para realizar operaciones en otra municipalidad" });
       return;
     }
     ```
   - Aplicar el mismo chequeo para las rutas de miembros y establecimientos del grupo.
2. **Servicio y Repositorio**:
   - Modificar `list` para recibir opcionalmente `municipalidadId` y filtrar las entidades usando Prisma.

---

## Tarea 5: Integración de API DNI para Autocompletado

### Objetivo
Consultar el servicio externo de DNI para rellenar de forma automática nombres, apellidos, dirección y ubigeo.

### Configuración del Entorno
1. **Variables `.env` y `.env.example`**:
   - Registrar `DNI_API_URL=https://miapi.cloud/v1/dni/`
   - Registrar `DNI_API_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo0MDYsImV4cCI6MTc2Mzc4NjU4N30.mCthamubrKmkP7sQcieZo3YJM9vawV7ANvUnEMCQG8k`

### Cambios en Backend
1. **Ruta y Controlador (`dni.routes.ts`)**:
   - Crear un módulo `dni` en el backend.
   - Registrar la ruta `GET /api/v1/dni/:dni`.
   - Validar que el DNI tenga formato de 8 dígitos numéricos.
   - Consumir el endpoint externo pasando el token Bearer en las cabeceras de autorización.
   - Manejar errores de conectividad o respuesta del servicio y retornar una respuesta unificada al frontend.

### Cambios en Frontend
1. **Integración en Formularios**:
   - Añadir un botón "Consultar DNI" al lado de los campos de DNI en:
     - Formulario de creación/edición de Grupo de Trabajo (DNI del representante).
     - Formulario de Miembros de Grupo de Trabajo (DNI de miembros).
     - Formulario de Actores Sociales (DNI del actor social).
   - Al pulsar el botón, llamar a la API del backend, y en caso de éxito, autocompletar los campos correspondientes a Nombres, Apellidos y otros datos geográficos disponibles.
