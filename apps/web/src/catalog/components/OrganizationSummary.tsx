import { ItemSummary, Location, Tag } from "../../api";
import { getTopUsageEntries } from "../utils";
import { MetricCard } from "./MetricCard";
import { UsageBreakdown } from "./UsageBreakdown";

export function OrganizationSummary({
  items = [],
  locations,
  tags
}: Readonly<{
  items?: ItemSummary[];
  locations: Location[];
  tags: Tag[];
}>) {
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

  return (
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
    </div>
  );
}
