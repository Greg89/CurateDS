import { useState } from "react";
import { ItemSummary, Location, Tag } from "../../api";
import { getTopUsageEntries } from "../utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { MetricCard } from "./MetricCard";
import { UsageBreakdown } from "./UsageBreakdown";

export function OrganizationSummary({
  items = [],
  locations,
  tags,
  isDeleteTagPending,
  isDeleteLocationPending,
  onDeleteTag,
  onDeleteLocation
}: Readonly<{
  items?: ItemSummary[];
  locations: Location[];
  tags: Tag[];
  isDeleteTagPending?: boolean;
  isDeleteLocationPending?: boolean;
  onDeleteTag?: (id: string) => void;
  onDeleteLocation?: (id: string) => void;
}>) {
  const [confirmDeleteTagId, setConfirmDeleteTagId] = useState<string | null>(null);
  const [confirmDeleteLocationId, setConfirmDeleteLocationId] = useState<string | null>(null);

  const topTags = getTopUsageEntries(
    tags.map((tag) => tag.name),
    items.flatMap((item) => item.tags)
  );
  const topLocations = getTopUsageEntries(
    locations.map((location) => location.name),
    items
      .map((item) => item.locationName)
      .filter((locationName): locationName is string => Boolean(locationName))
  );

  const confirmingTag = tags.find((t) => t.id === confirmDeleteTagId) ?? null;
  const confirmingLocation = locations.find((l) => l.id === confirmDeleteLocationId) ?? null;

  return (
    <>
      <div className="organization-grid">
        <div className="organization-summary-grid">
          <MetricCard label="Tags Ready" value={tags.length.toString()} />
          <MetricCard label="Locations Ready" value={locations.length.toString()} />
        </div>

        <div className="organization-usage-grid">
          <UsageBreakdown
            emptyCopy="Create tags and assign them to items to see usage patterns."
            entries={topTags}
            title="Top Tags"
          />
          <UsageBreakdown
            emptyCopy="Assign item locations to see which storage zones are most used."
            entries={topLocations}
            title="Top Locations"
          />
        </div>

        {tags.length > 0 && onDeleteTag ? (
          <div>
            <h4>Manage Tags</h4>
            <ul className="attribute-list">
              {tags.map((tag) => (
                <li className="attribute-card" key={tag.id}>
                  <div className="attribute-card-header">
                    <h3>{tag.name}</h3>
                    <span className="attribute-pill">{tag.key}</span>
                  </div>
                  <button
                    className="danger-button"
                    onClick={() => setConfirmDeleteTagId(tag.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {locations.length > 0 && onDeleteLocation ? (
          <div>
            <h4>Manage Locations</h4>
            <ul className="attribute-list">
              {locations.map((location) => (
                <li className="attribute-card" key={location.id}>
                  <div className="attribute-card-header">
                    <h3>{location.name}</h3>
                  </div>
                  {location.description ? (
                    <p className="attribute-meta">{location.description}</p>
                  ) : null}
                  <button
                    className="danger-button"
                    onClick={() => setConfirmDeleteLocationId(location.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {confirmingTag ? (
        <ConfirmDialog
          title={`Delete tag "${confirmingTag.name}"?`}
          message="This tag will be removed from all items. This action cannot be undone."
          isPending={isDeleteTagPending ?? false}
          onConfirm={() => {
            onDeleteTag?.(confirmingTag.id);
            setConfirmDeleteTagId(null);
          }}
          onCancel={() => setConfirmDeleteTagId(null)}
        />
      ) : null}

      {confirmingLocation ? (
        <ConfirmDialog
          title={`Delete location "${confirmingLocation.name}"?`}
          message="Items assigned to this location will have their location cleared. This action cannot be undone."
          isPending={isDeleteLocationPending ?? false}
          onConfirm={() => {
            onDeleteLocation?.(confirmingLocation.id);
            setConfirmDeleteLocationId(null);
          }}
          onCancel={() => setConfirmDeleteLocationId(null)}
        />
      ) : null}
    </>
  );
}
