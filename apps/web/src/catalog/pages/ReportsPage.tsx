import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCollectionReports,
  listCollectionActivity,
  type Collection,
} from "../../api";

interface ReportsPageProps {
  selectedCollection: Collection;
}

export function ReportsPage({ selectedCollection }: ReportsPageProps) {
  const [activityPage, setActivityPage] = useState(1);
  const pageSize = 20;

  const reportsQuery = useQuery({
    queryKey: ["collection-reports", selectedCollection.id],
    queryFn: () => getCollectionReports(selectedCollection.id),
  });

  const activityQuery = useQuery({
    queryKey: ["collection-activity", selectedCollection.id, activityPage],
    queryFn: () => listCollectionActivity(selectedCollection.id, activityPage, pageSize),
  });

  const reports = reportsQuery.data;
  const activity = activityQuery.data;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* Items by Location */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "oklch(0.92 0 0)" }}>
            Items by Location
          </h2>
          {reportsQuery.isLoading && <p style={{ color: "oklch(0.65 0 0)" }}>Loading…</p>}
          {reports && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Location</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Items</th>
                </tr>
              </thead>
              <tbody>
                {reports.itemsByLocation.map((row) => (
                  <tr key={row.locationId ?? "none"}>
                    <td style={tdStyle}>{row.locationName}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{row.count}</td>
                  </tr>
                ))}
                {reports.itemsByLocation.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ ...tdStyle, color: "oklch(0.55 0 0)" }}>
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>

        {/* Items by Tag */}
        <section>
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "oklch(0.92 0 0)" }}>
            Items by Tag
          </h2>
          {reportsQuery.isLoading && <p style={{ color: "oklch(0.65 0 0)" }}>Loading…</p>}
          {reports && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Tag</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Items</th>
                </tr>
              </thead>
              <tbody>
                {reports.itemsByTag.map((row) => (
                  <tr key={row.tagId}>
                    <td style={tdStyle}>{row.tagName}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{row.count}</td>
                  </tr>
                ))}
                {reports.itemsByTag.length === 0 && (
                  <tr>
                    <td colSpan={2} style={{ ...tdStyle, color: "oklch(0.55 0 0)" }}>
                      No data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Activity Feed */}
      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem", color: "oklch(0.92 0 0)" }}>
          Recent Activity
        </h2>
        {activityQuery.isLoading && <p style={{ color: "oklch(0.65 0 0)" }}>Loading…</p>}
        {activity && (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Item</th>
                  <th style={thStyle}>Event</th>
                  <th style={thStyle}>When</th>
                  <th style={thStyle}>By</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activity.events.map((e) => (
                  <tr key={e.eventId}>
                    <td style={tdStyle}>{e.itemName}</td>
                    <td style={tdStyle}>{e.eventType}</td>
                    <td style={tdStyle}>{new Date(e.occurredUtc).toLocaleString()}</td>
                    <td style={tdStyle}>{e.occurredBy}</td>
                    <td style={{ ...tdStyle, color: "oklch(0.65 0 0)" }}>{e.notes ?? "—"}</td>
                  </tr>
                ))}
                {activity.events.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, color: "oklch(0.55 0 0)" }}>
                      No activity yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {activity.totalPages > 1 && (
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", alignItems: "center" }}>
                <button
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage((p) => p - 1)}
                  style={paginationButtonStyle}
                >
                  Previous
                </button>
                <span style={{ color: "oklch(0.7 0 0)", fontSize: "0.875rem" }}>
                  Page {activity.page} of {activity.totalPages}
                </span>
                <button
                  disabled={activityPage >= activity.totalPages}
                  onClick={() => setActivityPage((p) => p + 1)}
                  style={paginationButtonStyle}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.4rem 0.5rem",
  borderBottom: "1px solid oklch(0.25 0 0)",
  color: "oklch(0.6 0 0)",
  fontWeight: 500,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "0.45rem 0.5rem",
  borderBottom: "1px solid oklch(0.2 0 0)",
  color: "oklch(0.85 0 0)",
};

const paginationButtonStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  fontSize: "0.8rem",
  borderRadius: "0.375rem",
  border: "1px solid oklch(0.3 0 0)",
  background: "transparent",
  color: "oklch(0.8 0 0)",
  cursor: "pointer",
};
