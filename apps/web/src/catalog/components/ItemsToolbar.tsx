interface ItemsToolbarProps {
  searchText: string;
  onSearchTextChange: (v: string) => void;
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  viewMode: "cards" | "table";
  onViewModeChange: (mode: "cards" | "table") => void;
  onAddItem: () => void;
}

export function ItemsToolbar({
  searchText,
  onSearchTextChange,
  isFiltersOpen,
  onToggleFilters,
  activeFilterCount,
  viewMode,
  onViewModeChange,
  onAddItem,
}: Readonly<ItemsToolbarProps>) {
  return (
    <div className="panel items-toolbar">
      <input
        className="items-toolbar-search"
        placeholder="Search items"
        value={searchText}
        onChange={(e) => onSearchTextChange(e.target.value)}
      />
      <button
        className={`secondary-button filters-toggle${isFiltersOpen ? " active" : ""}`}
        onClick={onToggleFilters}
        type="button"
      >
        Filters
        {activeFilterCount > 0 && (
          <span className="filter-badge">{activeFilterCount}</span>
        )}
      </button>
      <div className="view-toggle" role="group" aria-label="View mode">
        <button
          aria-label="Card view"
          aria-pressed={viewMode === "cards"}
          className={`secondary-button view-toggle-btn${viewMode === "cards" ? " active" : ""}`}
          onClick={() => onViewModeChange("cards")}
          title="Card view"
          type="button"
        >
          &#9646;&#9646;
        </button>
        <button
          aria-label="Table view"
          aria-pressed={viewMode === "table"}
          className={`secondary-button view-toggle-btn${viewMode === "table" ? " active" : ""}`}
          onClick={() => onViewModeChange("table")}
          title="Table view"
          type="button"
        >
          &#9776;
        </button>
      </div>
      <button
        className="primary-button"
        onClick={onAddItem}
        type="button"
      >
        + Add Item
      </button>
    </div>
  );
}
