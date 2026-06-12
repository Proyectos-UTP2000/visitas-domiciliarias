import { describe, expect, it } from "vitest";
import {
  DASHBOARD_PAGE_BACKGROUND,
  dashboardLayoutClassNames,
} from "./dashboard-theme";

describe("dashboard layout contract", () => {
  it("uses a white background for internal pages", () => {
    expect(DASHBOARD_PAGE_BACKGROUND).toBe("#ffffff");
  });

  it("keeps the shared admin navbar contract outside DashboardHomePage", () => {
    expect(dashboardLayoutClassNames.topbar).toBe("admin-topbar");
    expect(dashboardLayoutClassNames.navGroups).toBe("admin-nav-groups");
  });
});
