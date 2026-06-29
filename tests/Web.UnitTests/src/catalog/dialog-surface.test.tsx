import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DialogSurface } from "@app/catalog/components/DialogSurface";

function DialogHarness() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      <DialogSurface
        ariaLabel="Harness dialog"
        className="confirm-dialog-backdrop"
        initialFocusSelector="[data-autofocus='true']"
        isOpen={isOpen}
        keepMounted
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="confirm-dialog">
          <button data-autofocus="true" type="button">
            First action
          </button>
          <button type="button">Last action</button>
          <button type="button" onClick={() => setIsOpen(false)}>
            Close dialog
          </button>
        </div>
      </DialogSurface>
    </div>
  );
}

describe("DialogSurface", () => {
  it("moves focus into the dialog and restores it to the trigger on close", async () => {
    const user = userEvent.setup();

    render(<DialogHarness />);

    const openButton = screen.getByRole("button", { name: "Open dialog" });
    openButton.focus();

    await user.click(openButton);

    expect(screen.getByRole("button", { name: "First action" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(openButton).toHaveFocus();
  });

  it("keeps tab focus cycling inside the dialog while open", async () => {
    const user = userEvent.setup();

    render(<DialogHarness />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));

    const firstAction = screen.getByRole("button", { name: "First action" });
    const lastAction = screen.getByRole("button", { name: "Last action" });
    const closeDialogButton = screen.getByRole("button", { name: "Close dialog" });

    expect(firstAction).toHaveFocus();

    await user.tab();
    expect(lastAction).toHaveFocus();

    await user.tab();
    expect(closeDialogButton).toHaveFocus();

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(closeDialogButton).toHaveFocus();
  });
});
