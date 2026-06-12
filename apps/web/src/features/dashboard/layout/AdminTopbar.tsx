import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearStoredSession, getStoredSession } from "../../auth/auth-storage";
import { APP_NAME } from "../../../shared/config";
import { dashboardLayoutClassNames } from "./dashboard-theme";
import {
  getNavItemAvailability,
  getVisibleNavGroups,
} from "../navigation/admin-navigation";

export function AdminTopbar() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const navGroups = getVisibleNavGroups(session?.user.rol);
  const navRef = useRef<HTMLDivElement | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const openGroup = pinnedGroup ?? hoveredGroup;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setPinnedGroup(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinnedGroup(null);
        setHoveredGroup(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    clearStoredSession();
    navigate("/login", { replace: true });
  }

  function togglePinnedGroup(groupLabel: string) {
    setPinnedGroup((current) => (current === groupLabel ? null : groupLabel));
    setHoveredGroup(null);
  }

  return (
    <nav className={dashboardLayoutClassNames.topbar} aria-label="Navegación principal">
      <Link className="admin-brand" to="/" aria-label="Inicio">
        <span className="brand-mark" aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} />
          ))}
        </span>
        <strong>{APP_NAME}</strong>
      </Link>

      <div
        className={dashboardLayoutClassNames.navGroups}
        aria-label="Secciones principales"
        ref={navRef}
      >
        {navGroups.map((group) => (
          <div
            className={`admin-menu${openGroup === group.label ? " is-open" : ""}`}
            key={group.label}
            onMouseEnter={() => {
              if (!pinnedGroup) setHoveredGroup(group.label);
            }}
            onMouseLeave={() => {
              if (!pinnedGroup) setHoveredGroup(null);
            }}
          >
            <button
              aria-expanded={openGroup === group.label}
              className="admin-menu-trigger"
              onClick={() => togglePinnedGroup(group.label)}
              type="button"
            >
              {group.label}
            </button>
            <div className="admin-menu-panel">
              {group.items.map((item) => {
                const availability = getNavItemAvailability(
                  item,
                  session?.user.rol,
                );

                if (availability === "planned") {
                  return (
                    <span
                      className="admin-menu-item is-disabled"
                      key={item.path}
                      title="Opción prevista para una fase posterior"
                    >
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                      <em>Futuro</em>
                    </span>
                  );
                }

                return (
                  <Link
                    className="admin-menu-item"
                    key={item.path}
                    onClick={() => setPinnedGroup(null)}
                    to={item.path}
                  >
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-session">
        <span className="session-chip" title={session?.user.rol}>
          {session?.user.username?.slice(0, 1).toUpperCase() ?? "U"}
        </span>
        <span className="session-copy">
          <strong>{session?.user.username}</strong>
          <small>{session?.user.rol}</small>
        </span>
        <button className="topbar-logout" onClick={handleLogout} type="button">
          Salir
        </button>
      </div>
    </nav>
  );
}
