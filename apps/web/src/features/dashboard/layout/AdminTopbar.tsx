import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { clearStoredSession, getStoredSession } from "../../auth/auth-storage";
import { APP_NAME } from "../../../shared/config";
import { dashboardLayoutClassNames } from "./dashboard-theme";
import {
  getNavItemAvailability,
  getVisibleNavGroups,
} from "../navigation/admin-navigation";
import { LuMenu, LuX, LuLogOut } from "react-icons/lu";

export function AdminTopbar() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const navGroups = getVisibleNavGroups(session?.user.rol);
  const navRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const openGroup = pinnedGroup ?? hoveredGroup;

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!navRef.current?.contains(event.target as Node)) {
        setPinnedGroup(null);
      }
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPinnedGroup(null);
        setHoveredGroup(null);
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
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
    <>
      <nav className={dashboardLayoutClassNames.topbar} aria-label="Navegación principal">
        {/* Botón menú hamburguesa (Visible solo en móvil) */}
        <button
          className="admin-hamburger-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          type="button"
          aria-label="Abrir menú"
        >
          <LuMenu size={24} />
        </button>

        <Link className="admin-brand" to="/" aria-label="Inicio">
          <span className="brand-mark" aria-hidden="true">
            {Array.from({ length: 9 }, (_, index) => (
              <span key={index} />
            ))}
          </span>
          <strong>{APP_NAME}</strong>
        </Link>

        {/* Grupos de navegación de escritorio */}
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

        {/* Sección de sesión de usuario */}
        <div className="admin-session" ref={userMenuRef}>
          {/* Botón de avatar de usuario (Clickable para desplegar popup en móvil y escritorio) */}
          <button
            className="session-avatar-btn"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            type="button"
            aria-label="Menú de usuario"
          >
            <span className="session-chip" title={session?.user.rol}>
              {session?.user.username?.slice(0, 1).toUpperCase() ?? "U"}
            </span>
          </button>

          {/* Información del usuario (Visible en escritorio, oculto en móvil) */}
          <span className="session-copy desktop-only">
            <strong>{session?.user.username}</strong>
            <small>{session?.user.rol}</small>
          </span>

          {/* Botón Salir directo (Visible en escritorio, oculto en móvil) */}
          <button className="topbar-logout desktop-only" onClick={handleLogout} type="button">
            Salir
          </button>

          {/* Dropdown flotante del usuario (Visible al presionar el avatar) */}
          {isUserMenuOpen && (
            <div className="user-dropdown-popup">
              <div className="user-dropdown-info">
                <strong>{session?.user.username}</strong>
                <small>{session?.user.rol}</small>
              </div>
              <hr className="user-dropdown-divider" />
              <button className="user-dropdown-logout-btn" onClick={handleLogout} type="button">
                <LuLogOut size={16} style={{ marginRight: "0.5rem" }} />
                Salir
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Menú lateral (Drawer) móvil */}
      {isMobileMenuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-brand">
              <span className="brand-mark" aria-hidden="true" style={{ width: "2rem", height: "2rem" }}>
                {Array.from({ length: 9 }, (_, index) => (
                  <span key={index} style={{ width: "0.2rem", height: "0.2rem" }} />
                ))}
              </span>
              <strong>{APP_NAME}</strong>
              <button
                  className="mobile-drawer-close"
                  onClick={() => setIsMobileMenuOpen(false)}
                  type="button"
                  aria-label="Cerrar menú"
              >
                <LuX size={24} />
              </button>
            </div>

            <div className="mobile-drawer-nav">
              {navGroups.map((group) => (
                <div className="mobile-nav-group" key={group.label}>
                  <div className="mobile-nav-group-title">{group.label}</div>
                  <div className="mobile-nav-group-items">
                    {group.items.map((item) => {
                      const availability = getNavItemAvailability(
                        item,
                        session?.user.rol,
                      );

                      if (availability === "planned") {
                        return (
                          <span
                            className="mobile-nav-item is-disabled"
                            key={item.path}
                            title="Opción prevista para una fase posterior"
                          >
                            {item.label}
                            <span className="badge-future">Futuro</span>
                          </span>
                        );
                      }

                      return (
                        <Link
                          className="mobile-nav-item"
                          key={item.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          to={item.path}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
