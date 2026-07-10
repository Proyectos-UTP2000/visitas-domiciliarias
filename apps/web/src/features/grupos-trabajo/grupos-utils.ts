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
    if (estadoFilter === "BORRADOR") {
      result = result.filter((g) => g.estado === "BORRADOR" && (!g.observaciones || !g.observaciones.trim()));
    } else if (estadoFilter === "OBSERVADO") {
      result = result.filter((g) => g.estado === "BORRADOR" && (g.observaciones && g.observaciones.trim()));
    } else {
      result = result.filter((g) => g.estado === estadoFilter);
    }
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
