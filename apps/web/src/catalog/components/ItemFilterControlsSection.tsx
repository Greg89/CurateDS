import {
  AttributeDefinition,
  ItemFilters,
  ItemType,
  Location,
  Tag,
  countActiveItemFilters
} from "../../api";
import { renderAttributeInput } from "./DynamicAttributeFields";
import { TagMultiSelect } from "./TagMultiSelect";

export function ItemFilterControlsSection({
  attributeDefinitions,
  attributeFilters,
  createdAfter,
  createdBefore,
  disabled,
  hasNoLocation,
  hasNoTags,
  itemTypeId,
  itemTypes,
  locationId,
  locations,
  maxQuantity,
  minQuantity,
  searchText,
  selectedTagIds,
  sortBy,
  sortDirection,
  tags,
  onAttributeFilterChange,
  onClear,
  onCreatedAfterChange,
  onCreatedBeforeChange,
  onHasNoLocationChange,
  onHasNoTagsChange,
  onItemTypeIdChange,
  onLocationChange,
  onMaxQuantityChange,
  onMinQuantityChange,
  onSearchTextChange,
  onSortByChange,
  onSortDirectionChange,
  onToggleTag
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  attributeFilters: Record<string, string>;
  createdAfter: string;
  createdBefore: string;
  disabled: boolean;
  hasNoLocation: boolean;
  hasNoTags: boolean;
  itemTypeId: string;
  itemTypes: ItemType[];
  locationId: string;
  locations: Location[];
  maxQuantity: number | undefined;
  minQuantity: number | undefined;
  searchText: string;
  selectedTagIds: string[];
  sortBy: ItemFilters["sortBy"];
  sortDirection: ItemFilters["sortDirection"];
  tags: Tag[];
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onClear: () => void;
  onCreatedAfterChange: (value: string) => void;
  onCreatedBeforeChange: (value: string) => void;
  onHasNoLocationChange: (value: boolean) => void;
  onHasNoTagsChange: (value: boolean) => void;
  onItemTypeIdChange: (value: string) => void;
  onLocationChange: (locationId: string) => void;
  onMaxQuantityChange: (value: number | undefined) => void;
  onMinQuantityChange: (value: number | undefined) => void;
  onSearchTextChange: (searchText: string) => void;
  onSortByChange: (sortBy: ItemFilters["sortBy"]) => void;
  onSortDirectionChange: (sortDirection: ItemFilters["sortDirection"]) => void;
  onToggleTag: (tagId: string) => void;
}>) {
  const activeFilterCount = countActiveItemFilters({
    searchText,
    locationId,
    itemTypeId,
    tagIds: selectedTagIds,
    attributeFilters,
    sortBy,
    sortDirection,
    minQuantity,
    maxQuantity,
    createdAfter,
    createdBefore,
    hasNoLocation,
    hasNoTags
  });

  return (
    <>
      <div className="filter-grid">
        <label className="field">
          <span>Search</span>
          <input
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
            disabled={disabled}
            placeholder="Search titles, notes, tags, or custom values"
          />
        </label>

        <label className="field">
          <span>Location</span>
          <select
            value={locationId}
            onChange={(event) => onLocationChange(event.target.value)}
            disabled={disabled}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>

        {itemTypes.length > 0 ? (
          <label className="field">
            <span>Item Type</span>
            <select
              value={itemTypeId}
              onChange={(event) => onItemTypeIdChange(event.target.value)}
              disabled={disabled}
            >
              <option value="">All types</option>
              {itemTypes.map((itemType) => (
                <option key={itemType.id} value={itemType.id}>
                  {itemType.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="field">
          <span>Sort By</span>
          <select
            value={sortBy}
            onChange={(event) => onSortByChange(event.target.value as ItemFilters["sortBy"])}
            disabled={disabled}
          >
            <option value="updatedUtc">Recently updated</option>
            <option value="createdUtc">Recently created</option>
            <option value="name">Name</option>
            <option value="quantity">Quantity</option>
          </select>
        </label>

        <label className="field">
          <span>Direction</span>
          <select
            value={sortDirection}
            onChange={(event) =>
              onSortDirectionChange(event.target.value as ItemFilters["sortDirection"])
            }
            disabled={disabled}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>

        <label className="field">
          <span>Min Quantity</span>
          <input
            type="number"
            min={0}
            value={minQuantity ?? ""}
            onChange={(event) =>
              onMinQuantityChange(event.target.value === "" ? undefined : Number(event.target.value))
            }
            disabled={disabled}
            placeholder="e.g. 1"
          />
        </label>

        <label className="field">
          <span>Max Quantity</span>
          <input
            type="number"
            min={0}
            value={maxQuantity ?? ""}
            onChange={(event) =>
              onMaxQuantityChange(event.target.value === "" ? undefined : Number(event.target.value))
            }
            disabled={disabled}
            placeholder="e.g. 100"
          />
        </label>

        <label className="field">
          <span>Created After</span>
          <input
            type="date"
            value={createdAfter}
            onChange={(event) => onCreatedAfterChange(event.target.value)}
            disabled={disabled}
          />
        </label>

        <label className="field">
          <span>Created Before</span>
          <input
            type="date"
            value={createdBefore}
            onChange={(event) => onCreatedBeforeChange(event.target.value)}
            disabled={disabled}
          />
        </label>
      </div>

      <div className="filter-grid">
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={hasNoLocation}
            onChange={(event) => onHasNoLocationChange(event.target.checked)}
            disabled={disabled}
          />
          <span>No location assigned</span>
        </label>

        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={hasNoTags}
            onChange={(event) => onHasNoTagsChange(event.target.checked)}
            disabled={disabled}
          />
          <span>No tags assigned</span>
        </label>
      </div>

      {attributeDefinitions.length > 0 ? (
        <div className="dynamic-field-grid">
          {attributeDefinitions.map((attributeDefinition) => (
            <label className="field" key={attributeDefinition.id}>
              <span>{attributeDefinition.name}</span>
              {renderAttributeInput(
                attributeDefinition,
                attributeFilters,
                disabled,
                onAttributeFilterChange,
                attributeDefinition.key
              )}
            </label>
          ))}
        </div>
      ) : (
        <div className="empty-state compact">
          <p>No custom attribute filters yet.</p>
          <p>Mark attributes as filterable and they will appear here.</p>
        </div>
      )}

      {tags.length === 0 ? (
        <div className="empty-state compact">
          <p>No tags available for filtering yet.</p>
          <p>Create a tag in settings and it will appear here.</p>
        </div>
      ) : (
        <div className="field">
          <span>Tags</span>
          <TagMultiSelect
            disabled={disabled}
            emptyLabel="All tags"
            selectedTagIds={selectedTagIds}
            tags={tags}
            onToggle={onToggleTag}
          />
        </div>
      )}

      <div className="filter-actions">
        <p className="message">
          {activeFilterCount > 0 ? "Showing the narrowed item list." : "No filters applied yet."}
        </p>
        <button
          className="secondary-button"
          disabled={disabled || activeFilterCount === 0}
          onClick={onClear}
          type="button"
        >
          Clear Filters
        </button>
      </div>
    </>
  );
}
