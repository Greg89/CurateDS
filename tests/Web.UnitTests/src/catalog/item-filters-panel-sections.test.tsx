import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ItemFilterControlsSection } from "@app/catalog/components/ItemFilterControlsSection";
import { SavedViewsSection } from "@app/catalog/components/SavedViewsSection";

describe("Item filters panel sections", () => {
  it("enables clear filters and shows the narrowed state when active filters are present", () => {
    render(
      <ItemFilterControlsSection
        attributeDefinitions={[]}
        attributeFilters={{ era: "1950s" }}
        createdAfter=""
        createdBefore=""
        disabled={false}
        hasNoLocation={false}
        hasNoTags={false}
        itemTypeId=""
        itemTypes={[]}
        locationId=""
        locations={[]}
        maxQuantity={undefined}
        minQuantity={undefined}
        searchText="Jazz"
        selectedTagIds={[]}
        sortBy="updatedUtc"
        sortDirection="desc"
        tags={[]}
        onAttributeFilterChange={vi.fn()}
        onClear={vi.fn()}
        onCreatedAfterChange={vi.fn()}
        onCreatedBeforeChange={vi.fn()}
        onHasNoLocationChange={vi.fn()}
        onHasNoTagsChange={vi.fn()}
        onItemTypeIdChange={vi.fn()}
        onLocationChange={vi.fn()}
        onMaxQuantityChange={vi.fn()}
        onMinQuantityChange={vi.fn()}
        onSearchTextChange={vi.fn()}
        onSortByChange={vi.fn()}
        onSortDirectionChange={vi.fn()}
        onToggleTag={vi.fn()}
      />
    );

    expect(screen.getByText("Showing the narrowed item list.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Filters" })).toBeEnabled();
  });

  it("applies and deletes saved views through the section callbacks", async () => {
    const user = userEvent.setup();
    const onApplySavedView = vi.fn();
    const onDeleteSavedView = vi.fn();

    render(
      <SavedViewsSection
        disabled={false}
        savedViewName=""
        savedViews={[
          {
            id: "view-1",
            name: "Wishlist",
            filters: {
              searchText: "Jazz",
              hasNoTags: true,
              sortBy: "updatedUtc",
              sortDirection: "desc"
            }
          }
        ]}
        onApplySavedView={onApplySavedView}
        onDeleteSavedView={onDeleteSavedView}
        onSavedViewNameChange={vi.fn()}
        onSaveView={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Apply" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onApplySavedView).toHaveBeenCalledWith(
      expect.objectContaining({ id: "view-1" })
    );
    expect(onDeleteSavedView).toHaveBeenCalledWith("view-1");
  });
});
