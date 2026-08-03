import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useItemsWorkspaceState } from "@app/catalog/hooks/useItemsWorkspaceState";

function WorkspaceStateHarness() {
  const [itemSaveCount, setItemSaveCount] = useState(0);
  const workspaceState = useItemsWorkspaceState({
    itemFilters: {
      searchText: "Jazz",
      tagIds: ["tag-1", "tag-2"],
      attributeFilters: { era: "1950s" },
      hasNoTags: true
    },
    itemSaveCount
  });

  return (
    <div>
      <button type="button" onClick={workspaceState.openFormDrawer}>
        Open form
      </button>
      <button type="button" onClick={workspaceState.openDetailDrawer}>
        Open detail
      </button>
      <button type="button" onClick={() => setItemSaveCount((currentValue) => currentValue + 1)}>
        Increment save count
      </button>
      <button type="button" onClick={workspaceState.toggleFilters}>
        Toggle filters
      </button>
      <button type="button" onClick={workspaceState.openDeleteItemConfirm}>
        Open confirm
      </button>

      <output aria-label="active filter count">{workspaceState.activeFilterCount}</output>
      <output aria-label="form open">{String(workspaceState.isFormDrawerOpen)}</output>
      <output aria-label="detail open">{String(workspaceState.isDetailDrawerOpen)}</output>
      <output aria-label="filters open">{String(workspaceState.isFiltersOpen)}</output>
      <output aria-label="confirm open">{String(workspaceState.showDeleteItemConfirm)}</output>
    </div>
  );
}

describe("useItemsWorkspaceState", () => {
  it("calculates active filter count from the normalized item filters", () => {
    render(<WorkspaceStateHarness />);

    expect(screen.getByLabelText("active filter count")).toHaveTextContent("4");
  });

  it("closes the form drawer after a successful save count increment", async () => {
    const user = userEvent.setup();

    render(<WorkspaceStateHarness />);

    await user.click(screen.getByRole("button", { name: "Open form" }));
    expect(screen.getByLabelText("form open")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "Increment save count" }));
    expect(screen.getByLabelText("form open")).toHaveTextContent("false");
  });

  it("closes open drawers when Escape is pressed", async () => {
    const user = userEvent.setup();

    render(<WorkspaceStateHarness />);

    await user.click(screen.getByRole("button", { name: "Open form" }));
    await user.click(screen.getByRole("button", { name: "Open detail" }));

    expect(screen.getByLabelText("form open")).toHaveTextContent("true");
    expect(screen.getByLabelText("detail open")).toHaveTextContent("true");

    await user.keyboard("{Escape}");

    expect(screen.getByLabelText("form open")).toHaveTextContent("false");
    expect(screen.getByLabelText("detail open")).toHaveTextContent("false");
  });
});
