import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaLightbox } from "@app/catalog/components/MediaLightbox";

const asset1 = {
  id: "asset-1",
  url: "https://example.com/img1.jpg",
  fileName: "mountain.jpg",
  contentType: "image/jpeg",
  sizeBytes: 12345,
  isPrimary: true,
  uploadedUtc: "2026-04-20T00:00:00Z"
};

const asset2 = {
  id: "asset-2",
  url: "https://example.com/img2.jpg",
  fileName: "portrait.jpg",
  contentType: "image/jpeg",
  sizeBytes: 9876,
  isPrimary: false,
  uploadedUtc: "2026-04-20T01:00:00Z"
};

const asset3 = {
  id: "asset-3",
  url: "https://example.com/img3.jpg",
  fileName: "sunset.jpg",
  contentType: "image/jpeg",
  sizeBytes: 8000,
  isPrimary: false,
  uploadedUtc: "2026-04-20T02:00:00Z"
};

function renderLightbox(overrides?: Partial<Parameters<typeof MediaLightbox>[0]>) {
  const props = {
    assets: [asset1, asset2],
    currentIndex: 0,
    onClose: vi.fn(),
    onNavigate: vi.fn(),
    onSetPrimary: vi.fn(),
    onDelete: vi.fn(),
    ...overrides
  };
  render(<MediaLightbox {...props} />);
  return props;
}

describe("MediaLightbox", () => {
  it("renders the current image and its filename", () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.getByRole("img", { name: "mountain.jpg" })).toBeInTheDocument();
    expect(screen.getByText("mountain.jpg")).toBeInTheDocument();
  });

  it("shows media metadata for the current asset", () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.getByText("JPEG image")).toBeInTheDocument();
    expect(screen.getByText("12.1 KB")).toBeInTheDocument();
    expect(screen.getByText(/Uploaded/i)).toBeInTheDocument();
  });

  it("shows the Primary badge for the primary asset", () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.getByText("Primary")).toBeInTheDocument();
  });

  it("does not show the Primary badge for a non-primary asset", () => {
    renderLightbox({ currentIndex: 1 });

    expect(screen.queryByText("Primary")).not.toBeInTheDocument();
  });

  it("calls onClose when the × button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderLightbox();

    await user.click(screen.getByRole("button", { name: "Close lightbox" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderLightbox();

    await user.click(screen.getByRole("dialog", { name: "Image lightbox" }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when clicking inside the lightbox panel", async () => {
    const user = userEvent.setup();
    const { onClose } = renderLightbox();

    await user.click(screen.getByText("mountain.jpg"));

    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a counter when there are multiple assets", () => {
    renderLightbox({ assets: [asset1, asset2, asset3], currentIndex: 1 });

    expect(screen.getByText("2 of 3")).toBeInTheDocument();
  });

  it("does not show a counter for a single asset", () => {
    renderLightbox({ assets: [asset1], currentIndex: 0 });

    expect(screen.queryByText(/of/)).not.toBeInTheDocument();
  });

  it("hides the prev arrow on the first image", () => {
    renderLightbox({ assets: [asset1, asset2], currentIndex: 0 });

    expect(screen.queryByRole("button", { name: "Previous image" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next image" })).toBeInTheDocument();
  });

  it("hides the next arrow on the last image", () => {
    renderLightbox({ assets: [asset1, asset2], currentIndex: 1 });

    expect(screen.getByRole("button", { name: "Previous image" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next image" })).not.toBeInTheDocument();
  });

  it("calls onNavigate with previous index when prev arrow is clicked", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 1 });

    await user.click(screen.getByRole("button", { name: "Previous image" }));

    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it("calls onNavigate with next index when next arrow is clicked", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 0 });

    await user.click(screen.getByRole("button", { name: "Next image" }));

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("shows Set as primary button only for non-primary assets", () => {
    renderLightbox({ currentIndex: 1 });

    expect(screen.getByRole("button", { name: "Set as primary" })).toBeInTheDocument();
  });

  it("hides Set as primary button for the primary asset", () => {
    renderLightbox({ currentIndex: 0 });

    expect(screen.queryByRole("button", { name: "Set as primary" })).not.toBeInTheDocument();
  });

  it("calls onSetPrimary with asset id when Set as primary is clicked", async () => {
    const user = userEvent.setup();
    const { onSetPrimary } = renderLightbox({ currentIndex: 1 });

    await user.click(screen.getByRole("button", { name: "Set as primary" }));

    expect(onSetPrimary).toHaveBeenCalledWith("asset-2");
  });

  it("calls onDelete and onClose when Remove is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete, onClose } = renderLightbox({ currentIndex: 0 });

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(onDelete).toHaveBeenCalledWith("asset-1");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose on Escape key", async () => {
    const user = userEvent.setup();
    const { onClose } = renderLightbox();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onNavigate on ArrowLeft when not on first image", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 1 });

    await user.keyboard("{ArrowLeft}");

    expect(onNavigate).toHaveBeenCalledWith(0);
  });

  it("calls onNavigate on ArrowRight when not on last image", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 0 });

    await user.keyboard("{ArrowRight}");

    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("does not call onNavigate on ArrowLeft when on first image", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 0 });

    await user.keyboard("{ArrowLeft}");

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not call onNavigate on ArrowRight when on last image", async () => {
    const user = userEvent.setup();
    const { onNavigate } = renderLightbox({ assets: [asset1, asset2], currentIndex: 1 });

    await user.keyboard("{ArrowRight}");

    expect(onNavigate).not.toHaveBeenCalled();
  });
});
