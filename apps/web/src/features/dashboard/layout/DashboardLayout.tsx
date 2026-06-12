import type { CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import "./dashboard.css";
import { AdminTopbar } from "./AdminTopbar";
import { DASHBOARD_PAGE_BACKGROUND, dashboardLayoutClassNames } from "./dashboard-theme";

const dashboardShellStyle = {
  "--dashboard-page-background": DASHBOARD_PAGE_BACKGROUND,
} as CSSProperties;

export function DashboardLayout() {
  return (
    <main
      className={dashboardLayoutClassNames.shell}
      style={dashboardShellStyle}
    >
      <AdminTopbar />
      <Outlet />
      <footer className="admin-footer">
        <span>© 2026 Ministerio de Salud del Perú. Todos los derechos reservados.</span>
        <span>Versión 1.0.0</span>
      </footer>
    </main>
  );
}
