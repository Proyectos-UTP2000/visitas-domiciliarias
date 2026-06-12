type EditableMunicipalidad = {
  nombre: string;
};

export function getMunicipalidadFormTitle(
  municipalidad?: EditableMunicipalidad | null,
) {
  return municipalidad ? "Editar municipalidad" : "Nueva municipalidad";
}
