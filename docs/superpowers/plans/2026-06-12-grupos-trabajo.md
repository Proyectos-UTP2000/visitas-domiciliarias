# Grupos de Trabajo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the frontend module for managing Grupos de Trabajo (`features/grupos-trabajo`), including list view, group creation, detail layout, establishment management, and member administration.

**Architecture:** Create modular, domain-specific files under `features/grupos-trabajo/` using React + TypeScript, following the styling conventions of previously completed modules. All data calculations and filters will be local and tested using unit tests.

**Tech Stack:** React 19, TypeScript, Vitest, CSS Variables.

---

### Task 1: Type Definitions (`grupos-types.ts`)

**Files:**
- Create: `apps/web/src/features/grupos-trabajo/grupos-types.ts`

- [ ] **Step 1: Write type definitions**
  Create the types file that mirrors the database schema and defines form state objects:
  ```typescript
  export type EstadoGrupoTrabajo = "BORRADOR" | "REGISTRADO" | "OBSERVADO" | "VALIDADO";

  export type GrupoTrabajoRecord = {
    id: string;
    municipalidadId: string;
    fechaLimite: string;
    nombreGrupo: string;
    periodoYear: number;
    dniRepresentante: string;
    nombreRepresentante: string;
    apellidosRepresentante: string;
    estado: EstadoGrupoTrabajo;
    activo: boolean;
    archivado: boolean;
  };

  export type GrupoEstablecimientoRecord = {
    id: string;
    grupoTrabajoId: string;
    nombre: string;
    codigo: string | null;
    direccion: string | null;
    activo: boolean;
  };

  export type MiembroGrupoRecord = {
    id: string;
    grupoTrabajoId: string;
    grupoEstablecimientoId: string | null;
    cargoMiembroGrupoId: string;
    dni: string;
    nombres: string;
    apellidos: string;
    celular: string | null;
    email: string | null;
    activo: boolean;
    archivado: boolean;
    cargoMiembroGrupo?: {
      id: string;
      nombre: string;
    } | null;
    grupoEstablecimiento?: {
      id: string;
      nombre: string;
    } | null;
  };

  export type GrupoTrabajoFormState = {
    municipalidadId: string;
    fechaLimite: string;
    nombreGrupo: string;
    periodoYear: string;
    dniRepresentante: string;
    nombreRepresentante: string;
    apellidosRepresentante: string;
  };

  export type GrupoEstablecimientoFormState = {
    nombre: string;
    codigo: string;
    direccion: string;
  };

  export type MiembroGrupoFormState = {
    grupoEstablecimientoId: string;
    cargoMiembroGrupoId: string;
    dni: string;
    nombres: string;
    apellidos: string;
    celular: string;
    email: string;
  };
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/grupos-trabajo/grupos-types.ts
  git commit -m "feat(grupos): add TypeScript types for Grupos de Trabajo"
  ```

---

### Task 2: API Client Integration (`grupos-api.ts`)

**Files:**
- Create: `apps/web/src/features/grupos-trabajo/grupos-api.ts`

- [ ] **Step 1: Write API wrapper functions**
  Implement API calls referencing `apiRequest` from `shared/api`:
  ```typescript
  import { apiRequest } from "../../shared/api";
  import type {
    GrupoEstablecimientoRecord,
    GrupoTrabajoRecord,
    MiembroGrupoRecord,
  } from "./grupos-types";

  const BASE_ENDPOINT = "/grupos-trabajo";

  export function listGrupos(): Promise<GrupoTrabajoRecord[]> {
    return apiRequest<GrupoTrabajoRecord[]>(BASE_ENDPOINT);
  }

  export function createGrupo(
    payload: Omit<GrupoTrabajoRecord, "id" | "estado" | "activo" | "archivado">,
  ): Promise<GrupoTrabajoRecord> {
    return apiRequest<GrupoTrabajoRecord>(BASE_ENDPOINT, {
      method: "POST",
      body: payload,
    });
  }

  export function createEstablecimiento(
    grupoId: string,
    payload: { nombre: string; codigo?: string | null; direccion?: string | null },
  ): Promise<GrupoEstablecimientoRecord> {
    return apiRequest<GrupoEstablecimientoRecord>(
      `${BASE_ENDPOINT}/${grupoId}/establecimientos`,
      {
        method: "POST",
        body: payload,
      },
    );
  }

  export function createMiembro(
    grupoId: string,
    payload: {
      grupoEstablecimientoId?: string | null;
      cargoMiembroGrupoId: string;
      dni: string;
      nombres: string;
      apellidos: string;
      celular?: string | null;
      email?: string | null;
    },
  ): Promise<MiembroGrupoRecord> {
    return apiRequest<MiembroGrupoRecord>(
      `${BASE_ENDPOINT}/${grupoId}/miembros`,
      {
        method: "POST",
        body: payload,
      },
    );
  }

  export function updateMiembroContacto(
    grupoId: string,
    miembroId: string,
    payload: {
      grupoEstablecimientoId?: string | null;
      celular?: string | null;
      email?: string | null;
    },
  ): Promise<MiembroGrupoRecord> {
    return apiRequest<MiembroGrupoRecord>(
      `${BASE_ENDPOINT}/${grupoId}/miembros/${miembroId}/contacto`,
      {
        method: "PATCH",
        body: payload,
      },
    );
  }

  export function setMiembroActivo(
    grupoId: string,
    miembroId: string,
    activo: boolean,
  ): Promise<MiembroGrupoRecord> {
    return apiRequest<MiembroGrupoRecord>(
      `${BASE_ENDPOINT}/${grupoId}/miembros/${miembroId}/activo`,
      {
        method: "PATCH",
        body: { activo },
      },
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/grupos-trabajo/grupos-api.ts
  git commit -m "feat(grupos): add API client functions for groups, establishments, and members"
  ```

---

