import type { AuthRole } from "../../auth/auth-types";

export type NavStatus = "active" | "planned";
export type NavAvailability = "active" | "planned" | "restricted";

export type NavItem = {
  label: string;
  description: string;
  path: string;
  roles: AuthRole[];
  status?: NavStatus;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Configuración",
    items: [
      {
        label: "Municipalidades",
        description: "Gobiernos locales registrados.",
        path: "/municipalidades",
        roles: ["ADMIN_GENERAL"],
      },
      {
        label: "Entidad",
        description: "Entidades base de la operación.",
        path: "/entidades",
        roles: ["ADMIN_GENERAL"],
      },
      {
        label: "Tipo Actor Social",
        description: "Tipos, tarifas y orden operativo.",
        path: "/tipos-actor-social",
        roles: ["ADMIN_GENERAL"],
      },
      {
        label: "Cargos de Miembro",
        description: "Cargos administrativos para los miembros.",
        path: "/cargos-miembro-grupo",
        roles: ["ADMIN_GENERAL"],
      },
    ],
  },
  {
    label: "Grupo de Trabajo",
    items: [
      {
        label: "Conformación de Grupo de Trabajo",
        description: "Grupo, establecimientos y miembros administrativos.",
        path: "/grupos-trabajo",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
      },
    ],
  },
  {
    label: "Sectorización",
    items: [
      {
        label: "Centro Poblado",
        description: "Gestión de centros poblados urbanos y rurales.",
        path: "/sectores/centro-poblado",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
      },
      {
        label: "Sector Urbano",
        description: "Manzanas y sectores urbanos.",
        path: "/sectores/urbano",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
      },
      {
        label: "Sector Rural",
        description: "Centros poblados y sectores rurales.",
        path: "/sectores/rural",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
      },
    ],
  },
  {
    label: "Actores Sociales",
    items: [
      {
        label: "Registro Actores Sociales",
        description: "Registro, edición, estado y archivado.",
        path: "/actores-sociales",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
      },
    ],
  },
  {
    label: "Niños",
    items: [
      {
        label: "Panel de Visitas",
        description: "Previsto para fases posteriores.",
        path: "/ninos/visitas",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
        status: "planned",
      },
    ],
  },
  {
    label: "Reportes",
    items: [
      {
        label: "Reporte Actividad",
        description: "Previsto para reportes operativos.",
        path: "/reportes/actividad",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
        status: "planned",
      },
      {
        label: "Otros reportes operativos",
        description: "Reservado para siguientes reportes.",
        path: "/reportes/operativos",
        roles: ["ADMIN_GENERAL", "ADMIN_MUNICIPAL"],
        status: "planned",
      },
    ],
  },
];

export function getNavItemAvailability(
  item: NavItem,
  role?: AuthRole,
): NavAvailability {
  if (item.status === "planned") {
    return "planned";
  }

  if (!role || !item.roles.includes(role)) {
    return "restricted";
  }

  return "active";
}

export function getVisibleNavGroups(role?: AuthRole): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => getNavItemAvailability(item, role) !== "restricted",
      ),
    }))
    .filter((group) => group.items.length > 0);
}
