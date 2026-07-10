import type { ReportesRepository, ReportesFiltros } from "./reportes.repository.js";

export class ReportesService {
  constructor(private readonly repository: ReportesRepository) {}

  private calcularEdadMeses(fechaNac: Date): number {
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
    if (hoy.getDate() < nac.getDate()) {
      meses--;
    }
    return meses < 0 ? 0 : meses;
  }

  async getActividad(filtros: ReportesFiltros) {
    const visitas = await this.repository.getVisitasActividad(filtros);
    const actores = await this.repository.getActoresSociales(filtros.municipalidadId);

    // 1. Resumen global
    const total = visitas.length;
    const programadas = visitas.filter((v) => v.estado === "PROGRAMADA").length;
    const ejecutadas = visitas.filter((v) => v.estado === "EJECUTADA").length;
    const reprogramadas = visitas.filter((v) => v.estado === "REPROGRAMADA").length;
    const inconclusas = visitas.filter((v) => v.estado === "INCONCLUSA").length;
    const porcentajeEjecucion = total > 0 ? parseFloat(((ejecutadas / total) * 100).toFixed(2)) : 0;

    const summary = {
      total,
      programadas,
      ejecutadas,
      reprogramadas,
      inconclusas,
      porcentajeEjecucion,
    };

    // 2. Resumen por Actor Social
    const actoresResumenMap = new Map<string, any>();
    for (const actor of actores) {
      actoresResumenMap.set(actor.id, {
        actorId: actor.id,
        dni: actor.dni,
        nombres: actor.nombres,
        apellidos: actor.apellidos,
        total: 0,
        programadas: 0,
        ejecutadas: 0,
        reprogramadas: 0,
        inconclusas: 0,
        porcentajeEjecucion: 0,
      });
    }

    for (const v of visitas) {
      if (!v.actorSocialId) continue;
      let resume = actoresResumenMap.get(v.actorSocialId);
      if (!resume) {
        // En caso de que el actor social esté inactivo y no haya venido en la lista de actores activos
        resume = {
          actorId: v.actorSocialId,
          dni: v.actorSocial?.dni || "",
          nombres: v.actorSocial?.nombres || "Desconocido",
          apellidos: v.actorSocial?.apellidos || "",
          total: 0,
          programadas: 0,
          ejecutadas: 0,
          reprogramadas: 0,
          inconclusas: 0,
          porcentajeEjecucion: 0,
        };
        actoresResumenMap.set(v.actorSocialId, resume);
      }

      resume.total++;
      if (v.estado === "PROGRAMADA") resume.programadas++;
      else if (v.estado === "EJECUTADA") resume.ejecutadas++;
      else if (v.estado === "REPROGRAMADA") resume.reprogramadas++;
      else if (v.estado === "INCONCLUSA") resume.inconclusas++;
    }

    const actoresResumen = Array.from(actoresResumenMap.values()).map((r) => {
      r.porcentajeEjecucion = r.total > 0 ? parseFloat(((r.ejecutadas / r.total) * 100).toFixed(2)) : 0;
      return r;
    });

    // 3. Detalles de visitas
    const detalles = visitas.map((v) => ({
      id: v.id,
      fechaProgramada: v.fechaProgramada.toISOString().split("T")[0],
      fechaEjecucion: v.fechaEjecucion ? v.fechaEjecucion.toISOString().split("T")[0] : null,
      estado: v.estado,
      ninoDni: v.nino.dni || "",
      ninoNombre: v.nino.nombres,
      ninoApellidos: v.nino.apellidos,
      actorNombre: v.actorSocial ? `${v.actorSocial.nombres} ${v.actorSocial.apellidos}` : "Sin asignar",
      sectorNombre: v.nino.sector ? v.nino.sector.nombreSector : "Sin asignar",
      consejeriaBrindada: v.consejeriaBrindada || false,
      comentarios: v.comentarios || "",
    }));

    return {
      summary,
      actores: actoresResumen,
      detalles,
    };
  }