### Task 3: Utility and Filter Functions (`grupos-utils.ts` & Tests)

**Files:**
- Create: `apps/web/src/features/grupos-trabajo/grupos-utils.ts`
- Create: `apps/web/src/features/grupos-trabajo/grupos-utils.test.ts`

- [ ] **Step 1: Write failing tests for utility functions**
  ```typescript
  import { describe, expect, it } from "vitest";
  import {
    emptyGrupoForm,
    emptyEstablecimientoForm,
    emptyMiembroForm,
    filterGrupos,
    filterMiembros,
  } from "./grupos-utils";
  import type { GrupoTrabajoRecord, MiembroGrupoRecord } from "./grupos-types";

  const mockGrupos: GrupoTrabajoRecord[] = [
    {
      id: "g-1",
      municipalidadId: "m-1",
      fechaLimite: "2026-12-31",
      nombreGrupo: "Grupo Norte",
      periodoYear: 2026,
      dniRepresentante: "12345678",
      nombreRepresentante: "Juan",
      apellidosRepresentante: "Perez",
      estado: "BORRADOR",
      activo: true,
      archivado: false,
    },
    {
      id: "g-2",
      municipalidadId: "m-2",
      fechaLimite: "2026-06-30",
      nombreGrupo: "Grupo Sur",
      periodoYear: 2025,
      dniRepresentante: "87654321",
      nombreRepresentante: "Maria",
      apellidosRepresentante: "Gomez",
      estado: "VALIDADO",
      activo: true,
      archivado: false,
    },
  ];

  const mockMiembros: MiembroGrupoRecord[] = [
    {
      id: "mi-1",
      grupoTrabajoId: "g-1",
      grupoEstablecimientoId: "est-1",
      cargoMiembroGrupoId: "cargo-president",
      dni: "11111111",
      nombres: "Luis",
      apellidos: "Lujan",
      celular: "999888777",
      email: "luis@mail.com",
      activo: true,
      archivado: false,
    },
    {
      id: "mi-2",
      grupoTrabajoId: "g-1",
      grupoEstablecimientoId: null,
      cargoMiembroGrupoId: "cargo-secretary",
      dni: "22222222",
      nombres: "Ana",
      apellidos: "Alva",
      celular: null,
      email: null,
      activo: false,
      archivado: false,
    },
  ];

  describe("grupos-utils", () => {
    it("returns empty forms", () => {
      expect(emptyGrupoForm).toEqual({
        municipalidadId: "",
        fechaLimite: "",
        nombreGrupo: "",
        periodoYear: "",
        dniRepresentante: "",
        nombreRepresentante: "",
        apellidosRepresentante: "",
      });
      expect(emptyEstablecimientoForm).toEqual({
        nombre: "",
        codigo: "",
        direccion: "",
      });
      expect(emptyMiembroForm).toEqual({
        grupoEstablecimientoId: "",
        cargoMiembroGrupoId: "",
        dni: "",
        nombres: "",
        apellidos: "",
        celular: "",
        email: "",
      });
    });

    it("filters groups by search query, state, period, and municipality", () => {
      expect(filterGrupos(mockGrupos, "Norte")).toHaveLength(1);
      expect(filterGrupos(mockGrupos, "", "VALIDADO")).toHaveLength(1);
      expect(filterGrupos(mockGrupos, "", "", 2025)).toHaveLength(1);
      expect(filterGrupos(mockGrupos, "", "", undefined, "m-1")).toHaveLength(1);
    });

    it("filters members by search query, state, cargo, and establishment", () => {
      expect(filterMiembros(mockMiembros, "Lujan")).toHaveLength(1);
      expect(filterMiembros(mockMiembros, "", "active")).toHaveLength(1);
      expect(filterMiembros(mockMiembros, "", "", "cargo-secretary")).toHaveLength(1);
      expect(filterMiembros(mockMiembros, "", "", "", "est-1")).toHaveLength(1);
    });
  });
  ```

- [ ] **Step 2: Run tests and verify they fail**
  Run: `pnpm --filter @visitas/web test`
  Expected: FAIL (empty exports or unresolved module imports)

- [ ] **Step 3: Implement minimal code in `grupos-utils.ts`**
  ```typescript
  import type {
    GrupoEstablecimientoFormState,
    GrupoTrabajoFormState,
    GrupoTrabajoRecord,
    MiembroGrupoFormState,
    MiembroGrupoRecord,
  } from "./grupos-types";

  export const emptyGrupoForm: GrupoTrabajoFormState = {
    municipalidadId: "",
    fechaLimite: "",
    nombreGrupo: "",
    periodoYear: "",
    dniRepresentante: "",
    nombreRepresentante: "",
    apellidosRepresentante: "",
  };

  export const emptyEstablecimientoForm: GrupoEstablecimientoFormState = {
    nombre: "",
    codigo: "",
    direccion: "",
  };

  export const emptyMiembroForm: MiembroGrupoFormState = {
    grupoEstablecimientoId: "",
    cargoMiembroGrupoId: "",
    dni: "",
    nombres: "",
    apellidos: "",
    celular: "",
    email: "",
  };

  function normalize(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  export function filterGrupos(
    grupos: GrupoTrabajoRecord[],
    query: string,
    estadoFilter?: string,
    periodoFilter?: number,
    muniFilter?: string,
  ): GrupoTrabajoRecord[] {
    let result = grupos;

    if (estadoFilter) {
      result = result.filter((g) => g.estado === estadoFilter);
    }
    if (periodoFilter) {
      result = result.filter((g) => g.periodoYear === periodoFilter);
    }
    if (muniFilter) {
      result = result.filter((g) => g.municipalidadId === muniFilter);
    }

    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return result;

    return result.filter((g) => {
      const haystack = normalize(
        `${g.nombreGrupo} ${g.dniRepresentante} ${g.nombreRepresentante} ${g.apellidosRepresentante}`,
      );
      return terms.every((t) => haystack.includes(t));
    });
  }

  export function filterMiembros(
    miembros: MiembroGrupoRecord[],
    query: string,
    statusFilter?: "active" | "inactive" | "",
    cargoFilter?: string,
    estFilter?: string,
  ): MiembroGrupoRecord[] {
    let result = miembros;

    if (statusFilter === "active") {
      result = result.filter((m) => m.activo);
    } else if (statusFilter === "inactive") {
      result = result.filter((m) => !m.activo);
    }

    if (cargoFilter) {
      result = result.filter((m) => m.cargoMiembroGrupoId === cargoFilter);
    }

    if (estFilter) {
      result = result.filter((m) => m.grupoEstablecimientoId === estFilter);
    }

    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return result;

    return result.filter((m) => {
      const haystack = normalize(`${m.dni} ${m.nombres} ${m.apellidos}`);
      return terms.every((t) => haystack.includes(t));
    });
  }
  ```

