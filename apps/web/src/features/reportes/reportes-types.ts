export interface ReporteActividadSummary {
  total: number;
  programadas: number;
  ejecutadas: number;
  reprogramadas: number;
  inconclusas: number;
  porcentajeEjecucion: number;
}

export interface ReporteActividadActor {
  actorId: string;
  dni: string;
  nombres: string;
  apellidos: string;
  total: number;
  programadas: number;
  ejecutadas: number;
  reprogramadas: number;
  inconclusas: number;
  porcentajeEjecucion: number;
}

export interface ReporteActividadDetalle {
  id: string;
  fechaProgramada: string;
  fechaEjecucion: string | null;
  estado: string;
  ninoDni: string;
  ninoNombre: string;
  ninoApellidos: string;
  actorNombre: string;
  sectorNombre: string;
  consejeriaBrindada: boolean;
  comentarios: string;
}

export interface ReporteActividadData {
  summary: ReporteActividadSummary;
  actores: ReporteActividadActor[];
  detalles: ReporteActividadDetalle[];
}

export interface ReporteOperativoSummary {
  totalNinos: number;
  ninos0a5: number;
  ninos6a12: number;
  totalResponsables: number;
  totalVisitasEjecutadas: number;
  totalConsejeria: number;
  porcentajeConsejeria: number;
}

export interface ReporteOperativoSector {
  sectorId: string;
  nombre: string;
  tipoSector: string;
  codigo: string;
  totalNinos: number;
  ninos0a5: number;
  ninos6a12: number;
  visitasEjecutadas: number;
  consejeriaBrindada: number;
  porcentajeConsejeria: number;
}

export interface ReporteOperativoDetalle {
  id: string;
  dni: string;
  cnv: string;
  nombres: string;
  apellidos: string;
  fechaNac: string;
  edadMeses: number;
  rangoEdad: string;
  sectorNombre: string;
  responsableNombre: string;
  responsableCelular: string;
}

export interface ReporteOperativoData {
  summary: ReporteOperativoSummary;
  sectores: ReporteOperativoSector[];
  detalles: ReporteOperativoDetalle[];
}
