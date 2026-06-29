import { AttributeDefinition, ItemFilters, ItemType, Location, Tag } from "../../api";
import { SavedItemView } from "../types";
import { ItemFilterControlsSection } from "./ItemFilterControlsSection";
import { SavedViewsSection } from "./SavedViewsSection";

export function ItemFiltersPanel({
  attributeDefinitions,
  attributeFilters,
  disabled,
  locationId,
  locations,
  itemTypes,
  itemTypeId,
  savedViewName,
  savedViews,
  searchText,
  selectedTagIds,
  sortBy,
  sortDirection,
  tags,
  minQuantity,
  maxQuantity,
  createdAfter,
  createdBefore,
  hasNoLocation,
  hasNoTags,
  onApplySavedView,
  onAttributeFilterChange,
  onClear,
  onDeleteSavedView,
  onLocationChange,
  onItemTypeIdChange,
  onSavedViewNameChange,
  onSaveView,
  onSearchTextChange,
  onSortByChange,
  onSortDirectionChange,
  onToggleTag,
  onMinQuantityChange,
  onMaxQuantityChange,
  onCreatedAfterChange,
  onCreatedBeforeChange,
  onHasNoLocationChange,
  onHasNoTagsChange
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  attributeFilters: Record<string, string>;
  disabled: boolean;
  locationId: string;
  locations: Location[];
  itemTypes: ItemType[];
  itemTypeId: string;
  savedViewName: string;
  savedViews: SavedItemView[];
  searchText: string;
  selectedTagIds: string[];
  sortBy: ItemFilters["sortBy"];
  sortDirection: ItemFilters["sortDirection"];
  tags: Tag[];
  minQuantity: number | undefined;
  maxQuantity: number | undefined;
  createdAfter: string;
  createdBefore: string;
  hasNoLocation: boolean;
  hasNoTags: boolean;
  onApplySavedView: (view: SavedItemView) => void;
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onClear: () => void;
  onDeleteSavedView: (viewId: string) => void;
  onLocationChange: (locationId: string) => void;
  onItemTypeIdChange: (value: string) => void;
  onSavedViewNameChange: (name: string) => void;
  onSaveView: () => void;
  onSearchTextChange: (searchText: string) => void;
  onSortByChange: (sortBy: ItemFilters["sortBy"]) => void;
  onSortDirectionChange: (sortDirection: ItemFilters["sortDirection"]) => void;
  onToggleTag: (tagId: string) => void;
  onMinQuantityChange: (value: number | undefined) => void;
  onMaxQuantityChange: (value: number | undefined) => void;
  onCreatedAfterChange: (value: string) => void;
  onCreatedBeforeChange: (value: string) => void;
  onHasNoLocationChange: (value: boolean) => void;
  onHasNoTagsChange: (value: boolean) => void;
}>) {
  return (
    <section className="filter-panel">
      <div className="panel-header">
        <h3>Item Filters</h3>
        <p>Search across item details, locations, tags, and saved attribute values.</p>
      </div>

      <ItemFilterControlsSection
        attributeDefinitions={attributeDefinitions}
        attributeFilters={attributeFilters}
        createdAfter={createdAfter}
        createdBefore={createdBefore}
        disabled={disabled}
        hasNoLocation={hasNoLocation}
        hasNoTags={hasNoTags}
        itemTypeId={itemTypeId}
        itemTypes={itemTypes}
        locationId={locationId}
        locations={locations}
        maxQuantity={maxQuantity}
        minQuantity={minQuantity}
        searchText={searchText}
        selectedTagIds={selectedTagIds}
        sortBy={sortBy}
        sortDirection={sortDirection}
        tags={tags}
        onAttributeFilterChange={onAttributeFilterChange}
        onClear={onClear}
        onCreatedAfterChange={onCreatedAfterChange}
        onCreatedBeforeChange={onCreatedBeforeChange}
        onHasNoLocationChange={onHasNoLocationChange}
        onHasNoTagsChange={onHasNoTagsChange}
        onItemTypeIdChange={onItemTypeIdChange}
        onLocationChange={onLocationChange}
        onMaxQuantityChange={onMaxQuantityChange}
        onMinQuantityChange={onMinQuantityChange}
        onSearchTextChange={onSearchTextChange}
        onSortByChange={onSortByChange}
        onSortDirectionChange={onSortDirectionChange}
        onToggleTag={onToggleTag}
      />

      <SavedViewsSection
        disabled={disabled}
        savedViewName={savedViewName}
        savedViews={savedViews}
        onApplySavedView={onApplySavedView}
        onDeleteSavedView={onDeleteSavedView}
        onSavedViewNameChange={onSavedViewNameChange}
        onSaveView={onSaveView}
      />
    </section>
  );
}
