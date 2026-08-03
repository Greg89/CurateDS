import { useMemo, useState } from "react";

export interface EntityManagementRow {
  id: string;
  name: string;
  secondary?: string;
  description?: string;
  usageCount: number;
}

type SortColumn = "name" | "usage";
type SortDirection = "asc" | "desc";

export function EntityManagementTable({
  title,
  rows,
  pageSize,
  onDelete,
  isDeletePending = false,
  emptyCopy,
  searchPlaceholder
}: Readonly<{
  title: string;
  rows: EntityManagementRow[];
  pageSize: number;
  onDelete: (id: string) => void;
  isDeletePending?: boolean;
  emptyCopy?: string;
  searchPlaceholder?: string;
}>) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const haystack = [r.name, r.secondary ?? "", r.description ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [rows, search]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sortColumn === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const cmp = a.usageCount - b.usageCount;
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      // sensible default: name asc, usage desc
      setSortDirection(column === "name" ? "asc" : "desc");
    }
    setPage(1);
  }

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " (asc)" : " (desc)";
  }

  return (
    <section className="entity-management">
      <header className="entity-management-header">
        <h4>{title}</h4>
        <input
          className="entity-management-search"
          type="search"
          placeholder={searchPlaceholder ?? "Search..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </header>

      {rows.length === 0 ? (
        <p className="entity-management-empty">{emptyCopy ?? "Nothing here yet."}</p>
      ) : (
        <>
          <div className="entity-management-table-wrap">
            <table className="entity-management-table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="entity-management-sort"
                      onClick={() => toggleSort("name")}
                    >
                      Name{sortIndicator("name")}
                    </button>
                  </th>
                  <th className="entity-management-secondary-col">Key</th>
                  <th className="entity-management-numeric-col">
                    <button
                      type="button"
                      className="entity-management-sort"
                      onClick={() => toggleSort("usage")}
                    >
                      Items{sortIndicator("usage")}
                    </button>
                  </th>
                  <th className="entity-management-actions-col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="entity-management-name">{row.name}</div>
                      {row.description ? (
                        <div className="entity-management-description">{row.description}</div>
                      ) : null}
                    </td>
                    <td className="entity-management-secondary-col">
                      {row.secondary ? (
                        <span className="attribute-pill">{row.secondary}</span>
                      ) : (
                        <span className="entity-management-muted">-</span>
                      )}
                    </td>
                    <td className="entity-management-numeric-col">{row.usageCount}</td>
                    <td className="entity-management-actions-col">
                      <button
                        className="danger-button entity-management-delete"
                        type="button"
                        onClick={() => onDelete(row.id)}
                        disabled={isDeletePending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="entity-management-muted">
                      No matches.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {sorted.length > pageSize ? (
            <div className="entity-management-pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                Previous
              </button>
              <span className="entity-management-page-info">
                Page {safePage} of {totalPages} - {sorted.length} total
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
