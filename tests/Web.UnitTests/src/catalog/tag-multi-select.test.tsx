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
    const onToggle = vi.fn();

    render(
      <div>
        <TagMultiSelect
          disabled={false}
          emptyLabel="Select tags"
          selectedTagIds={[]}
          tags={tags}
          onToggle={onToggle}
        />
      </div>
    );

    const trigger = screen.getByRole("button", { name: /Select tags/i });
    await user.click(trigger);

    const menu = screen.getByRole("group", { name: "Tag options" });
    expect(menu).toBeInTheDocument();

    const alphaOption = screen.getByRole("checkbox", { name: "Alpha" });
    await user.click(alphaOption);
    expect(alphaOption).toHaveFocus();
    expect(onToggle).toHaveBeenCalledWith("tag-a");

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
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
    expect(screen.getByRole("group", { name: "Tag options" })).toBeInTheDocument();

    const outsideTarget = screen.getByRole("button", { name: "Outside target" });
    await user.click(outsideTarget);

    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    expect(outsideTarget).toHaveFocus();
  });

  it("links the trigger to the open tag options group", async () => {
    const user = userEvent.setup();

    render(
      <TagMultiSelect
        disabled={false}
        emptyLabel="Select tags"
        selectedTagIds={[]}
        tags={tags}
        onToggle={vi.fn()}
      />
    );

    const trigger = screen.getByRole("button", { name: /Select tags/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("aria-controls");

    await user.click(trigger);

    const menu = screen.getByRole("group", { name: "Tag options" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", menu.id);
  });
});
