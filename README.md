# Visitas Domiciliarias

Este es un monorepo administrado con **pnpm** que contiene el backend y frontend para la aplicación de Visitas Domiciliarias.

## Requisitos Previos

- **Node.js**: `>= 24.0.0`
- **pnpm**: `>= 10.0.0`
- **Docker** y **Docker Compose** (opcional, para base de datos y despliegue rápido)

---

## Estructura del Monorepo

- `apps/api`: Servidor Express (Backend) con Prisma ORM.
- `apps/web`: Aplicación frontend en Vite.
- `packages/shared`: Código y tipos compartidos entre frontend y backend (si aplica).

---

## Configuración Inicial

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Configurar variables de entorno**:
   Copia el archivo `.env.example` a un archivo `.env` en la raíz del proyecto y ajusta los valores según corresponda:
   ```bash
   cp .env.example .env
   ```

3. **Generar el Cliente de Prisma**:
   Antes de compilar o correr el backend, es **indispensable** generar el cliente de Prisma para que TypeScript reconozca los tipos de la base de datos:
   ```bash
   pnpm db:generate
   ```

---

## Compilación y Verificación de Tipos

Para compilar y verificar el código TypeScript de todo el proyecto:

- **Verificar tipos en todo el monorepo**:
   ```bash
   pnpm typecheck
   ```

- **Compilar todo el monorepo**:
   ```bash
   pnpm build
   ```

- **Compilar solo el backend (API)**:
   ```bash
   pnpm --filter @visitas/api build
   ```

- **Compilar solo el frontend (Web)**:
   ```bash
   pnpm --filter @visitas/web build
   ```

---

## Desarrollo Local (Fuera de Docker)

Si prefieres correr los servicios localmente en tu máquina (asegúrate de tener una base de datos PostgreSQL activa y configurada en tu `.env`):

- **Iniciar todo en paralelo** (Backend + Frontend):
   ```bash
   pnpm dev
   ```

- **Iniciar solo el Backend (API)**:
   ```bash
   pnpm dev:api
   ```

- **Iniciar solo el Frontend (Web)**:
   ```bash
   pnpm dev:web
   ```

---

## Desarrollo con Docker Compose (Recomendado)

Docker Compose levantará la base de datos PostgreSQL, el Backend y el Frontend automáticamente.

1. **Iniciar todos los servicios**:
   ```bash
   docker compose up --build
   ```

2. **Ver logs de los servicios**:
   ```bash
   # Ver logs de todo
   docker compose logs -f

   # Ver logs únicamente del backend
   docker compose logs -f api
   ```

3. **Detener servicios**:
   ```bash
   docker compose down
   ```

---

## Comandos Útiles de la Base de Datos

- **Generar cliente de Prisma**: `pnpm db:generate`
- **Ejecutar migraciones en desarrollo**: `pnpm db:migrate`
- **Abrir Prisma Studio (visor de base de datos)**: `pnpm db:studio`
