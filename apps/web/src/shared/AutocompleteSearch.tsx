import { useEffect, useMemo, useRef, useState } from "react";

export type AutocompleteOption = {
  id: string;
  name: string;
  subtext?: string;
  raw?: any;
};

export type AutocompleteProps = {
  label: string;
  placeholder: string;
  value: string;
  displayValue: string;
  options: AutocompleteOption[];
  onChange: (id: string, name: string, raw?: any) => void;
  onSearchMore: () => void;
  disabled?: boolean;
  required?: boolean;
};

export function AutocompleteSearch({
  label,
  placeholder,
  value,
  displayValue,
  options,
  onChange,
  onSearchMore,
  disabled = false,
  required = false,
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(q) ||
        (opt.subtext && opt.subtext.toLowerCase().includes(q))
    );
  }, [search, options]);

  return (
    <div className="admin-autocomplete-container" ref={containerRef} style={{ position: "relative", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label className="field" style={{ margin: 0 }}>
        {label} {required && "*"}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder={placeholder}
            disabled={disabled}
            value={isOpen ? search : displayValue || ""}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              setSearch("");
              setIsOpen(true);
            }}
            style={{ width: "100%", paddingRight: "2rem" }}
          />
          <span
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--muted)",
              fontSize: "0.8rem",
            }}
          >
            ▼
          </span>
        </div>
      </label>

      {isOpen && !disabled && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            width: "100%",
            maxHeight: "220px",
            overflowY: "auto",
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "0.25rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.15)",
            zIndex: 999,
            margin: 0,
            padding: 0,
            listStyle: "none",
          }}
        >
          {filtered.slice(0, 8).map((opt) => (
            <li
              key={opt.id}
              onClick={() => {
                onChange(opt.id, opt.name, opt.raw);
                setIsOpen(false);
              }}
              style={{
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                background: value === opt.id ? "#f3e8ff" : "white",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f7f7f7")}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = value === opt.id ? "#f3e8ff" : "white")
              }
            >
              <div style={{ fontWeight: "500", fontSize: "0.9rem" }}>{opt.name}</div>
              {opt.subtext && <div style={{ fontSize: "0.75rem", color: "#666" }}>{opt.subtext}</div>}
            </li>
          ))}

          {filtered.length === 0 && (
            <li style={{ padding: "0.5rem 0.75rem", color: "#888", fontSize: "0.85rem" }}>
              No se encontraron resultados
            </li>
          )}

          <li
            onClick={() => {
              onSearchMore();
              setIsOpen(false);
            }}
            style={{
              padding: "0.6rem 0.75rem",
              cursor: "pointer",
              background: "#fafafa",
              color: "#71639e",
              fontWeight: "bold",
              borderTop: "1px solid #ddd",
              textAlign: "center",
              fontSize: "0.85rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f0ebf7")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
          >
            Buscar más...
          </li>
        </ul>
      )}
    </div>
  );
}