  async getOperativos(filtros: { municipalidadId?: string | null; sectorId?: string | null }) {
    const ninos = await this.repository.getNinosOperativo(filtros);
    const sectores = await this.repository.getSectores(filtros.municipalidadId);

    // 1. Resumen global
    let ninos0a5 = 0;
    let ninos6a12 = 0;
    const responsablesSet = new Set<string>();
    let totalVisitasEjecutadas = 0;
    let totalConsejeria = 0;

    const detalles = [];

    for (const n of ninos) {
      if (n.responsableId) {
        responsablesSet.add(n.responsableId);
      }

      const edadMeses = this.calcularEdadMeses(n.fechaNac);
      let rangoEdad = "Mayor a 12 meses";
      if (edadMeses <= 5) {
        ninos0a5++;
        rangoEdad = "0 a 5 meses";
      } else if (edadMeses <= 12) {
        ninos6a12++;
        rangoEdad = "6 a 12 meses";
      }

      // Procesar visitas de este niño
      const visitasEjecutadas = n.visitas.length;
      const consejerias = n.visitas.filter((v) => v.consejeriaBrindada).length;

      totalVisitasEjecutadas += visitasEjecutadas;
      totalConsejeria += consejerias;

      detalles.push({
        id: n.id,
        dni: n.dni || "",
        cnv: n.cnv || "",
        nombres: n.nombres,
        apellidos: n.apellidos,
        fechaNac: n.fechaNac.toISOString().split("T")[0],
        edadMeses,
        rangoEdad,
        sectorNombre: n.sector ? n.sector.nombreSector : "Sin asignar",
        responsableNombre: n.responsable ? `${n.responsable.nombres} ${n.responsable.apellidos}` : "Sin asignar",
        responsableCelular: n.responsable?.celular || "",
      });
    }

    const totalNinos = ninos.length;
    const totalResponsables = responsablesSet.size;
    const porcentajeConsejeria =
      totalVisitasEjecutadas > 0 ? parseFloat(((totalConsejeria / totalVisitasEjecutadas) * 100).toFixed(2)) : 0;

    const summary = {
      totalNinos,
      ninos0a5,
      ninos6a12,
      totalResponsables,
      totalVisitasEjecutadas,
      totalConsejeria,
      porcentajeConsejeria,
    };

    // 2. Resumen por Sector
    const sectoresResumenMap = new Map<string, any>();
    for (const sec of sectores) {
      sectoresResumenMap.set(sec.id, {
        sectorId: sec.id,
        nombre: sec.nombreSector,
        tipoSector: sec.tipoSector,
        codigo: sec.codigo,
        totalNinos: 0,
        ninos0a5: 0,
        ninos6a12: 0,
        visitasEjecutadas: 0,
        consejeriaBrindada: 0,
        porcentajeConsejeria: 0,
      });
    }

    for (const n of ninos) {
      if (!n.sectorId) continue;
      let resume = sectoresResumenMap.get(n.sectorId);
      if (!resume) {
        resume = {
          sectorId: n.sectorId,
          nombre: n.sector?.nombreSector || "Desconocido",
          tipoSector: n.sector?.tipoSector || "URBANO",
          codigo: n.sector?.codigo || "",
          totalNinos: 0,
          ninos0a5: 0,
          ninos6a12: 0,
          visitasEjecutadas: 0,
          consejeriaBrindada: 0,
          porcentajeConsejeria: 0,
        };
        sectoresResumenMap.set(n.sectorId, resume);
      }

      resume.totalNinos++;
      const edadMeses = this.calcularEdadMeses(n.fechaNac);
      if (edadMeses <= 5) {
        resume.ninos0a5++;
      } else if (edadMeses <= 12) {
        resume.ninos6a12++;
      }

      resume.visitasEjecutadas += n.visitas.length;
      resume.consejeriaBrindada += n.visitas.filter((v) => v.consejeriaBrindada).length;
    }

    const sectoresResumen = Array.from(sectoresResumenMap.values()).map((r) => {
      r.porcentajeConsejeria =
        r.visitasEjecutadas > 0 ? parseFloat(((r.consejeriaBrindada / r.visitasEjecutadas) * 100).toFixed(2)) : 0;
      return r;
    });

    return {
      summary,
      sectores: sectoresResumen,
      detalles,
    };
  }
}
