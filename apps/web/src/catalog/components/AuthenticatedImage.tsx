import { useEffect, useState } from "react";
import { apiBase, authHeader } from "../../api/http";

const mediaPath =
  /^\/collections\/[0-9a-f-]{36}\/items\/[0-9a-f-]{36}\/media\/[0-9a-f-]{36}\/content$/i;
const maximumBytes = 20 * 1024 * 1024;

// Only this exact API path may receive the user's bearer token. Never follow an API redirect.
export async function loadMedia(
  path: string,
  signal: AbortSignal,
): Promise<Blob> {
  if (!mediaPath.test(path)) throw new Error("Invalid media path");
  const response = await fetch(`${apiBase.replace(/\/$/, "")}${path}`, {
    headers: await authHeader(),
    signal,
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Image unavailable");
  const type = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (
    !type ||
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type) ||
    Number(response.headers.get("content-length")) > maximumBytes
  ) {
    await response.body?.cancel();
    throw new Error("Invalid image response");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Empty image response");
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let length = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.byteLength;
      if (length > maximumBytes) {
        await reader.cancel();
        throw new Error("Image too large");
      }
      chunks.push(new Uint8Array(part.value));
    }
  } finally {
    reader.releaseLock();
  }
  if (!length) throw new Error("Empty image response");
  return new Blob(chunks, { type });
}

export function AuthenticatedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [image, setImage] = useState<{ path: string; url: string } | null>(
    null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    setFailed(false);
    void loadMedia(src, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setImage({ path: src, url });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [src]);
  if (failed)
    return (
      <span
        className={className}
        role="img"
        aria-label={`${alt}: image unavailable`}
      >
        Image unavailable
      </span>
    );
  return image?.path === src ? (
    <img
      src={image.url}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className={className} role="img" aria-label={`${alt}: loading image`}>
      Loading image…
    </span>
  );
}
