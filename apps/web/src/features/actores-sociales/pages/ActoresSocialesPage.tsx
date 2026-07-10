import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuSearch, LuChevronRight, LuChevronDown, LuFolder, LuArrowUp, LuArrowDown, LuArrowUpDown } from "react-icons/lu";
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
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortKey("NONE");
      }
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  }

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <LuArrowUpDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", opacity: 0.4 }} />;
    }
    return sortOrder === "asc" ? (
      <LuArrowUp size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    ) : (
      <LuArrowDown size={14} style={{ marginLeft: "0.25rem", verticalAlign: "middle", color: "var(--primary)" }} />
    );
  };

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
    if (sortKey === "NONE") return sorted;
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

  const expandAllGroups = () => {
    if (!groupedActores) return;
    const expanded: Record<string, boolean> = {};
    Object.keys(groupedActores).forEach((key) => {
      expanded[key] = false;
    });
    setCollapsedGroups(expanded);
  };

  const collapseAllGroups = () => {
    if (!groupedActores) return;
    const collapsed: Record<string, boolean> = {};
    Object.keys(groupedActores).forEach((key) => {
      collapsed[key] = true;
    });
    setCollapsedGroups(collapsed);
  };

  useEffect(() => {
    if (groupBy && groupedActores) {
      const initialCollapsed: Record<string, boolean> = {};
      Object.keys(groupedActores).forEach((key) => {
        initialCollapsed[key] = true;
      });
      setCollapsedGroups(initialCollapsed);
    }
  }, [groupBy, groupedActores]);

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

        <div style={{ marginBottom: "1.5rem" }}>
          <div className="admin-filters-grid">
            <div className="field">
              <span>Buscar Actor Social</span>
              <div className="admin-search-field" style={{ border: "1px solid var(--border)", background: "white" }}>
                <LuSearch style={{ marginRight: "0.5rem" }} />
                <input
                  type="text"
                  placeholder="Buscar por DNI, nombres o apellidos..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {user?.rol === "ADMIN_GENERAL" && (
              <div className="field">
                <span>Municipalidad</span>
                <select
                  className="admin-select"
                  value={muniFilter}
                  onChange={(e) => setMuniFilter(e.target.value)}
                >
                  <option value="">Todas las Municipalidades</option>
                  {municipalidades.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="field">
              <span>Estado</span>
              <select
                className="admin-select"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="REGISTRADO">Registrado</option>
                <option value="VALIDADO">Validado</option>
                <option value="APROBADO">Aprobado</option>
              </select>
            </div>

            <div className="field">
              <span>Agrupar Actores Sociales por</span>
              <select
                className="admin-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="">Ninguno</option>
                {user?.rol === "ADMIN_GENERAL" && <option value="municipalidad">Municipalidad</option>}
                <option value="tipoActor">Tipo de Actor</option>
                <option value="establecimiento">Establecimiento</option>
              </select>
            </div>
          </div>
        </div>

        <div className="admin-table-meta">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span>{filteredActores.length} actores sociales encontrados</span>
            {groupBy !== "" && (
              <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.8rem", alignItems: "center" }}>
                <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={expandAllGroups}>
                  Expandir todos
                </button>
                <span style={{ color: "#ccc" }}>|</span>
                <button type="button" className="admin-button is-ghost" style={{ padding: 0, height: "auto", fontSize: "0.8rem", color: "var(--primary)" }} onClick={collapseAllGroups}>
                  Colapsar todos
                </button>
              </div>
            )}
          </div>
          <span>
            {isLoading ? "Cargando..." : `1-${filteredActores.length} de ${filteredActores.length}`}
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}><input type="checkbox" readOnly /></th>
                <th onClick={() => handleSort("establecimiento")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Establecimiento Salud {renderSortIcon("establecimiento")}
                </th>
                <th onClick={() => handleSort("dni")} style={{ cursor: "pointer", userSelect: "none" }}>
                  DNI {renderSortIcon("dni")}
                </th>
                <th onClick={() => handleSort("apellidos")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Apellidos {renderSortIcon("apellidos")}
                </th>
                <th onClick={() => handleSort("nombres")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Nombres {renderSortIcon("nombres")}
                </th>
                <th onClick={() => handleSort("tipoActor")} style={{ cursor: "pointer", userSelect: "none" }}>
                  Tipo Actor Social {renderSortIcon("tipoActor")}
                </th>
                {user?.rol === "ADMIN_GENERAL" && (
                  <th onClick={() => handleSort("municipalidad")} style={{ cursor: "pointer", userSelect: "none" }}>
                    Municipalidad {renderSortIcon("municipalidad")}
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
