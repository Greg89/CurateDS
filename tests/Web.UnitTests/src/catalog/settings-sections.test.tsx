import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CollectionActionsSection } from "@app/catalog/components/CollectionActionsSection";
import { ItemTypesSection } from "@app/catalog/components/ItemTypesSection";

describe("Settings sections", () => {
  it("submits a new item type and clears the form through the success callback", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn(({ onSuccess }: { onSuccess: () => void }) => onSuccess());

    render(
      <ItemTypesSection
        collectionName="Records"
        createError={null}
        isCreatePending={false}
        isDeletePending={false}
        itemTypes={[]}
        onCreate={onCreate}
        onDelete={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Name"), "Vinyl");
    await user.click(screen.getByRole("button", { name: "Add Item Type" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Vinyl"
      })
    );
    expect(screen.getByLabelText("Name")).toHaveValue("");
  });

  it("confirms item type deletion before invoking the delete callback", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ItemTypesSection
        collectionName="Records"
        createError={null}
        isCreatePending={false}
        isDeletePending={false}
        itemTypes={[
          {
            id: "type-1",
            collectionId: "collection-1",
            name: "Vinyl",
            sortOrder: 0,
            createdUtc: "2026-01-01T00:00:00Z"
          }
        ]}
        onCreate={vi.fn()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const confirmDialog = screen.getByRole("dialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("type-1");
  });

  it("opens the collection delete confirmation before invoking delete", async () => {
    const user = userEvent.setup();
    const onDeleteCollection = vi.fn();

    render(
      <CollectionActionsSection
        collectionId="collection-1"
        collectionName="Records"
        isDeletePending={false}
        onDeleteCollection={onDeleteCollection}
        onExportCollection={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Delete Collection" }));
    expect(screen.getByText(/permanently delete the collection/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(onDeleteCollection).toHaveBeenCalledWith("collection-1");
  });
});
