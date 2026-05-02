import { useMemo, useState } from "react";
import { ItemSummary, Location, Tag } from "../../api";
import { getTopUsageEntries } from "../utils";
import { ConfirmDialog } from "./ConfirmDialog";
import { EntityManagementTable, EntityManagementRow } from "./EntityManagementTable";
import { MetricCard } from "./MetricCard";
import { UsageBreakdown } from "./UsageBreakdown";

const MANAGEMENT_PAGE_SIZE = 25;

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

  const tagUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const locationUsageCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      if (item.locationName) {
        counts.set(item.locationName, (counts.get(item.locationName) ?? 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const tagRows: EntityManagementRow[] = useMemo(
    () =>
      tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        secondary: tag.key,
        usageCount: tagUsageCounts.get(tag.name) ?? 0
      })),
    [tags, tagUsageCounts]
  );

  const locationRows: EntityManagementRow[] = useMemo(
    () =>
      locations.map((location) => ({
        id: location.id,
        name: location.name,
        description: location.description ?? undefined,
        usageCount: locationUsageCounts.get(location.name) ?? 0
      })),
    [locations, locationUsageCounts]
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
          <EntityManagementTable
            title="Manage Tags"
            rows={tagRows}
            pageSize={MANAGEMENT_PAGE_SIZE}
            isDeletePending={isDeleteTagPending ?? false}
            onDelete={(id) => setConfirmDeleteTagId(id)}
            searchPlaceholder="Search tags\u2026"
            emptyCopy="No tags created yet."
          />
        ) : null}

        {locations.length > 0 && onDeleteLocation ? (
          <EntityManagementTable
            title="Manage Locations"
            rows={locationRows}
            pageSize={MANAGEMENT_PAGE_SIZE}
            isDeletePending={isDeleteLocationPending ?? false}
            onDelete={(id) => setConfirmDeleteLocationId(id)}
            searchPlaceholder="Search locations\u2026"
            emptyCopy="No locations created yet."
          />
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
