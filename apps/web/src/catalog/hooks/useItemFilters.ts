import { useEffect, useState } from "react";
import { ItemFilters } from "../../api";
import { SavedItemView } from "../types";
import { normalizeTagIds } from "../utils";

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

  const normalizedItemFilterTagIds = normalizeTagIds(itemFilterTagIds);

  const itemFilters: ItemFilters = {
    searchText: itemSearchText,
    locationId: itemFilterLocationId,
    tagIds: normalizedItemFilterTagIds,
    attributeFilters: itemAttributeFilters,
    sortBy: itemSortBy,
    sortDirection: itemSortDirection
  };

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

  function applySavedView(view: SavedItemView) {
    setItemSearchText(view.filters.searchText ?? "");
    setItemFilterLocationId(view.filters.locationId ?? "");
    setItemFilterTagIds(view.filters.tagIds ?? []);
    setItemAttributeFilters(view.filters.attributeFilters ?? {});
    setItemSortBy(view.filters.sortBy ?? defaultSortBy);
    setItemSortDirection(view.filters.sortDirection ?? defaultSortDirection);
    setItemPage(1);
  }

  return {
    itemFilters,
    itemSearchText,
    setItemSearchText,
    itemFilterLocationId,
    setItemFilterLocationId,
    itemFilterTagIds,
    itemAttributeFilters,
    itemSortBy,
    setItemSortBy,
    itemSortDirection,
    setItemSortDirection,
    itemPage,
    setItemPage,
    pageSize,
    normalizedItemFilterTagIds,
    clearItemFilters,
    toggleFilterTag,
    handleAttributeFilterChange,
    applySavedView
  };
}
