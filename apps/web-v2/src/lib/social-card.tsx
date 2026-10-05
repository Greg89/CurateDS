import "server-only";
import { ImageResponse } from "next/og";
import type { PublicShowcase } from "./publication";
import { cardTextSvg } from "./social-card-text";
import { publicHeaders } from "./publication-handler";
import { readBody } from "./upload";
let activeRenders = 0;

export async function renderSocialCard(
  showcase: PublicShowcase,
  head = false,
  owner = false,
) {
  const headers = {
    ...publicHeaders,
    "Cache-Control": owner ? "private, no-store" : "no-store",
  };
  const unavailable = () =>
    new Response(head ? null : "The share card is temporarily unavailable.", {
      status: 503,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  if (activeRenders >= 2) return unavailable();
  activeRenders++;
  try {
    const palette = {
      forest: { ink: "#213c31", wash: "#e2e8dc" },
      clay: { ink: "#653e30", wash: "#ebe0d4" },
      slate: { ink: "#344858", wash: "#e0e5e7" },
    }[showcase.color];
    const title = await cardTextSvg(
      showcase.title.trim() || "Collection showcase",
      {
        width: 1056,
        height: 310,
        size: showcase.title.length > 65 ? 52 : 68,
        maxLines: 3,
        color: palette.ink,
      },
    );
    const category = await cardTextSvg(
      showcase.category?.trim() || "A personal collection",
      { width: 1056, height: 70, size: 24, maxLines: 2, color: palette.ink },
    );
    const brand = await cardTextSvg("CurateDS · Things worth keeping", {
      width: 900,
      height: 40,
      size: 24,
      maxLines: 1,
      color: palette.ink,
    });
    const response = new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f6f4ed",
          padding: "52px 72px",
          color: palette.ink,
          borderTop: `14px solid ${palette.ink}`,
        }}
      >
        <img src={category} width={1056} height={70} alt="" />
        <img src={title} width={1056} height={310} alt="" />
        <div
          style={{
            display: "flex",
            height: 76,
            alignItems: "flex-end",
            borderTop: `2px solid ${palette.wash}`,
            marginTop: 30,
          }}
        >
          <img src={brand} width={900} height={40} alt="" />
        </div>
      </div>,
      { width: 1200, height: 630, fonts: [], headers },
    );
    // Finish generation before acknowledging success; lazy renderer errors become generic 503.
    const bytes = await readBody(response, 4 * 1024 * 1024);
    return new Response(head ? null : bytes, {
      headers: {
        ...headers,
        "Content-Type": "image/png",
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return unavailable();
  } finally {
    activeRenders--;
  }
}
