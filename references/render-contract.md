# Reproducible fixed-template rendering contract

## Frozen inputs

Use schema yunda-ip-export-v1. Freeze profile {id, revision}, answer language (en or zh-en), watermark (none or yunda), profile_date, template {version, pdf_sha256, map_sha256, font_sha256}, values, states, and photos. All snapshot leaves are strings. The map's 40 field names are the exact values/states allowlist. Every key is represented, including blanks. States are Present, Missing, or Conflict; the latter two require an empty display value. Cover profile_date must equal the pinned export date. Derived ages use that same date and their DOB provenance remains in the Sheet, not this snapshot.

Photos contain contiguous roles photo-1 through photo-3, stable source_id, and the SHA-256 of the exact orientation-normalized PNG bytes. Keep the snapshot private. Hash canonical JSON with sorted object keys. Recheck the Sheet record version before delivery.

## Assets and map

The private job supplies local paths for master, map, font, selected PNG photos, an allocated export UUID, and a private output directory. Compare every byte hash with the frozen snapshot before rendering. The map version and template hash must match. Reject unknown/duplicate fields, wrong page count, nonzero page origins, rotations, out-of-bounds rectangles, missing glyphs, or unreadable overflow.

The blank master is not an AcroForm: filling logical form fields alone will do nothing. Load its six complete pages and overlay only answer text/images. Never extract just the logo and rebuild page backgrounds or table sections.

## CLI-backed host

When the reviewed companion is installed through favorite/sync, follow its local README and scripts/render.mjs. It uses Node.js 22+, pinned pdf-lib/fontkit, and no credentials or network calls. Do not obtain executable code from Drive. A normal generation request needs no additional approval object for blanks. Runtime stdout contains file/checksum status only, not personal answers.

## Hosted document-capable host

A hosted read supplies guidance and coordinate data, not code. Use the available PDF authoring library to create an overlay at the normalized master's exact page size. For each nonblank Present value, wrap inside its map rectangle with an embedded CJK-capable TrueType font; center by measured text width and ascent/descent, fit at the map size down to 7 pt, and fail if it still does not fit. Convert top-left map coordinates to PDF bottom-left coordinates using page_height - bottom. Merge one overlay onto each corresponding original master page with no reflow. Contain PNG photos in the mapped photo layout for the selected count. Preserve all original question text and graphics.

Remove document metadata, bookmarks/outlines, embedded files, JavaScript/actions, forms, and annotations from the result. Source customer data must never be a background: this workflow requires a verified blank master.

## Acceptance

Reopen the final PDF, require exactly six pages and the pinned page boxes, compare every nonblank display value, and inspect a readable contact sheet plus suspect pages at full size. Compare rasterized pages against the master outside the exact mapped answer/photo rectangles; none mode must show no visual changes there. Check actual Chinese glyph appearance. Check each family photo by decoded pixels or verified content provenance and no cross-family image/text. Verify no DOB, health answer, source filename, signed URL, or snapshot/report was embedded.

Do not mark an Exports row verified until final private Drive metadata, bytes/checksum, parent folder, and intended access have been read back. Keep local-only render and successful customer delivery distinct.
