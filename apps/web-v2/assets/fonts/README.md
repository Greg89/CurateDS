# Social-card fonts

These unmodified Noto fonts are distributed under the SIL Open Font License 1.1. The licenses are included alongside the files. Copyright belongs to the Noto Project Authors and the copyright holders identified in each font's metadata.

Downloaded from the official Noto repositories on 2026-10-04:

| File                       | Source                                                                                                                               | SHA-256                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| NotoSans-Regular.ttf       | [Noto Sans](https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf)                    | b85c38ecea8a7cfb39c24e395a4007474fa5a4fc864f6ee33309eb4948d232d5 |
| NotoSansArabic-Regular.ttf | [Noto Sans Arabic](https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf) | ceea25b464a656dc3b26849bab9356740401af62aedf1bfa8b7f0d9b75925b1b |
| NotoSansHebrew-Regular.ttf | [Noto Sans Hebrew](https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSansHebrew/NotoSansHebrew-Regular.ttf) | a7fa16fffb27bedb060a0866267c29e9859aeb9c21cc33f5b3aaf6eb062eca85 |
| NotoSansCJKsc-Regular.otf  | [Noto Sans CJK](https://raw.githubusercontent.com/notofonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf)      | 2c76254f6fc379fddfce0a7e84fb5385bb135d3e399294f6eeb6680d0365b74b |

The Latin/Greek/Cyrillic, Arabic, Hebrew, and CJK faces are server assets, not browser downloads. CJK uses the Simplified Chinese regional face, which also supplies Japanese/Korean glyphs; region-specific CJK typography is not promised. Scripts/symbols not covered by these fonts use a visible replacement glyph in the card. The owner sees the exact card before publishing; HTML and metadata retain the original text.

Fontkit shapes glyphs locally; bidi-js orders directional runs. Only glyph paths are supplied to Next's ImageResponse, so Satori never receives user text that could trigger its automatic Google-font or emoji downloads. Font data may be cached, but editions and generated cards are never cached. Do not replace these assets with request-time font URLs.
