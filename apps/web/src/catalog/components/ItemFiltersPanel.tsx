import { AttributeDefinition, ItemFilters, Location, Tag } from "../../api";
import { SavedItemView } from "../types";
import { describeSavedView } from "../utils";
import { renderAttributeInput } from "./DynamicAttributeFields";
import { TagMultiSelect } from "./TagMultiSelect";

export function ItemFiltersPanel({
  attributeDefinitions,
  attributeFilters,
  disabled,
  locationId,
  locations,
  savedViewName,
  savedViews,
  searchText,
  selectedTagIds,
  sortBy,
  sortDirection,
  tags,
  onApplySavedView,
  onAttributeFilterChange,
  onClear,
  onDeleteSavedView,
  onLocationChange,
  onSavedViewNameChange,
  onSaveView,
  onSearchTextChange,
  onSortByChange,
  onSortDirectionChange,
  onToggleTag
}: Readonly<{
  attributeDefinitions: AttributeDefinition[];
  attributeFilters: Record<string, string>;
  disabled: boolean;
  locationId: string;
  locations: Location[];
  savedViewName: string;
  savedViews: SavedItemView[];
  searchText: string;
  selectedTagIds: string[];
  sortBy: ItemFilters["sortBy"];
  sortDirection: ItemFilters["sortDirection"];
  tags: Tag[];
  onApplySavedView: (view: SavedItemView) => void;
  onAttributeFilterChange: (attributeKey: string, value: string) => void;
  onClear: () => void;
  onDeleteSavedView: (viewId: string) => void;
  onLocationChange: (locationId: string) => void;
  onSavedViewNameChange: (name: string) => void;
  onSaveView: () => void;
  onSearchTextChange: (searchText: string) => void;
  onSortByChange: (sortBy: ItemFilters["sortBy"]) => void;
  onSortDirectionChange: (sortDirection: ItemFilters["sortDirection"]) => void;
  onToggleTag: (tagId: string) => void;
}>) {
  const hasActiveFilters =
    searchText.trim().length > 0 ||
    locationId.length > 0 ||
    selectedTagIds.length > 0 ||
    Object.values(attributeFilters).some((value) => value.trim().length > 0) ||
    sortBy !== "updatedUtc" ||
    sortDirection !== "desc";

  return (
    <section className="filter-panel">
      <div className="panel-header">
        <h3>Item Filters</h3>
        <p>Search across item details, locations, tags, and saved attribute values.</p>
      </div>

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

        <label className="field">
          <span>Sort By</span>
          <select
            value={sortBy}
            onChange={(event) =>
              onSortByChange(event.target.value as ItemFilters["sortBy"])
            }
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
              onSortDirectionChange(
                event.target.value as ItemFilters["sortDirection"]
              )
            }
            disabled={disabled}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
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
          {hasActiveFilters ? "Showing the narrowed item list." : "No filters applied yet."}
        </p>
        <button
          className="secondary-button"
          disabled={disabled || !hasActiveFilters}
          onClick={onClear}
          type="button"
        >
          Clear Filters
        </button>
      </div>

      <div className="saved-view-panel">
        <div className="panel-header">
          <h3>Saved Views</h3>
          <p>Keep favorite filter and sort combinations ready for later.</p>
        </div>

        <div className="saved-view-create">
          <label className="field">
            <span>View Name</span>
            <input
              value={savedViewName}
              onChange={(event) => onSavedViewNameChange(event.target.value)}
              disabled={disabled}
              placeholder="Wishlist on shelf"
              maxLength={60}
            />
          </label>

          <button
            className="secondary-button"
            disabled={disabled || savedViewName.trim().length === 0}
            onClick={onSaveView}
            type="button"
          >
            Save View
          </button>
        </div>

        {savedViews.length === 0 ? (
          <div className="empty-state compact">
            <p>No saved views yet.</p>
            <p>Save a filter set once and reuse it whenever this collection comes back up.</p>
          </div>
        ) : (
          <ul className="saved-view-list">
            {savedViews.map((view) => (
              <li className="saved-view-card" key={view.id}>
                <div>
                  <h3>{view.name}</h3>
                  <p>{describeSavedView(view.filters)}</p>
                </div>
                <div className="saved-view-actions">
                  <button className="secondary-button" onClick={() => onApplySavedView(view)} type="button">
                    Apply
                  </button>
                  <button className="secondary-button" onClick={() => onDeleteSavedView(view.id)} type="button">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
