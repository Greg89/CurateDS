import { ItemFilters } from "../api";
import { SavedItemView, UsageEntry } from "./types";

export const sidebarStateStorageKey = "curateds:sidebar-collapsed";

export function getSavedViewsStorageKey(collectionId: string) {
  return `curateds:item-views:${collectionId}`;
}

export function readSavedViews(collectionId: string): SavedItemView[] {
  const savedViewsJson = window.localStorage.getItem(
    getSavedViewsStorageKey(collectionId)
  );

  if (!savedViewsJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(savedViewsJson) as SavedItemView[] | null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function describeSavedView(filters: ItemFilters) {
  const segments: string[] = [];

  if (filters.searchText?.trim()) {
    segments.push(`Search: ${filters.searchText.trim()}`);
  }

  if (filters.locationId) {
    segments.push("Location scoped");
  }

  if ((filters.tagIds?.length ?? 0) > 0) {
    segments.push(`${filters.tagIds!.length} tag filter${filters.tagIds!.length === 1 ? "" : "s"}`);
  }

  const attributeFilterCount = Object.values(filters.attributeFilters ?? {}).filter(
    (value) => value.trim().length > 0
  ).length;

  if (attributeFilterCount > 0) {
    segments.push(`${attributeFilterCount} attribute filter${attributeFilterCount === 1 ? "" : "s"}`);
  }

  segments.push(
    `Sort: ${describeSort(filters.sortBy ?? "updatedUtc", filters.sortDirection ?? "desc")}`
  );

  return segments.join(" | ");
}

export function describeSort(
  sortBy: NonNullable<ItemFilters["sortBy"]>,
  sortDirection: NonNullable<ItemFilters["sortDirection"]>
) {
  const sortLabel =
    sortBy === "createdUtc"
      ? "created date"
      : sortBy === "name"
        ? "name"
        : sortBy === "quantity"
          ? "quantity"
          : "updated date";

  return `${sortLabel} ${sortDirection === "asc" ? "ascending" : "descending"}`;
}

export function normalizeTagIds(tagIds: readonly string[]) {
  return [...new Set(tagIds.map((tagId) => tagId.trim()).filter((tagId) => tagId.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

export function buildItemFiltersCacheKey(filters: Readonly<ItemFilters>) {
  const normalizedAttributeFilters = Object.entries(filters.attributeFilters ?? {})
    .map(([attributeKey, value]) => [attributeKey.trim(), value.trim()] as const)
    .filter(([attributeKey, value]) => attributeKey.length > 0 && value.length > 0)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

  return JSON.stringify({
    searchText: filters.searchText?.trim() || "",
    locationId: filters.locationId?.trim() || "",
    itemTypeId: filters.itemTypeId?.trim() || "",
    tagIds: normalizeTagIds(filters.tagIds ?? []),
    attributeFilters: normalizedAttributeFilters,
    sortBy: filters.sortBy ?? "updatedUtc",
    sortDirection: filters.sortDirection ?? "desc",
    minQuantity: filters.minQuantity ?? null,
    maxQuantity: filters.maxQuantity ?? null,
    createdAfter: filters.createdAfter?.trim() || "",
    createdBefore: filters.createdBefore?.trim() || "",
    hasNoLocation: filters.hasNoLocation ?? false,
    hasNoTags: filters.hasNoTags ?? false
  });
}

export function getTopUsageEntries(
  availableNames: readonly string[],
  usedNames: readonly string[]
): UsageEntry[] {
  const usageCounts = new Map<string, number>();

  for (const name of availableNames) {
    usageCounts.set(name, 0);
  }

  for (const name of usedNames) {
    usageCounts.set(name, (usageCounts.get(name) ?? 0) + 1);
  }

  const maxCount = Math.max(0, ...usageCounts.values());

  return [...usageCounts.entries()]
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 10)
    .map(([name, count]) => ({
      name,
      count,
      percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
    }));
}

export function readSidebarCollapsedState() {
  const storedValue = window.localStorage.getItem(sidebarStateStorageKey);

  if (!storedValue) {
    return false;
  }

  try {
    return JSON.parse(storedValue) === true;
  } catch {
    return false;
  }
}
