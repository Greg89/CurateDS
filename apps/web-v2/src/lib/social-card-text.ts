import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { create, type Font } from "fontkit";
import bidiFactory from "bidi-js";
import { plainText } from "./showcase-metadata";

const bidi = bidiFactory();
const fontFiles = [
  "NotoSans-Regular.ttf",
  "NotoSansArabic-Regular.ttf",
  "NotoSansHebrew-Regular.ttf",
  "NotoSansCJKsc-Regular.otf",
];
let fontsPromise: Promise<Font[]> | undefined;
function fonts() {
  // Cache only shipped font data. Never cache a publication or generated card.
  return (fontsPromise ??= Promise.all(
    fontFiles.map(
      async (name) =>
        create(
          await readFile(path.join(process.cwd(), "assets", "fonts", name)),
        ) as Font,
    ),
  ).catch((error) => {
    fontsPromise = undefined;
    throw error;
  }));
}
type Run = {
  text: string;
  font: Font;
  start: number;
  end: number;
  level: number;
};
export async function shapeCardLine(
  input: string,
  fontSize: number,
  direction?: "ltr" | "rtl",
) {
  const all = await fonts();
  const text = plainText(input, 200);
  const embedding = bidi.getEmbeddingLevels(text, direction);
  const indices = bidi.getReorderedIndices(text, embedding);
  const order = new Map(indices.map((index, position) => [index, position]));
  const runs: Run[] = [];
  for (const part of new Intl.Segmenter("en", {
    granularity: "grapheme",
  }).segment(text)) {
    const value = part.segment;
    const font = /\p{Script=Arabic}/u.test(value)
      ? all[1]
      : /\p{Script=Hebrew}/u.test(value)
        ? all[2]
        : /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
              value,
            )
          ? all[3]
          : all[0];
    const level = embedding.levels[part.index];
    const last = runs.at(-1);
    // Unsupported symbols use a local missing-glyph mark; no remote font/emoji requests.
    const supported = Array.from(value).every(
      (char) =>
        font.hasGlyphForCodePoint(char.codePointAt(0)!) ||
        /[\u200c\u200d\ufe0f]/u.test(char),
    );
    const rendered = supported ? value : "�";
    const selected = supported ? font : all[0];
    if (last && last.font === selected && last.level === level) {
      last.text += rendered;
      last.end = part.index + value.length;
    } else
      runs.push({
        text: rendered,
        font: selected,
        start: part.index,
        end: part.index + value.length,
        level,
      });
  }
  // Reorder complete shaping runs; never reverse Arabic letters before shaping.
  runs.sort(
    (a, b) =>
      Math.min(
        ...indices
          .filter((i) => i >= a.start && i < a.end)
          .map((i) => order.get(i)!),
      ) -
      Math.min(
        ...indices
          .filter((i) => i >= b.start && i < b.end)
          .map((i) => order.get(i)!),
      ),
  );
  let width = 0;
  const paths: string[] = [];
  for (const run of runs) {
    const scale = fontSize / run.font.unitsPerEm;
    const shaped = run.font.layout(
      run.text,
      undefined,
      undefined,
      undefined,
      run.level % 2 ? "rtl" : "ltr",
    );
    for (let i = 0; i < shaped.glyphs.length; i++) {
      const pos = shaped.positions[i];
      const outline = shaped.glyphs[i].path.toSVG();
      paths.push(
        `<path transform="translate(${(width + pos.xOffset * scale).toFixed(3)} ${(-pos.yOffset * scale).toFixed(3)}) scale(${scale.toFixed(6)} ${(-scale).toFixed(6)})" d="${outline}"/>`,
      );
      width += pos.xAdvance * scale;
    }
  }
  return {
    width,
    paths: paths.join(""),
    rtl: !!(embedding.paragraphs[0]?.level % 2),
  };
}

export async function cardTextSvg(
  input: string,
  {
    width,
    height,
    size,
    maxLines,
    color,
  }: {
    width: number;
    height: number;
    size: number;
    maxLines: number;
    color: string;
  },
) {
  const value = plainText(input, 100);
  const direction =
    bidi.getEmbeddingLevels(value).paragraphs[0]?.level % 2 ? "rtl" : "ltr";
  const words = value.split(/(\s+)/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current + word;
    if ((await shapeCardLine(next, size)).width <= width) {
      current = next;
      continue;
    }
    if (current.trim()) {
      lines.push(current.trim());
      current = "";
    }
    for (const part of new Intl.Segmenter("en", {
      granularity: "grapheme",
    }).segment(word.trimStart())) {
      if (
        (await shapeCardLine(current + part.segment, size)).width > width &&
        current
      ) {
        lines.push(current);
        current = "";
      }
      current += part.segment;
    }
  }
  if (current.trim()) lines.push(current.trim());
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines.at(-1)!;
    while (last && (await shapeCardLine(last + "…", size)).width > width)
      last = Array.from(
        new Intl.Segmenter("en", { granularity: "grapheme" }).segment(last),
        (part) => part.segment,
      )
        .slice(0, -1)
        .join("");
    lines[maxLines - 1] = last + "…";
  }
  const lineHeight = size * 1.45;
  const markup = await Promise.all(
    lines.map(async (line, index) => {
      const shape = await shapeCardLine(line, size, direction);
      return `<g transform="translate(${shape.rtl ? Math.max(0, width - shape.width).toFixed(3) : 0} ${(size * 1.13 + index * lineHeight).toFixed(3)})">${shape.paths}</g>`;
    }),
  );
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><g fill="${color}">${markup.join("")}</g></svg>`).toString("base64")}`;
}
