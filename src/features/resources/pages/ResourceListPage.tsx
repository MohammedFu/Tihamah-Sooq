import { Download, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { ResourcePage } from "../../../app/resources";

export function ResourceListPage({ resource }: { resource: ResourcePage }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const rows = useMemo(
    () => normalizedQuery
      ? resource.rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(normalizedQuery)))
      : resource.rows,
    [normalizedQuery, resource.rows],
  );

  const isExportAction = resource.actionLabel.toLowerCase().includes("export");
  const ActionIcon = isExportAction ? Download : Plus;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Tihamah-Sooq</p>
          <h1>{resource.label}</h1>
          <p className="muted">{resource.description}</p>
        </div>
        <button className="button" type="button"><ActionIcon size={17} />{resource.actionLabel}</button>
      </div>

      <section className="card table-card" style={{ marginTop: 0 }}>
        <div className="table-toolbar">
          <span className="muted" style={{ margin: 0 }}>{rows.length} records</span>
          <label style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: 11, top: 11, color: "#8a94a6" }} />
            <input
              className="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${resource.label.toLowerCase()}`}
              style={{ width: 280, paddingLeft: 36 }}
            />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>{resource.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {resource.columns.map((column) => (
                    <td key={column}>{isStatusColumn(column) ? <StatusBadge value={row[column]} /> : row[column]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="empty">No records match this search.</div>}
      </section>
    </>
  );
}

function isStatusColumn(column: string) {
  return ["Status", "Visibility", "Stock status"].includes(column);
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone = normalized.includes("out") || normalized.includes("hidden")
    ? "danger"
    : normalized.includes("pending") || normalized.includes("open") || normalized.includes("hold") || normalized.includes("low") || normalized.includes("draft")
      ? "warning"
      : normalized.includes("shipped") || normalized.includes("review") || normalized.includes("scheduled")
        ? "info"
        : "success";
  return <span className={`badge ${tone}`}>{value}</span>;
}
