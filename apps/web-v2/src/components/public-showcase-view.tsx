import type { PublicShowcase } from "@/lib/publication";

function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Pure presentation shared by the exact owner review and the anonymous edition.
// No catalog requests, account context, workspace links, or external image URLs.
export function PublicShowcaseView({
  showcase: s,
  imageUrl,
}: {
  showcase: PublicShowcase;
  imageUrl: (asset: string) => string;
}) {
  function cards(
    items: NonNullable<PublicShowcase["highlights"]>,
    title: string,
    note: string,
  ) {
    return (
      <section className="public-gallery" aria-label={title}>
        <header>
          <p className="public-eyebrow">{note}</p>
          <h2>{title}</h2>
        </header>
        {items.length ? (
          <ol>
            {items.map((item, index) => (
              <li key={item.token}>
                <div className="public-image">
                  <span aria-hidden="true">{item.name.slice(0, 1)}</span>
                  {item.imageToken && (
                    <img
                      src={imageUrl(item.imageToken)}
                      alt={item.name}
                      loading="lazy"
                      width="640"
                      height="480"
                    />
                  )}
                </div>
                <div className="public-caption">
                  <span className="public-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 dir="auto">{item.name}</h3>
                    {item.description && <p dir="auto">{item.description}</p>}
                    {item.descriptionTruncated && (
                      <small>Description shortened for this edition.</small>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="public-muted">Nothing selected for this edition.</p>
        )}
      </section>
    );
  }
  return (
    <article
      className="public-showcase"
      data-color={s.color}
      data-layout={s.layout}
    >
      <header
        className={`public-intro${s.showCover ? " public-with-cover" : ""}`}
      >
        <div>
          <p className="public-eyebrow">
            {s.category || "A personal collection"}
          </p>
          <h1 dir="auto">{s.title}</h1>
          {s.description && (
            <p className="public-story" dir="auto">
              {s.description}
            </p>
          )}
          <p className="public-date">
            An edition from <time dateTime={s.asOfUtc}>{date(s.asOfUtc)}</time>
          </p>
        </div>
        {s.showCover && (
          <div className="public-cover" aria-hidden="true">
            <span>{s.title.slice(0, 1)}</span>
            <i>CurateDS</i>
          </div>
        )}
      </header>
      {s.summary && (
        <dl className="public-summary" aria-label="Collection at a glance">
          <div>
            <dt>{s.itemsLabel}</dt>
            <dd>{s.summary.totalItems.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Images</dt>
            <dd>{s.summary.totalMedia.toLocaleString("en-US")}</dd>
          </div>
          <div>
            <dt>Tags in use</dt>
            <dd>{s.summary.tagsInUse.toLocaleString("en-US")}</dd>
          </div>
        </dl>
      )}
      {s.highlights &&
        cards(s.highlights, "Selected with care.", "The highlights")}
      {s.recent && cards(s.recent, "The latest finds.", "Recently gathered")}
      {(s.growth || s.types) && (
        <section className="public-reports" aria-label="Collection reports">
          <header>
            <p className="public-eyebrow">The whole collection</p>
            <h2>A little perspective.</h2>
            <p>
              Reports include the entire collection, as of {date(s.asOfUtc)}.
            </p>
          </header>
          <div className="public-report-grid">
            {s.growth && (
              <section aria-label="Twelve-month additions">
                <h3>Twelve months of additions</h3>
                <ol className="public-bars">
                  {s.growth.map((bucket) => (
                    <li key={bucket.fromUtc}>
                      <span>
                        {new Date(bucket.fromUtc).toLocaleDateString("en-US", {
                          month: "short",
                          year: "2-digit",
                          timeZone: "UTC",
                        })}
                      </span>
                      <meter
                        min={0}
                        max={Math.max(1, ...s.growth!.map((v) => v.count))}
                        value={bucket.count}
                        aria-label={`Additions from ${date(bucket.fromUtc)} to ${date(bucket.untilUtc)}`}
                      />
                      <strong>{bucket.count.toLocaleString("en-US")}</strong>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {s.types && (
              <section aria-label="Item types">
                <h3>By type</h3>
                <dl className="public-types">
                  {s.types.groups.map((group, index) => (
                    <div key={index}>
                      <dt dir="auto">{group.name || "Unassigned"}</dt>
                      <dd>{group.count.toLocaleString("en-US")}</dd>
                    </div>
                  ))}
                </dl>
                {s.types.totalGroups > s.types.groups.length && (
                  <p>
                    Showing the {s.types.groups.length} largest of{" "}
                    {s.types.totalGroups} groups.
                  </p>
                )}
                {!s.types.groups.length && <p>No types in this edition.</p>}
              </section>
            )}
          </div>
        </section>
      )}
      {!s.highlights && !s.recent && !s.growth && !s.types && (
        <section className="public-quiet">
          <h2>A quiet introduction.</h2>
          <p>A small window into things worth keeping.</p>
        </section>
      )}
      <footer className="public-edition-note">
        A curated snapshot. This edition does not change as its collection
        grows.
      </footer>
    </article>
  );
}
