import { useEffect, useState } from "react";
import { ItemFilters, normalizeItemFilters, normalizeTagIds } from "../../api";
import { SavedItemView } from "../types";

export function useItemFilters(selectedCollectionId: string) {
  const defaultSortBy: ItemFilters["sortBy"] = "updatedUtc";
  const defaultSortDirection: ItemFilters["sortDirection"] = "desc";
  const pageSize = 50;

  const [itemSearchText, setItemSearchText] = useState("");
  const [itemFilterLocationId, setItemFilterLocationId] = useState("");
  const [itemFilterTagIds, setItemFilterTagIds] = useState<string[]>([]);
  const [itemAttributeFilters, setItemAttributeFilters] = useState<Record<string, string>>({});
  const [itemSortBy, setItemSortBy] = useState<ItemFilters["sortBy"]>(defaultSortBy);
  const [itemSortDirection, setItemSortDirection] = useState<ItemFilters["sortDirection"]>(defaultSortDirection);
  const [itemPage, setItemPage] = useState(1);
  const [itemFilterMinQuantity, setItemFilterMinQuantity] = useState<number | undefined>(undefined);
  const [itemFilterMaxQuantity, setItemFilterMaxQuantity] = useState<number | undefined>(undefined);
  const [itemFilterCreatedAfter, setItemFilterCreatedAfter] = useState("");
  const [itemFilterCreatedBefore, setItemFilterCreatedBefore] = useState("");
  const [itemFilterHasNoLocation, setItemFilterHasNoLocation] = useState(false);
  const [itemFilterHasNoTags, setItemFilterHasNoTags] = useState(false);
  const [itemFilterTypeId, setItemFilterTypeId] = useState("");

  const normalizedItemFilterTagIds = normalizeTagIds(itemFilterTagIds);

  const itemFilters = normalizeItemFilters({
    searchText: itemSearchText,
    locationId: itemFilterLocationId,
    itemTypeId: itemFilterTypeId || undefined,
    tagIds: normalizedItemFilterTagIds,
    attributeFilters: itemAttributeFilters,
    sortBy: itemSortBy,
    sortDirection: itemSortDirection,
    minQuantity: itemFilterMinQuantity,
    maxQuantity: itemFilterMaxQuantity,
    createdAfter: itemFilterCreatedAfter || undefined,
    createdBefore: itemFilterCreatedBefore || undefined,
    hasNoLocation: itemFilterHasNoLocation || undefined,
    hasNoTags: itemFilterHasNoTags || undefined
  });

  useEffect(() => {
    clearItemFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollectionId]);

  function clearItemFilters() {
    setItemSearchText("");
    setItemFilterLocationId("");
    setItemFilterTagIds([]);
    setItemAttributeFilters({});
    setItemSortBy(defaultSortBy);
    setItemSortDirection(defaultSortDirection);
    setItemPage(1);
    setItemFilterMinQuantity(undefined);
    setItemFilterMaxQuantity(undefined);
    setItemFilterCreatedAfter("");
    setItemFilterCreatedBefore("");
    setItemFilterHasNoLocation(false);
    setItemFilterHasNoTags(false);
    setItemFilterTypeId("");
  }

  function toggleFilterTag(tagId: string) {
    setItemPage(1);
    setItemFilterTagIds((currentTagIds) =>
      currentTagIds.includes(tagId)
        ? currentTagIds.filter((currentTagId) => currentTagId !== tagId)
        : [...currentTagIds, tagId]
    );
  }

  function handleAttributeFilterChange(attributeKey: string, value: string) {
    setItemPage(1);
    setItemAttributeFilters((currentFilters) => ({
      ...currentFilters,
      [attributeKey]: value
    }));
  }

  function applyItemFilters(filters: ItemFilters) {
    const normalizedFilters = normalizeItemFilters(filters);

    setItemSearchText(normalizedFilters.searchText ?? "");
    setItemFilterLocationId(normalizedFilters.locationId ?? "");
    setItemFilterTypeId(normalizedFilters.itemTypeId ?? "");
    setItemFilterTagIds(normalizedFilters.tagIds ?? []);
    setItemAttributeFilters(normalizedFilters.attributeFilters ?? {});
    setItemSortBy(normalizedFilters.sortBy ?? defaultSortBy);
    setItemSortDirection(normalizedFilters.sortDirection ?? defaultSortDirection);
    setItemFilterMinQuantity(normalizedFilters.minQuantity);
    setItemFilterMaxQuantity(normalizedFilters.maxQuantity);
    setItemFilterCreatedAfter(normalizedFilters.createdAfter ?? "");
    setItemFilterCreatedBefore(normalizedFilters.createdBefore ?? "");
    setItemFilterHasNoLocation(normalizedFilters.hasNoLocation ?? false);
    setItemFilterHasNoTags(normalizedFilters.hasNoTags ?? false);
    setItemPage(1);
  }

  function applySavedView(view: SavedItemView) {
    applyItemFilters(view.filters);
  }

  return {
    itemFilters,
    itemSearchText,
    setItemSearchText,
    itemFilterLocationId,
    setItemFilterLocationId,
    itemFilterTagIds,
    setItemFilterTagIds,
    itemAttributeFilters,
    itemSortBy,
    setItemSortBy,
    itemSortDirection,
    setItemSortDirection,
    itemPage,
    setItemPage,
    pageSize,
    normalizedItemFilterTagIds,
    itemFilterMinQuantity,
    setItemFilterMinQuantity,
    itemFilterMaxQuantity,
    setItemFilterMaxQuantity,
    itemFilterCreatedAfter,
    setItemFilterCreatedAfter,
    itemFilterCreatedBefore,
    setItemFilterCreatedBefore,
    itemFilterHasNoLocation,
    setItemFilterHasNoLocation,
    itemFilterHasNoTags,
    setItemFilterHasNoTags,
    itemFilterTypeId,
    setItemFilterTypeId,
    clearItemFilters,
    toggleFilterTag,
    handleAttributeFilterChange,
    applyItemFilters,
    applySavedView
  };
}
