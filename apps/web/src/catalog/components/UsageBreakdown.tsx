import { UsageEntry } from "../types";

export function UsageBreakdown({
  emptyCopy,
  entries,
  title
}: Readonly<{
  emptyCopy: string;
  entries: UsageEntry[];
  title: string;
}>) {
  return (
    <section className="usage-card">
      <div className="panel-header">
        <h3>{title}</h3>
        <p>{entries.length > 0 ? "Based on current item usage." : emptyCopy}</p>
      </div>

      {entries.length === 0 ? (
        <div className="empty-state compact">
          <p>No usage yet.</p>
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <ul className="usage-list">
          {entries.map((entry) => (
            <li className="usage-row" key={entry.name}>
              <div className="usage-row-header">
                <span className="usage-label">{entry.name}</span>
                <span className="usage-count">{entry.count}</span>
              </div>
              <div className="usage-bar-track">
                <div
                  className="usage-bar-fill"
                  style={{ width: `${Math.max(entry.percentage, 8)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
