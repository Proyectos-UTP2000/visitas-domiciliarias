import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuChevronRight, LuChevronDown, LuFolder } from "react-icons/lu";
import { getStoredSession } from "../../auth/auth-storage";
import { listMunicipalidades } from "../../municipalidades/municipalidades-api";
import type { MunicipalidadRecord } from "../../municipalidades/municipalidades-types";
import { listTiposActorSocial } from "../../tipos-actor-social/tipos-actor-social-api";
import type { TipoActorSocialRecord } from "../../tipos-actor-social/tipos-actor-social-types";
import { listGrupos } from "../../grupos-trabajo/grupos-api";
import type { GrupoTrabajoRecordWithRelations } from "../../grupos-trabajo/grupos-types";
import { listActores } from "../actores-sociales-api";
import type { ActorSocialRecord } from "../actores-sociales-types";
import "../actores-sociales.css";

export function ActoresSocialesPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ rol: string; name?: string; username?: string; municipalidadId: string | null } | null>(null);
  const [actores, setActores] = useState<ActorSocialRecord[]>([]);
  const [municipalidades, setMunicipalidades] = useState<MunicipalidadRecord[]>([]);
  const [tiposActor, setTiposActor] = useState<TipoActorSocialRecord[]>([]);
  const [grupos, setGrupos] = useState<GrupoTrabajoRecordWithRelations[]>([]);

  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Filters (List view)
  const [showFilters, setShowFilters] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState("");
  const [muniFilter, setMuniFilter] = useState("");

  // Table options
  const [sortKey, setSortKey] = useState("apellidos");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [groupBy, setGroupBy] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const session = getStoredSession();
    if (session) {
      setUser(session.user);
      if (session.user.rol === "ADMIN_MUNICIPAL") {
        setMuniFilter(session.user.municipalidadId || "");
      }
    }
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    try {
      const session = getStoredSession();
      const userMuniId = session?.user.rol === "ADMIN_MUNICIPAL" ? session.user.municipalidadId : null;

      const [actData, munData, tipData, grupData] = await Promise.all([
        listActores(userMuniId),
        listMunicipalidades(),
        listTiposActorSocial(),
        listGrupos(userMuniId),
      ]);

      setActores(actData);
      setMunicipalidades(munData);
      setTiposActor(tipData);
      setGrupos(grupData);
    } catch (err: any) {
      setError(err.message || "Error al cargar la información inicial.");
    } finally {
      setIsLoading(false);
    }
  }

  const munisMap = useMemo(() => {
    const map: Record<string, string> = {};
    municipalidades.forEach((m) => {
      map[m.id] = m.nombre;
    });
    return map;
  }, [municipalidades]);

  const tiposMap = useMemo(() => {
    const map: Record<string, string> = {};
    tiposActor.forEach((t) => {
      map[t.id] = t.tipoActor;
    });
    return map;
  }, [tiposActor]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  function getSortIcon(key: string) {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? " ▲" : " ▼";
  }

  // Filtered & Sorted actors list
  const filteredActores = useMemo(() => {
    return actores.filter((a) => {
      // 1. Search Query DNI/Nombres/Apellidos
      const q = query.toLowerCase().trim();
      const matchQuery =
        !q ||
        a.dni.includes(q) ||
        a.nombres.toLowerCase().includes(q) ||
        a.apellidos.toLowerCase().includes(q);

      // 2. Status Filter
      const matchEstado = !estadoFilter || a.estado === estadoFilter;

      // 3. Municipality Filter
      const matchMuni = !muniFilter || a.municipalidadId === muniFilter;

      return matchQuery && matchEstado && matchMuni;
    });
  }, [actores, query, estadoFilter, muniFilter]);

  const sortedActores = useMemo(() => {
    const sorted = [...filteredActores];
    sorted.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortKey === "dni") {
        aVal = a.dni;
        bVal = b.dni;
      } else if (sortKey === "nombres") {
        aVal = a.nombres;
        bVal = b.nombres;
      } else if (sortKey === "apellidos") {
        aVal = a.apellidos;
        bVal = b.apellidos;
      } else if (sortKey === "tipoActor") {
        aVal = tiposMap[a.tipoActorSocialId] || "";
        bVal = tiposMap[b.tipoActorSocialId] || "";
      } else if (sortKey === "municipalidad") {
        aVal = munisMap[a.municipalidadId] || "";
        bVal = munisMap[b.municipalidadId] || "";
      } else if (sortKey === "establecimiento") {
        const estA = a.grupoEstablecimientoId
          ? (grupos.flatMap(g => g.establecimientos || []).find(e => e.id === a.grupoEstablecimientoId)?.nombre || "")
          : "";
        const estB = b.grupoEstablecimientoId
          ? (grupos.flatMap(g => g.establecimientos || []).find(e => e.id === b.grupoEstablecimientoId)?.nombre || "")
          : "";
        aVal = estA;
        bVal = estB;
      }

      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [filteredActores, sortKey, sortOrder, tiposMap, munisMap, grupos]);

  // Grouped actors
  const groupedActores = useMemo(() => {
    if (!groupBy) return null;
    const groupsMap: Record<string, ActorSocialRecord[]> = {};

    sortedActores.forEach((r) => {
      let groupKey = "Otros";
      if (groupBy === "municipalidad") {
        groupKey = munisMap[r.municipalidadId] || "Sin Municipalidad";
      } else if (groupBy === "tipoActor") {
        groupKey = tiposMap[r.tipoActorSocialId] || "Sin Tipo";
      } else if (groupBy === "establecimiento") {
        groupKey = r.grupoEstablecimientoId
          ? (grupos.flatMap(g => g.establecimientos || []).find(e => e.id === r.grupoEstablecimientoId)?.nombre || "Sin Establecimiento")
          : "Sin Establecimiento";
      }

      if (!groupsMap[groupKey]) {
        groupsMap[groupKey] = [];
      }
      groupsMap[groupKey].push(r);
    });

    return groupsMap;
  }, [sortedActores, groupBy, munisMap, tiposMap, grupos]);

  function toggleGroupCollapse(groupName: string) {
    setCollapsedGroups((curr) => ({
      ...curr,
      [groupName]: !curr[groupName],
    }));
  }

  function handleAddClick() {
    navigate("/actores-sociales/nuevo");
  }

  function handleRowClick(actor: ActorSocialRecord) {
    navigate(`/actores-sociales/${actor.id}`);
  }

  function renderRow(a: ActorSocialRecord) {
    return (
      <tr key={a.id} onClick={() => handleRowClick(a)} style={{ cursor: "pointer", opacity: a.activo ? 1 : 0.6 }}>
        <td onClick={(e) => e.stopPropagation()}><input type="checkbox" readOnly /></td>
        <td>
          {a.grupoEstablecimientoId 
            ? (grupos.flatMap(g => g.establecimientos || []).find(e => e.id === a.grupoEstablecimientoId)?.nombre || "-")
            : "-"}
        </td>
        <td>{a.dni}</td>
        <td>{a.apellidos}</td>
        <td>{a.nombres}</td>
        <td>{tiposMap[a.tipoActorSocialId] || "Cargando..."}</td>
        {user?.rol === "ADMIN_GENERAL" && (
          <td>{munisMap[a.municipalidadId] || "Cargando..."}</td>
        )}
        <td>
          <span className={`status-pill is-active`} style={{
            backgroundColor: a.estado === "APROBADO" ? "#2e7d32" : a.estado === "VALIDADO" ? "#0288d1" : "#e65100",
            color: "white"
          }}>{a.estado}</span>
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="admin-page-heading">
        <div className="flex-center-gap">
          <button className="admin-button is-primary" onClick={handleAddClick} style={{ backgroundColor: "#71639e", color: "white" }} type="button">
            Nuevo
          </button>
          <h1 className="h1-no-margin">Registro de Actores Sociales</h1>
        </div>
      </div>

      <section className="admin-content-card" aria-label="Listado de Actores Sociales" style={{ padding: "1.5rem", borderRadius: "0.55rem", border: "1px solid var(--border)", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {error && (
          <div className="admin-alert is-error admin-alert-margin">
            {error}
          </div>
        )}
        {message && (
          <div className="admin-alert is-success admin-alert-margin">
            {message}
          </div>
        )}

        <div style={{ position: "relative" }}>
          <div className="admin-actions-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div className="admin-search-field" style={{ position: "relative", flex: 1, maxWidth: "450px" }}>
              <LuSearch className="search-icon" size={18} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
              <input
                type="text"
                placeholder="Buscar por DNI, nombres o apellidos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", paddingLeft: "2.5rem" }}
              />
            </div>

            <div className="admin-actions-group" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <label style={{ display: "flex", margin: 0, alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: "500" }}>Agrupar por:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  style={{
                    height: "38px",
                    background: "white",
                    color: "#333",
                    border: "1px solid #ccc",
                    borderRadius: "0.25rem",
                    padding: "0 0.5rem",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Ninguno</option>
                  {user?.rol === "ADMIN_GENERAL" && <option value="municipalidad">Municipalidad</option>}
                  <option value="tipoActor">Tipo de Actor</option>
                  <option value="establecimiento">Establecimiento</option>
                </select>
              </label>

              <button
                className={`admin-button is-ghost ${showFilters ? "is-active" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
                style={{ height: "38px" }}
                type="button"
              >
                Filtros {showFilters ? "▲" : "▼"}
              </button>
            </div>
          </div>

          {showFilters && (
            <div
              className="admin-filters-panel"
              style={{
                position: "absolute",
                top: "calc(100% - 0.25rem)",
                right: 0,
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                padding: "1rem",
                background: "white",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                width: "300px",
              }}
            >
              {user?.rol === "ADMIN_GENERAL" && (
                <label className="field">
                  <span>Municipalidad</span>
                  <select
                    value={muniFilter}
                    onChange={(e) => setMuniFilter(e.target.value)}
                  >
                    <option value="">Todas</option>
                    {municipalidades.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field">
                <span>Estado</span>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="BORRADOR">Borrador</option>
                  <option value="REGISTRADO">Registrado</option>
                  <option value="VALIDADO">Validado</option>
                  <option value="APROBADO">Aprobado</option>
                </select>
              </label>

              <button
                className="admin-button is-secondary"
                onClick={() => {
                  setEstadoFilter("");
                  if (user?.rol === "ADMIN_GENERAL") {
                    setMuniFilter("");
                  }
                }}
                style={{ marginTop: "0.5rem" }}
                type="button"
              >
                Limpiar Filtros
              </button>
            </div>
          )}
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}><input type="checkbox" readOnly /></th>
                <th onClick={() => handleSort("establecimiento")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Establecimiento Salud{getSortIcon("establecimiento")}
                </th>
                <th onClick={() => handleSort("dni")} style={{ cursor: "pointer", userSelect: "none" }}>
                  DNI{getSortIcon("dni")}
                </th>
                <th onClick={() => handleSort("apellidos")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Apellidos{getSortIcon("apellidos")}
                </th>
                <th onClick={() => handleSort("nombres")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Nombres{getSortIcon("nombres")}
                </th>
                <th onClick={() => handleSort("tipoActor")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Tipo Actor Social{getSortIcon("tipoActor")}
                </th>
                {user?.rol === "ADMIN_GENERAL" && (
                  <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Municipalidad{getSortIcon("municipalidad")}
                  </th>
                )}
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {groupBy ? (
                groupedActores && Object.keys(groupedActores).map((groupName) => (
                  <Fragment key={groupName}>
                    <tr
                      onClick={() => toggleGroupCollapse(groupName)}
                      style={{ background: "#f8f9fa", cursor: "pointer", userSelect: "none" }}
                    >
                      <td colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7} style={{ fontWeight: "bold", padding: "0.75rem 1rem", borderBottom: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {collapsedGroups[groupName] ? <LuChevronRight size={16} /> : <LuChevronDown size={16} />}
                          <LuFolder size={18} style={{ color: "#71639e" }} />
                          <span>{groupName}</span>
                          <span style={{ color: "var(--muted)", fontWeight: "normal", fontSize: "0.85rem" }}>
                            ({groupedActores[groupName].length})
                          </span>
                        </div>
                      </td>
                    </tr>
                    {!collapsedGroups[groupName] && groupedActores[groupName].map((a) => renderRow(a))}
                  </Fragment>
                ))
              ) : (
                sortedActores.map((a) => renderRow(a))
              )}
              {!isLoading && filteredActores.length === 0 ? (
                <tr>
                  <td className="admin-empty-cell" colSpan={user?.rol === "ADMIN_GENERAL" ? 8 : 7}>
                    No se encontraron registros de actores sociales.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
