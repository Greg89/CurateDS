export function formatMediaFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatMediaContentType(contentType: string) {
  const normalized = contentType.trim().toLowerCase();

  return normalized === "image/jpeg"
    ? "JPEG image"
    : normalized === "image/png"
      ? "PNG image"
      : normalized === "image/webp"
        ? "WebP image"
        : normalized === "image/gif"
          ? "GIF image"
          : contentType;
}

export const mediaDateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short"
});
