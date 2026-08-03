import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  buildItemFiltersSearchParams,
  getCollectionReports,
  listCollectionActivity,
  type Collection,
} from "../../api";

interface ReportsPageProps {
  selectedCollection: Collection;
}

export function ReportsPage({ selectedCollection }: ReportsPageProps) {
  const navigate = useNavigate();
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

  function drillToLocation(locationId: string | null) {
    const search = buildItemFiltersSearchParams(
      locationId ? { locationId } : { hasNoLocation: true }
    );
    navigate(`/collections/${selectedCollection.id}/items?${search.toString()}`);
  }

  function drillToTag(tagId: string) {
    const search = buildItemFiltersSearchParams({ tagIds: [tagId] });
    navigate(`/collections/${selectedCollection.id}/items?${search.toString()}`);
  }

  function drillToItem(itemId: string) {
    const search = new URLSearchParams({ itemId });
    navigate(`/collections/${selectedCollection.id}/items?${search.toString()}`);
  }

  return (
    <div className="reports-grid">
      <div className="reports-aggregates">
        <section className="reports-card">
          <header className="reports-card-header">
            <h2>Items by Location</h2>
            <p className="reports-card-subtitle">Click a location to view its items.</p>
          </header>
          {reportsQuery.isLoading ? <p className="reports-loading">Loading...</p> : null}
          {reports ? (
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th className="reports-numeric">Items</th>
                </tr>
              </thead>
              <tbody>
                {reports.itemsByLocation.map((row) => (
                  <tr key={row.locationId ?? "none"}>
                    <td>
                      <button
                        type="button"
                        className="reports-drill-link"
                        onClick={() => drillToLocation(row.locationId)}
                      >
                        {row.locationName}
                      </button>
                    </td>
                    <td className="reports-numeric">{row.count}</td>
                  </tr>
                ))}
                {reports.itemsByLocation.length === 0 ? (
                  <tr>
                    <td className="reports-empty" colSpan={2}>
                      No data yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="reports-card">
          <header className="reports-card-header">
            <h2>Items by Tag</h2>
            <p className="reports-card-subtitle">Click a tag to view items with it.</p>
          </header>
          {reportsQuery.isLoading ? <p className="reports-loading">Loading...</p> : null}
          {reports ? (
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th className="reports-numeric">Items</th>
                </tr>
              </thead>
              <tbody>
                {reports.itemsByTag.map((row) => (
                  <tr key={row.tagId}>
                    <td>
                      <button
                        type="button"
                        className="reports-drill-link"
                        onClick={() => drillToTag(row.tagId)}
                      >
                        {row.tagName}
                      </button>
                    </td>
                    <td className="reports-numeric">{row.count}</td>
                  </tr>
                ))}
                {reports.itemsByTag.length === 0 ? (
                  <tr>
                    <td className="reports-empty" colSpan={2}>
                      No data yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>

      <section className="reports-activity-card">
        <header className="reports-card-header">
          <h2>Recent Activity</h2>
          <p className="reports-card-subtitle">Latest changes across this collection.</p>
        </header>
        {activityQuery.isLoading ? <p className="reports-loading">Loading...</p> : null}
        {activity ? (
          <>
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Event</th>
                  <th>When</th>
                  <th>By</th>
                  <th>Notes</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {activity.events.map((e) => (
                  <tr key={e.eventId}>
                    <td>{e.itemName}</td>
                    <td>{e.eventType}</td>
                    <td>{new Date(e.occurredUtc).toLocaleString()}</td>
                    <td>{e.occurredBy}</td>
                    <td className="entity-management-muted">{e.notes ?? "-"}</td>
                    <td className="reports-numeric">
                      <button
                        type="button"
                        className="reports-view-button"
                        onClick={() => drillToItem(e.itemId)}
                      >
                        View item
                      </button>
                    </td>
                  </tr>
                ))}
                {activity.events.length === 0 ? (
                  <tr>
                    <td className="reports-empty" colSpan={6}>
                      No activity yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            {activity.totalPages > 1 ? (
              <div className="reports-pagination">
                <button
                  type="button"
                  disabled={activityPage <= 1}
                  onClick={() => setActivityPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {activity.page} of {activity.totalPages}
                </span>
                <button
                  type="button"
                  disabled={activityPage >= activity.totalPages}
                  onClick={() => setActivityPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

