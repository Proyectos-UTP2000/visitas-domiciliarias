import { describe, expect, it } from "vitest";
import {
  getNavItemAvailability,
  getVisibleNavGroups,
  navGroups,
} from "./admin-navigation";

const municipalidades = navGroups[0].items[0];
const panelVisitas = navGroups.find((group) => group.label === "Niños")!.items.find((item) => item.label === "Panel de Visitas")!;

const expectedDocGroups = [
  "Configuración",
  "Grupo de Trabajo",
  "Sectorización",
  "Actores Sociales",
  "Niños",
  "Reportes",
];

const expectedDocItemsByGroup = new Map([
  ["Configuración", ["Municipalidades", "Entidad", "Tipo Actor Social", "Cargos de Miembro"]],
  ["Grupo de Trabajo", ["Conformación de Grupo de Trabajo"]],
  ["Sectorización", ["Centro Poblado", "Sector Urbano", "Sector Rural"]],
  ["Actores Sociales", ["Registro Actores Sociales"]],
  ["Niños", ["Responsables", "Padrón de Niños", "Panel de Visitas"]],
  ["Reportes", ["Reporte Actividad", "Otros reportes operativos"]],
]);

describe("admin navigation", () => {
  it("matches the navigation grouping documented in docs/v1/frontend", () => {
    expect(navGroups.map((group) => group.label)).toEqual(expectedDocGroups);

    for (const group of navGroups) {
      expect(group.items.map((item) => item.label)).toEqual(
        expectedDocItemsByGroup.get(group.label),
      );
    }
  });

  it("marks role-enabled V1 items as active", () => {
    expect(getNavItemAvailability(municipalidades, "ADMIN_GENERAL")).toBe(
      "active",
    );
  });

  it("marks active V3 modules as active", () => {
    expect(getNavItemAvailability(panelVisitas, "ADMIN_GENERAL")).toBe(
      "active",
    );
  });

  it("does not expose restricted items as active for other roles", () => {
    expect(getNavItemAvailability(municipalidades, "ADMIN_MUNICIPAL")).toBe(
      "restricted",
    );
  });

  it("keeps reusable navbar groups independent from dashboard page content", () => {
    const groups = getVisibleNavGroups("ADMIN_GENERAL");

    expect(groups.map((group) => group.label)).toEqual(expectedDocGroups);
    expect(groups[0].items.map((item) => item.label)).toContain(
      "Municipalidades",
    );
  });
});
