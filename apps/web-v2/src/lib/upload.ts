export const maxImageBytes = 20 * 1024 * 1024;
export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export class BodyTooLarge extends Error {}

// Bound the stream even when Content-Length is missing or untrusted.
export async function readBody(request: Pick<Request, "body" | "headers">, maxBytes: number) {
  if (Number(request.headers.get("content-length")) > maxBytes) throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maxBytes) { await reader.cancel(); throw new BodyTooLarge(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  return body;
}
