import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagMultiSelect } from "@app/catalog/components/TagMultiSelect";

const tags = [
  { id: "tag-a", name: "Alpha", key: "alpha", createdUtc: "2026-01-01T00:00:00Z" },
  { id: "tag-b", name: "Beta", key: "beta", createdUtc: "2026-01-01T00:00:00Z" }
];

describe("TagMultiSelect", () => {
  it("closes when pressing Escape", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <TagMultiSelect
          disabled={false}
          emptyLabel="Select tags"
          selectedTagIds={[]}
          tags={tags}
          onToggle={vi.fn()}
        />
      </div>
    );

    await user.click(screen.getByRole("button", { name: /Select tags/i }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("closes when clicking outside the component", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <TagMultiSelect
          disabled={false}
          emptyLabel="Select tags"
          selectedTagIds={[]}
          tags={tags}
          onToggle={vi.fn()}
        />
        <button type="button">Outside target</button>
      </div>
    );

    await user.click(screen.getByRole("button", { name: /Select tags/i }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside target" }));

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});
