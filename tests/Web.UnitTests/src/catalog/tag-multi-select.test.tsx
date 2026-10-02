import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagMultiSelect } from "@app/catalog/components/TagMultiSelect";

const tags = [
  { id: "tag-a", name: "Alpha", key: "alpha", createdUtc: "2026-01-01T00:00:00Z" },
  { id: "tag-b", name: "Beta", key: "beta", createdUtc: "2026-01-01T00:00:00Z" }
];

describe("TagMultiSelect", () => {
  it("supports keyboard opening, checkbox selection, and tabbing out", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <div>
        <TagMultiSelect disabled={false} emptyLabel="Select tags" selectedTagIds={[]}
          tags={tags} onToggle={onToggle} />
        <button type="button">Next field</button>
      </div>
    );

    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toHaveFocus();
    await user.keyboard(" ");
    expect(onToggle).toHaveBeenCalledWith("tag-a");
    await user.tab();
    expect(screen.getByRole("checkbox", { name: "Beta" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Next field" })).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Tag options" })).not.toBeInTheDocument();
  });

  it("keeps reverse tab navigation available through clear and the trigger", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">Previous field</button>
        <TagMultiSelect disabled={false} emptyLabel="Select tags" selectedTagIds={["tag-a"]}
          tags={tags} onToggle={vi.fn()} />
      </div>
    );

    const trigger = screen.getByRole("button", { name: "Alpha" });
    await user.click(trigger);
    expect(screen.getByRole("checkbox", { name: "Alpha" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Clear 1 selected" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(trigger).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Previous field" })).toHaveFocus();
    expect(screen.queryByRole("group", { name: "Tag options" })).not.toBeInTheDocument();
  });

  it("closes when disabled and stays closed when enabled again", async () => {
    const user = userEvent.setup();
    const props = { emptyLabel: "Select tags", selectedTagIds: ["tag-a"], tags, onToggle: vi.fn() };
    const { rerender } = render(<TagMultiSelect {...props} disabled={false} />);
    await user.click(screen.getByRole("button", { name: "Alpha" }));
    rerender(<TagMultiSelect {...props} disabled />);
    expect(screen.queryByRole("group", { name: "Tag options" })).not.toBeInTheDocument();
    rerender(<TagMultiSelect {...props} disabled={false} />);
    expect(screen.getByRole("button", { name: "Alpha" })).toHaveAttribute("aria-expanded", "false");
  });

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