- [ ] **Step 4: Verify tests pass**
  Run: `pnpm --filter @visitas/web test`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/web/src/features/grupos-trabajo/grupos-utils.ts apps/web/src/features/grupos-trabajo/grupos-utils.test.ts
  git commit -m "test(grupos): implement and pass utility filters tests"
  ```

---

### Task 4: Routing and Navigation Mapping

**Files:**
- Modify: `apps/web/src/routes/AppRouter.tsx`

- [ ] **Step 1: Edit AppRouter to replace ComingSoonPage with the real modules**
  Modify `/grupos-trabajo` to load `GruposPage`, and add a route `/grupos-trabajo/:id` to load `GrupoDetailPage`.
  Add these lines to imports:
  ```typescript
  import { GruposPage } from "../features/grupos-trabajo/pages/GruposPage";
  import { GrupoDetailPage } from "../features/grupos-trabajo/pages/GrupoDetailPage";
  ```
  Replace line 81:
  ```diff
  -             <Route element={<ComingSoonPage />} path="/grupos-trabajo" />
  +             <Route element={<GruposPage />} path="/grupos-trabajo" />
  +             <Route element={<GrupoDetailPage />} path="/grupos-trabajo/:id" />
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/routes/AppRouter.tsx
  git commit -m "feat(grupos): map router paths to GruposPage and GrupoDetailPage"
  ```

---

### Task 5: List Page Implementation (`GruposPage.tsx`)

**Files:**
- Create: `apps/web/src/features/grupos-trabajo/pages/GruposPage.tsx`

- [ ] **Step 1: Write code for GruposPage**
  Implement the list view of all work groups. Fetch municipalidades to show dropdown for `ADMIN_GENERAL` role.
  Ensure it follows visual styles like `admin-content-card`, `admin-table`, and `admin-modal-backdrop`.
  Code summary:
  ```typescript
  import { useEffect, useMemo, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
  import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
  import { createGrupo, listGrupos } from "../grupos-api";
  import type { GrupoTrabajoFormState, GrupoTrabajoRecord } from "../grupos-types";
  import { emptyGrupoForm, filterGrupos } from "../grupos-utils";
  import { apiRequest } from "../../../shared/api";

  export function GruposPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ rol: string; municipalidadId: string | null } | null>(null);
    const [grupos, setGrupos] = useState<GrupoTrabajoRecord[]>([]);
    const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
    const [query, setQuery] = useState("");
    const [form, setForm] = useState<GrupoTrabajoFormState>(emptyGrupoForm);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Filters
    const [showFilters, setShowFilters] = useState(false);
    const [estadoFilter, setEstadoFilter] = useState("");
    const [periodoFilter, setPeriodoFilter] = useState("");
    const [muniFilter, setMuniFilter] = useState("");

    useEffect(() => {
      // Decode user role from session
      try {
        const session = localStorage.getItem("visitas_session");
        if (session) {
          const parsed = JSON.parse(session);
          setUser(parsed.user);
        }
      } catch (e) {
        console.error(e);
      }
      void loadData();
    }, []);

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [groupsData, munisData] = await Promise.all([
          listGrupos(),
          listMunicipalidades().catch(() => []),
        ]);
        setGrupos(groupsData);
        setMunicipalidades(munisData.filter(m => m.activo));
      } catch (err: any) {
        setError(err.message || "Error al cargar los datos.");
      } finally {
        setIsLoading(false);
      }
    }

    const availablePeriods = useMemo(() => {
      const periods = grupos.map((g) => g.periodoYear);
      return Array.from(new Set(periods)).sort((a, b) => b - a);
    }, [grupos]);

    const filteredGrupos = useMemo(() => {
      return filterGrupos(
        grupos,
        query,
        estadoFilter,
        periodoFilter ? Number(periodoFilter) : undefined,
        muniFilter,
      );
    }, [grupos, query, estadoFilter, periodoFilter, muniFilter]);

    function openCreate() {
      setForm({
        ...emptyGrupoForm,
        municipalidadId: user?.municipalidadId || "",
      });
      setError(null);
      setMessage(null);
      setIsFormOpen(true);
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      setIsSaving(true);
      setError(null);
      setMessage(null);

      // Validate representative DNI
      if (!/^\d{8}$/.test(form.dniRepresentante)) {
        setError("El DNI del representante debe tener exactamente 8 dígitos.");
        setIsSaving(false);
        return;
      }

      // Validate period year
      const year = Number(form.periodoYear);
      if (isNaN(year) || year < 2000 || year > 32767) {
        setError("El período anual debe ser un número válido entre 2000 y 32767.");
        setIsSaving(false);
        return;
      }

      // Validate municipality selection
      const resolvedMuniId = user?.rol === "ADMIN_GENERAL" ? form.municipalidadId : user?.municipalidadId;
      if (!resolvedMuniId) {
        setError("Debe seleccionar una municipalidad.");
        setIsSaving(false);
        return;
      }

      try {
        const saved = await createGrupo({
          municipalidadId: resolvedMuniId,
          fechaLimite: form.fechaLimite,
          nombreGrupo: form.nombreGrupo.trim(),
          periodoYear: year,
          dniRepresentante: form.dniRepresentante.trim(),
          nombreRepresentante: form.nombreRepresentante.trim(),
          apellidosRepresentante: form.apellidosRepresentante.trim(),
        });
        setGrupos((curr) => [saved, ...curr]);
        setMessage("Grupo de trabajo creado con éxito.");
        setIsFormOpen(false);
      } catch (err: any) {
        setError(err.message || "Error al crear el grupo.");
      } finally {
        setIsSaving(false);
      }
    }

    return (
      <>
        <section className="admin-page-heading">
          <div>
            <h1>Conformación de Grupo de Trabajo</h1>
            <p>Monitorea y conforma los grupos de trabajo municipales.</p>
          </div>
          <div className="breadcrumb-card" aria-label="Ruta actual">
            <span aria-hidden="true">⌂</span>
            <span>Grupo de Trabajo</span>
            <strong>Conformación</strong>
          </div>
        </section>

        <section className="admin-content-card" aria-label="Listado de Grupos">
          <div className="admin-actions-row">
            <label className="admin-search-field">
              <span aria-hidden="true">⌕</span>
              <input
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o representante..."
                type="search"
                value={query}
              />
            </label>

            <div className="admin-actions-group">
              <button
                className={`admin-button is-ghost${showFilters ? " is-active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                type="button"
              >
                Filtros
              </button>
              <button
                className="admin-button is-primary"
                onClick={openCreate}
                type="button"
              >
                + Nuevo grupo
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="admin-filters-panel" style={{ display: "flex", gap: "1rem", marginBottom: "1rem", padding: "1rem", background: "var(--color-bg-alt, rgba(0,0,0,0.02))", borderRadius: "8px", border: "1px solid var(--color-border, rgba(0,0,0,0.08))" }}>
              <label className="field" style={{ margin: 0, flex: 1 }}>
                Estado
                <select onChange={(e) => setEstadoFilter(e.target.value)} style={{ width: "100%", marginTop: "0.25rem" }} value={estadoFilter}>
                  <option value="">Todos</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="REGISTRADO">Registrado</option>
                  <option value="OBSERVADO">Observado</option>
                  <option value="VALIDADO">Validado</option>
                </select>
              </label>
              <label className="field" style={{ margin: 0, flex: 1 }}>
                Periodo
                <select onChange={(e) => setPeriodoFilter(e.target.value)} style={{ width: "100%", marginTop: "0.25rem" }} value={periodoFilter}>
                  <option value="">Todos</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              {user?.rol === "ADMIN_GENERAL" ? (
                <label className="field" style={{ margin: 0, flex: 1 }}>
                  Municipalidad
                  <select onChange={(e) => setMuniFilter(e.target.value)} style={{ width: "100%", marginTop: "0.25rem" }} value={muniFilter}>
                    <option value="">Todas</option>
                    {municipalidades.map((m) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="alert alert-success">{message}</p> : null}
          {error ? <p className="alert alert-error">{error}</p> : null}

          {isFormOpen ? (
            <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
              <form className="admin-modal" onSubmit={handleSubmit}>
                <div className="admin-modal-header">
                  <div>
                    <h2>Nuevo grupo de trabajo</h2>
                    <p>Completa los datos del grupo.</p>
                  </div>
                  <button className="admin-modal-close" onClick={() => setIsFormOpen(false)} type="button">×</button>
                </div>

                <div className="admin-form-grid">
                  {user?.rol === "ADMIN_GENERAL" ? (
                    <label className="field admin-form-wide">
                      Municipalidad
                      <select
                        onChange={(e) => setForm(curr => ({ ...curr, municipalidadId: e.target.value }))}
                        required
                        value={form.municipalidadId}
                      >
                        <option value="">Selecciona municipalidad...</option>
                        {municipalidades.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="field admin-form-wide">
                    Nombre del Grupo
                    <input maxLength={150} onChange={(e) => setForm(curr => ({ ...curr, nombreGrupo: e.target.value }))} required value={form.nombreGrupo} />
                  </label>
                  <label className="field">
                    Periodo (Año)
                    <input max={32767} min={2000} onChange={(e) => setForm(curr => ({ ...curr, periodoYear: e.target.value }))} required type="number" value={form.periodoYear} />
                  </label>
                  <label className="field">
                    Fecha Límite
                    <input onChange={(e) => setForm(curr => ({ ...curr, fechaLimite: e.target.value }))} required type="date" value={form.fechaLimite} />
                  </label>
                  <label className="field">
                    DNI Representante
                    <input maxLength={8} onChange={(e) => setForm(curr => ({ ...curr, dniRepresentante: e.target.value }))} required value={form.dniRepresentante} />
                  </label>
                  <label className="field">
                    Nombre Representante
                    <input maxLength={150} onChange={(e) => setForm(curr => ({ ...curr, nombreRepresentante: e.target.value }))} required value={form.nombreRepresentante} />
                  </label>
                  <label className="field admin-form-wide">
                    Apellidos Representante
                    <input maxLength={200} onChange={(e) => setForm(curr => ({ ...curr, apellidosRepresentante: e.target.value }))} required value={form.apellidosRepresentante} />
                  </label>
                </div>

                <div className="admin-form-actions">
                  <button className="admin-button is-ghost" onClick={() => setIsFormOpen(false)} type="button">Cancelar</button>
                  <button className="admin-button is-primary" disabled={isSaving} type="submit">{isSaving ? "Guardando..." : "Crear grupo"}</button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="admin-table-meta">
            <span>{filteredGrupos.length} resultados</span>
            <span>{isLoading ? "Cargando..." : `1-${filteredGrupos.length} de ${filteredGrupos.length}`}</span>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Año</th>
                  <th>Nombre del Grupo</th>
                  <th>Representante</th>
                  <th>Fecha Límite</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredGrupos.map((g) => (
                  <tr key={g.id}>
                    <td>{g.periodoYear}</td>
                    <td>{g.nombreGrupo}</td>
                    <td>{`${g.nombreRepresentante} ${g.apellidosRepresentante}`}</td>
                    <td>{new Date(g.fechaLimite).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-pill is-active`}>{g.estado}</span>
                    </td>
                    <td>
                      <button className="admin-icon-button" onClick={() => navigate(`/grupos-trabajo/${g.id}`)} type="button">Gestionar</button>
                    </td>
                  </tr>
                ))}
                {!isLoading && filteredGrupos.length === 0 ? (
                  <tr>
                    <td className="admin-empty-cell" colSpan={6}>No se encontraron grupos de trabajo.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/grupos-trabajo/pages/GruposPage.tsx
  git commit -m "feat(grupos): implement list and group creation UI in GruposPage"
  ```

---

### Task 6: Details Page Implementation (`GrupoDetailPage.tsx`)

**Files:**
- Create: `apps/web/src/features/grupos-trabajo/pages/GrupoDetailPage.tsx`

- [ ] **Step 1: Write code for GrupoDetailPage**
  Create the detail screen for a work group. Fetch cargo list from `listCargos()` API.
  This includes showing metadata, adding establishments, and managing members (adding, editing limited fields, activating/inactivating, and showing the "Por Implementar" modal for deletion).
  Code summary:
  ```typescript
  import { useEffect, useMemo, useState } from "react";
  import { useParams, useNavigate } from "react-router-dom";
  import { listCargos } from "../../cargos-miembro-grupo/cargos-api";
  import type { CargoMiembroRecord } from "../../cargos-miembro-grupo/cargos-types";
  import { createEstablecimiento, createMiembro, listGrupos, setMiembroActivo, updateMiembroContacto } from "../grupos-api";
  import type { GrupoEstablecimientoFormState, GrupoEstablecimientoRecord, GrupoTrabajoRecord, MiembroGrupoFormState, MiembroGrupoRecord } from "../grupos-types";
  import { emptyEstablecimientoForm, emptyMiembroForm, filterMiembros } from "../grupos-utils";

  export function GrupoDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [grupo, setGrupo] = useState<GrupoTrabajoRecord | null>(null);
    const [cargos, setCargos] = useState<CargoMiembroRecord[]>([]);
    const [establecimientos, setEstablecimientos] = useState<GrupoEstablecimientoRecord[]>([]);
    const [miembros, setMiembros] = useState<MiembroGrupoRecord[]>([]);
    const [cargosMap, setCargosMap] = useState<Record<string, string>>({});

    const [activeTab, setActiveTab] = useState<"estab" | "miembro">("estab");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Modals
    const [isEstModalOpen, setIsEstModalOpen] = useState(false);
    const [isMibModalOpen, setIsMibModalOpen] = useState(false);
    const [isMibEditOpen, setIsMibEditOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const [estForm, setEstForm] = useState<GrupoEstablecimientoFormState>(emptyEstablecimientoForm);
    const [mibForm, setMibForm] = useState<MiembroGrupoFormState>(emptyMiembroForm);
    const [editingMiembro, setEditingMiembro] = useState<MiembroGrupoRecord | null>(null);

    // Filters for members
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
    const [cargoFilter, setCargoFilter] = useState("");
    const [estFilter, setEstFilter] = useState("");

    useEffect(() => {
      void loadDetails();
    }, [id]);

    async function loadDetails() {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        const [allGroups, cargoList, membersResponse, establishmentsResponse] = await Promise.all([
          listGrupos(),
          listCargos(),
          // Retrieve members & establishments nested lists from database
          fetchMiembrosAndEstablecimientos(id)
        ]);

        const currentGrupo = allGroups.find(g => g.id === id);
        if (!currentGrupo) {
          setError("Grupo de trabajo no encontrado.");
          return;
        }

        setGrupo(currentGrupo);
        setCargos(cargoList.filter(c => c.activo));
        setMiembros(membersResponse);
        setEstablecimientos(establishmentsResponse);

        const map: Record<string, string> = {};
        cargoList.forEach(c => {
          map[c.id] = c.nombre;
        });
        setCargosMap(map);
      } catch (err: any) {
        setError(err.message || "Error al cargar los detalles.");
      } finally {
        setIsLoading(false);
      }
    }

    // Helper function to call backend and parse members/establishments
    // In backend, there are no GET /:id/miembros routes directly, so we fetch establishments and members from nested relations inside the DB, or get them from list endpoints.
    // Wait, the API routes for Grupos only contain POST and PATCH endpoints for miembros and establecimientos.
    // But since the DB relation contains establishments and members, how can we fetch them?
    // Let's implement fetchMiembrosAndEstablecimientos by using the existing client apiRequest on /grupos-trabajo if we modified the list endpoint, or fetch them by custom queries if available.
    // Actually, in the database, establishments and members belong to a group. Let's make sure we retrieve them.
    // Wait, if the list endpoint in the API does NOT return them, does it mean we need to query them by hitting the endpoint, or did we extend it?
    // Let's make sure we query /grupos-trabajo. If the endpoint doesn't return them, let's make a request to list and see what it contains.
    async function fetchMiembrosAndEstablecimientos(grupoId: string) {
      // The backend actually implements fetching them by custom relations if list is queried.
      // Wait, let's call the GET /grupos-trabajo and see if they are returned or if there are separate GETs.
      // In the backend, list() does not return establishments/members directly in the schema, but we can query them or we will update the repository list() to include them!
      // Yes! In Task 7 we will verify this, but let's write the code here assuming they are in the database and retrieved.
      // If we query the list, it's possible we can filter the nested objects, or we can fetch them.
      // Let's fetch the data directly.
      const groups = await listGrupos();
      const current = groups.find(g => g.id === grupoId) as any;
      return [current?.miembros || [], current?.establecimientos || []];
    }

    const filteredMiembros = useMemo(() => {
      return filterMiembros(miembros, query, statusFilter, cargoFilter, estFilter);
    }, [miembros, query, statusFilter, cargoFilter, estFilter]);

    async function handleAddEstablecimiento(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!id) return;
      setError(null);
      setMessage(null);

      try {
        const saved = await createEstablecimiento(id, {
          nombre: estForm.nombre.trim(),
          codigo: estForm.codigo.trim() || null,
          direccion: estForm.direccion.trim() || null
        });
        setEstablecimientos(curr => [...curr, saved]);
        setMessage("Establecimiento creado con éxito.");
        setIsEstModalOpen(false);
        setEstForm(emptyEstablecimientoForm);
      } catch (err: any) {
        setError(err.message || "Error al crear establecimiento.");
      }
    }

    async function handleAddMiembro(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!id) return;
      setError(null);
      setMessage(null);

      if (!/^\d{8}$/.test(mibForm.dni)) {
        setError("El DNI debe tener exactamente 8 dígitos.");
        return;
      }
      if (mibForm.celular && !/^\d{9}$/.test(mibForm.celular)) {
        setError("El celular debe tener exactamente 9 dígitos.");
        return;
      }

      try {
        const saved = await createMiembro(id, {
          cargoMiembroGrupoId: mibForm.cargoMiembroGrupoId,
          grupoEstablecimientoId: mibForm.grupoEstablecimientoId || null,
          dni: mibForm.dni.trim(),
          nombres: mibForm.nombres.trim(),
          apellidos: mibForm.apellidos.trim(),
          celular: mibForm.celular.trim() || null,
          email: mibForm.email.trim() || null
        });
        setMiembros(curr => [...curr, saved]);
        setMessage("Miembro del grupo creado con éxito.");
        setIsMibModalOpen(false);
        setMibForm(emptyMiembroForm);
      } catch (err: any) {
        setError(err.message || "Error al crear miembro.");
      }
    }

    async function handleEditMiembro(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      if (!id || !editingMiembro) return;
      setError(null);
      setMessage(null);

      if (mibForm.celular && !/^\d{9}$/.test(mibForm.celular)) {
        setError("El celular debe tener exactamente 9 dígitos.");
        return;
      }

      try {
        const saved = await updateMiembroContacto(id, editingMiembro.id, {
          grupoEstablecimientoId: mibForm.grupoEstablecimientoId || null,
          celular: mibForm.celular.trim() || null,
          email: mibForm.email.trim() || null
        });
        setMiembros(curr => curr.map(m => m.id === saved.id ? saved : m));
        setMessage("Contacto de miembro actualizado con éxito.");
        setIsMibEditOpen(false);
        setEditingMiembro(null);
      } catch (err: any) {
        setError(err.message || "Error al actualizar miembro.");
      }
    }

    async function handleToggleActivo(m: MiembroGrupoRecord) {
      if (!id) return;
      const nextActivo = !m.activo;
      const confirm = window.confirm(`¿Deseas ${nextActivo ? "activar" : "inactivar"} al miembro ${m.nombres}?`);
      if (!confirm) return;

      setError(null);
      setMessage(null);
      try {
        const updated = await setMiembroActivo(id, m.id, nextActivo);
        setMiembros(curr => curr.map(item => item.id === updated.id ? updated : item));
        setMessage("Estado del miembro actualizado.");
      } catch (err: any) {
        setError(err.message || "Error al cambiar estado.");
      }
    }

    return (
      <>
        <section className="admin-page-heading">
          <div>
            <h1>{grupo?.nombreGrupo || "Detalle del Grupo"}</h1>
            <p>Conformación de miembros y establecimientos del grupo.</p>
          </div>
          <div className="breadcrumb-card">
            <button className="admin-button is-ghost" onClick={() => navigate("/grupos-trabajo")} style={{ padding: "0.25rem 0.5rem" }} type="button">← Volver</button>
          </div>
        </section>

        {error ? <p className="alert alert-error">{error}</p> : null}
        {message ? <p className="alert alert-success">{message}</p> : null}

        {grupo ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 3fr", gap: "2rem", alignItems: "start" }}>
            {/* Info Panel */}
            <div className="admin-content-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ margin: "0 0 1rem" }}>Datos Generales</h3>
              <p><strong>Representante:</strong><br />{`${grupo.nombreRepresentante} ${grupo.apellidosRepresentante}`}</p>
              <p><strong>DNI Representante:</strong><br />{grupo.dniRepresentante}</p>
              <p><strong>Periodo:</strong><br />{grupo.periodoYear}</p>
              <p><strong>Fecha Límite:</strong><br />{new Date(grupo.fechaLimite).toLocaleDateString()}</p>
              <p>
                <strong>Estado:</strong><br />
                <span className="status-pill is-active">{grupo.estado}</span>
              </p>
            </div>

            {/* Main Tabs Panel */}
            <div className="admin-content-card">
              <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", marginBottom: "1.5rem" }}>
                <button
                  onClick={() => setActiveTab("estab")}
                  style={{
                    padding: "1rem 2rem",
                    border: "none",
                    background: "none",
                    fontWeight: activeTab === "estab" ? "bold" : "normal",
                    borderBottom: activeTab === "estab" ? "3px solid var(--color-primary, #2e7d32)" : "none",
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  Establecimientos ({establecimientos.length})
                </button>
                <button
                  onClick={() => setActiveTab("miembro")}
                  style={{
                    padding: "1rem 2rem",
                    border: "none",
                    background: "none",
                    fontWeight: activeTab === "miembro" ? "bold" : "normal",
                    borderBottom: activeTab === "miembro" ? "3px solid var(--color-primary, #2e7d32)" : "none",
                    cursor: "pointer"
                  }}
                  type="button"
                >
                  Miembros ({miembros.length})
                </button>
              </div>

              {activeTab === "estab" ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem" }}>
                    <h4>Lista de Establecimientos</h4>
                    <button className="admin-button is-primary" onClick={() => setIsEstModalOpen(true)} type="button">+ Agregar establecimiento</button>
                  </div>

                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Código</th>
                          <th>Dirección</th>
                        </tr>
                      </thead>
                      <tbody>
                        {establecimientos.map((e) => (
                          <tr key={e.id}>
                            <td>{e.nombre}</td>
                            <td>{e.codigo || "—"}</td>
                            <td>{e.direccion || "—"}</td>
                          </tr>
                        ))}
                        {establecimientos.length === 0 ? (
                          <tr>
                            <td className="admin-empty-cell" colSpan={3}>No hay establecimientos registrados.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", padding: "0 1rem" }}>
                    <label className="admin-search-field" style={{ width: "300px" }}>
                      <span aria-hidden="true">⌕</span>
                      <input onChange={(e) => setQuery(e.target.value)} placeholder="Buscar miembro..." type="search" value={query} />
                    </label>
                    <button className="admin-button is-primary" onClick={() => setIsMibModalOpen(true)} type="button">+ Agregar miembro</button>
                  </div>

                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>DNI</th>
                          <th>Nombre Completo</th>
                          <th>Cargo</th>
                          <th>Establecimiento</th>
                          <th>Contacto</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMiembros.map((m) => (
                          <tr key={m.id}>
                            <td>{m.dni}</td>
                            <td>{`${m.nombres} ${m.apellidos}`}</td>
                            <td>{cargosMap[m.cargoMiembroGrupoId] || "Cargando..."}</td>
                            <td>{establecimientos.find(e => e.id === m.grupoEstablecimientoId)?.nombre || "—"}</td>
                            <td>
                              {m.celular ? <div>📱 {m.celular}</div> : null}
                              {m.email ? <div>✉️ {m.email}</div> : null}
                              {!m.celular && !m.email ? "—" : null}
                            </td>
                            <td>
                              <span className={m.activo ? "status-pill is-active" : "status-pill is-muted"}>
                                {m.activo ? "Activo" : "Inactivo"}
                              </span>
                            </td>
                            <td>
                              <div className="admin-row-actions">
                                <button
                                  className="admin-icon-button"
                                  onClick={() => {
                                    setEditingMiembro(m);
                                    setMibForm({
                                      dni: m.dni,
                                      nombres: m.nombres,
                                      apellidos: m.apellidos,
                                      cargoMiembroGrupoId: m.cargoMiembroGrupoId,
                                      grupoEstablecimientoId: m.grupoEstablecimientoId || "",
                                      celular: m.celular || "",
                                      email: m.email || ""
                                    });
                                    setIsMibEditOpen(true);
                                  }}
                                  type="button"
                                >
                                  Editar
                                </button>
                                <button className="admin-icon-button" onClick={() => void handleToggleActivo(m)} type="button">
                                  {m.activo ? "Inactivar" : "Activar"}
                                </button>
                                <button className="admin-icon-button" onClick={() => setIsDeleteModalOpen(true)} type="button">
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredMiembros.length === 0 ? (
                          <tr>
                            <td className="admin-empty-cell" colSpan={7}>No se encontraron miembros.</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* Modal Establecimiento */}
        {isEstModalOpen ? (
          <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
            <form className="admin-modal" onSubmit={handleAddEstablecimiento}>
              <div className="admin-modal-header">
                <h2>Agregar Establecimiento</h2>
                <button className="admin-modal-close" onClick={() => setIsEstModalOpen(false)} type="button">×</button>
              </div>
              <div className="admin-form-grid">
                <label className="field admin-form-wide">
                  Nombre
                  <input maxLength={150} onChange={(e) => setEstForm(curr => ({ ...curr, nombre: e.target.value }))} required value={estForm.nombre} />
                </label>
                <label className="field">
                  Código
                  <input maxLength={50} onChange={(e) => setEstForm(curr => ({ ...curr, codigo: e.target.value }))} value={estForm.codigo} />
                </label>
                <label className="field admin-form-wide">
                  Dirección
                  <input maxLength={200} onChange={(e) => setEstForm(curr => ({ ...curr, direccion: e.target.value }))} value={estForm.direccion} />
                </label>
              </div>
              <div className="admin-form-actions">
                <button className="admin-button is-ghost" onClick={() => setIsEstModalOpen(false)} type="button">Cancelar</button>
                <button className="admin-button is-primary" type="submit">Agregar</button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Modal Miembro Crear */}
        {isMibModalOpen ? (
          <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
            <form className="admin-modal" onSubmit={handleAddMiembro}>
              <div className="admin-modal-header">
                <h2>Agregar Miembro Administrativo</h2>
                <button className="admin-modal-close" onClick={() => setIsMibModalOpen(false)} type="button">×</button>
              </div>
              <div className="admin-form-grid">
                <label className="field">
                  DNI
                  <input maxLength={8} onChange={(e) => setMibForm(curr => ({ ...curr, dni: e.target.value }))} required value={mibForm.dni} />
                </label>
                <label className="field">
                  Nombres
                  <input maxLength={150} onChange={(e) => setMibForm(curr => ({ ...curr, nombres: e.target.value }))} required value={mibForm.nombres} />
                </label>
                <label className="field admin-form-wide">
                  Apellidos
                  <input maxLength={200} onChange={(e) => setMibForm(curr => ({ ...curr, apellidos: e.target.value }))} required value={mibForm.apellidos} />
                </label>
                <label className="field">
                  Cargo
                  <select onChange={(e) => setMibForm(curr => ({ ...curr, cargoMiembroGrupoId: e.target.value }))} required value={mibForm.cargoMiembroGrupoId}>
                    <option value="">Selecciona cargo...</option>
                    {cargos.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Establecimiento
                  <select onChange={(e) => setMibForm(curr => ({ ...curr, grupoEstablecimientoId: e.target.value }))} value={mibForm.grupoEstablecimientoId}>
                    <option value="">Ninguno</option>
                    {establecimientos.map(es => (
                      <option key={es.id} value={es.id}>{es.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Celular
                  <input maxLength={9} onChange={(e) => setMibForm(curr => ({ ...curr, celular: e.target.value }))} value={mibForm.celular} />
                </label>
                <label className="field">
                  Email
                  <input onChange={(e) => setMibForm(curr => ({ ...curr, email: e.target.value }))} type="email" value={mibForm.email} />
                </label>
              </div>
              <div className="admin-form-actions">
                <button className="admin-button is-ghost" onClick={() => setIsMibModalOpen(false)} type="button">Cancelar</button>
                <button className="admin-button is-primary" type="submit">Agregar miembro</button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Modal Miembro Editar (Limitado) */}
        {isMibEditOpen ? (
          <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
            <form className="admin-modal" onSubmit={handleEditMiembro}>
              <div className="admin-modal-header">
                <h2>Editar Miembro (Edición Limitada)</h2>
                <button className="admin-modal-close" onClick={() => setIsMibEditOpen(false)} type="button">×</button>
              </div>
              <div className="admin-form-grid">
                <label className="field">
                  DNI (Solo Lectura)
                  <input disabled value={mibForm.dni} />
                </label>
                <label className="field">
                  Nombre Completo (Solo Lectura)
                  <input disabled value={`${mibForm.nombres} ${mibForm.apellidos}`} />
                </label>
                <label className="field">
                  Cargo (Solo Lectura)
                  <input disabled value={cargosMap[mibForm.cargoMiembroGrupoId] || ""} />
                </label>
                <label className="field">
                  Establecimiento
                  <select onChange={(e) => setMibForm(curr => ({ ...curr, grupoEstablecimientoId: e.target.value }))} value={mibForm.grupoEstablecimientoId}>
                    <option value="">Ninguno</option>
                    {establecimientos.map(es => (
                      <option key={es.id} value={es.id}>{es.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Celular
                  <input maxLength={9} onChange={(e) => setMibForm(curr => ({ ...curr, celular: e.target.value }))} value={mibForm.celular} />
                </label>
                <label className="field">
                  Email
                  <input onChange={(e) => setMibForm(curr => ({ ...curr, email: e.target.value }))} type="email" value={mibForm.email} />
                </label>
              </div>
              <div className="admin-form-actions">
                <button className="admin-button is-ghost" onClick={() => setIsMibEditOpen(false)} type="button">Cancelar</button>
                <button className="admin-button is-primary" type="submit">Guardar cambios</button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Modal Por Implementar */}
        {isDeleteModalOpen ? (
          <div aria-modal="true" className="admin-modal-backdrop" role="dialog">
            <div className="admin-modal">
              <div className="admin-modal-header">
                <h2>Eliminar Miembro</h2>
                <button className="admin-modal-close" onClick={() => setIsDeleteModalOpen(false)} type="button">×</button>
              </div>
              <div style={{ padding: "1rem" }}>
                <p><strong>Por Implementar</strong></p>
                <p>La eliminación lógica de miembros administrativos con motivo de eliminación está diferida y será completamente implementada en la fase V2.</p>
              </div>
              <div className="admin-form-actions">
                <button className="admin-button is-primary" onClick={() => setIsDeleteModalOpen(false)} type="button">Cerrar</button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add apps/web/src/features/grupos-trabajo/pages/GrupoDetailPage.tsx
  git commit -m "feat(grupos): implement detailed view layout, establishment creation, and member CRUD"
  ```

---

### Task 7: Repository and API query verification

**Files:**
- Modify: `apps/api/src/modules/grupos-trabajo/grupos-trabajo.repository.ts`

- [ ] **Step 1: Check database queries to ensure establishments and miembros are returned**
  Update `list()` method in `PrismaGruposTrabajoRepository` to include nested tables `establecimientos` and `miembros` so that they are automatically returned in the list:
  ```typescript
  list(): Promise<GrupoTrabajoRecord[]> {
    return this.prisma.grupoTrabajo.findMany({
      orderBy: [{ periodoYear: "desc" }, { nombreGrupo: "asc" }],
      include: {
        establecimientos: true,
        miembros: true,
      },
    });
  }
  ```
  Wait! Let's update `list()` in `PrismaGruposTrabajoRepository` to include them. Let's show the diff block:
  ```diff
  -  list(): Promise<GrupoTrabajoRecord[]> {
  -    return this.prisma.grupoTrabajo.findMany({
  -      orderBy: [{ periodoYear: "desc" }, { nombreGrupo: "asc" }],
  -    });
  -  }
  +  list(): Promise<GrupoTrabajoRecord[]> {
  +    return this.prisma.grupoTrabajo.findMany({
  +      orderBy: [{ periodoYear: "desc" }, { nombreGrupo: "asc" }],
  +      include: {
  +        establecimientos: true,
  +        miembros: true,
  +      },
  +    }) as unknown as Promise<GrupoTrabajoRecord[]>;
  +  }
  ```

- [ ] **Step 2: Verify all tests in API and Web pass**
  Run: `pnpm --filter @visitas/api test`
  Expected: PASS
  Run: `pnpm --filter @visitas/web test`
  Expected: PASS

- [ ] **Step 3: Commit**
  ```bash
  git add apps/api/src/modules/grupos-trabajo/grupos-trabajo.repository.ts
  git commit -m "feat(api): include establishments and members relations in groups list query"
  ```
