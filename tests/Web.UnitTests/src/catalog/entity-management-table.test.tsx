import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntityManagementTable } from "@app/catalog/components/EntityManagementTable";

function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `id-${i}`,
    name: `Tag ${String(i).padStart(3, "0")}`,
    secondary: `key-${i}`,
    usageCount: count - i
  }));
}

describe("EntityManagementTable", () => {
  it("renders only the first page of rows when there are more than the page size", () => {
    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={makeRows(60)}
        pageSize={25}
        onDelete={vi.fn()}
      />
    );

    const tableBody = screen.getByRole("table").querySelector("tbody")!;
    const dataRows = within(tableBody).getAllByRole("row");
    expect(dataRows).toHaveLength(25);

    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
  });

  it("paginates forward and backward", async () => {
    const user = userEvent.setup();

    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={makeRows(60)}
        pageSize={25}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText("Tag 000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    expect(screen.queryByText("Tag 000")).not.toBeInTheDocument();
    expect(screen.getByText("Tag 025")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Previous/i }));
    expect(screen.getByText("Tag 000")).toBeInTheDocument();
  });

  it("filters rows by the search input across name and secondary text", async () => {
    const user = userEvent.setup();

    const rows = [
      { id: "1", name: "Jazz", secondary: "music-jazz", usageCount: 5 },
      { id: "2", name: "Sci-Fi", secondary: "books-scifi", usageCount: 2 },
      { id: "3", name: "Cookbook", secondary: "books-cooking", usageCount: 1 }
    ];

    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={rows}
        pageSize={25}
        onDelete={vi.fn()}
      />
    );

    const searchBox = screen.getByPlaceholderText(/Search/i);
    await user.type(searchBox, "books");

    expect(screen.queryByText("Jazz")).not.toBeInTheDocument();
    expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
    expect(screen.getByText("Cookbook")).toBeInTheDocument();
  });

  it("sorts by name ascending by default and toggles to descending when name header is clicked", async () => {
    const user = userEvent.setup();

    const rows = [
      { id: "1", name: "Charlie", usageCount: 1 },
      { id: "2", name: "Alpha", usageCount: 2 },
      { id: "3", name: "Bravo", usageCount: 3 }
    ];

    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={rows}
        pageSize={25}
        onDelete={vi.fn()}
      />
    );

    let bodyRows = within(screen.getByRole("table").querySelector("tbody")!).getAllByRole("row");
    expect(within(bodyRows[0]).getByText("Alpha")).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText("Charlie")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Name/i }));

    bodyRows = within(screen.getByRole("table").querySelector("tbody")!).getAllByRole("row");
    expect(within(bodyRows[0]).getByText("Charlie")).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText("Alpha")).toBeInTheDocument();
  });

  it("sorts by usage count when the usage header is clicked", async () => {
    const user = userEvent.setup();

    const rows = [
      { id: "1", name: "Alpha", usageCount: 1 },
      { id: "2", name: "Bravo", usageCount: 9 },
      { id: "3", name: "Charlie", usageCount: 4 }
    ];

    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={rows}
        pageSize={25}
        onDelete={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Items|Usage/i }));

    const bodyRows = within(screen.getByRole("table").querySelector("tbody")!).getAllByRole("row");
    expect(within(bodyRows[0]).getByText("Bravo")).toBeInTheDocument();
    expect(within(bodyRows[1]).getByText("Charlie")).toBeInTheDocument();
    expect(within(bodyRows[2]).getByText("Alpha")).toBeInTheDocument();
  });

  it("invokes onDelete with the row id when the delete button is clicked", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={[
          { id: "tag-1", name: "Jazz", usageCount: 0 },
          { id: "tag-2", name: "Rock", usageCount: 1 }
        ]}
        pageSize={25}
        onDelete={onDelete}
      />
    );

    const rockRow = screen.getByText("Rock").closest("tr")!;
    await user.click(within(rockRow).getByRole("button", { name: /Delete/i }));

    expect(onDelete).toHaveBeenCalledWith("tag-2");
  });

  it("renders an empty state message when there are no rows", () => {
    render(
      <EntityManagementTable
        title="Manage Tags"
        rows={[]}
        pageSize={25}
        onDelete={vi.fn()}
        emptyCopy="Add tags to get started."
      />
    );

    expect(screen.getByText("Add tags to get started.")).toBeInTheDocument();
  });
});
