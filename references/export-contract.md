# Export and rendering contract

Read once from the same immutable Skill revision as SKILL.md. This is a data and algorithm contract for hosted agents. It contains no executable asset and does not grant permission to execute files from a workbook. A separately installed, reviewed CLI companion may implement this contract. Never assume that a ChatGPT Skill read installed it.

## Execution order

Resolve identity and current values; collect language, watermark mode, display name and listed omissions in one question when needed; save explicit corrections; freeze inputs; validate and bind authorization; render; verify; upload; return the verified private Drive link; finish Sheet bookkeeping. Never mutate the frozen input during rendering. No work after final response is implied.

A comparison draft approval applies only to its enumerated unresolved fields/photos. It must not become a general waiver or confirm facts. All unknown/conflicting values are blanked before translation and rendering. Reuse approval when recording exactly the choices the user just approved. Materially changed inputs need a fresh decision only for the affected issues.

## Frozen snapshot

Use snapshot schema `yunda-export-v2` for new exports. A legacy `yunda-export-v1` snapshot is historical branded-only input; preserve its original hash and do not relabel or upgrade it in place. Store this JSON privately. It contains only the final export input, with source values and display strings sufficient to reproduce the PDF; do not send it to an external hashing service or include it in the PDF.

Required members:

- `schema`: `yunda-export-v2`.
- `profile`: `profile_id` and `revision`, both strings. Never use row positions as identity. Full legal name and internal contact/medical-provider fields are excluded from this render snapshot.
- `language`: `en` or `zh-en`.
- `watermark`: `yunda` or `none`, explicitly selected by the user. Changing mode changes the snapshot hash even for otherwise identical answers.
- `export_date`: YYYY-MM-DD used for any explicitly mapped age calculation.
- `answers`: every allowlisted export field, sorted by `field_key`, each with string `field_key`, `value` and `state`. Preserve exact source strings and explicit state. Internal-only fields are never passed to the renderer.
- `display_values`: the final allowlisted display text keyed by field, including any faithful translations or requested derived age/heightWeightBmi. Missing, Uncertain, Conflict and approved blank entries have empty strings. Review translations before freezing. No generated prose without source support.
- `photos`: entries sorted by role (`cover`, `gallery-1`, `gallery-2`), each with role, Drive file ID and SHA-256 of the exact orientation-normalized image bytes rendered. Omit missing photos and record their roles in omissions.
- `template`: string `version`, `template_pdf_sha256`, `field_map_sha256`, `font_sha256`. File paths, temporary URLs and credentials are not part of the snapshot.
- `omissions`: unique field/photo keys sorted by ASCII order.

Normalize revision to a decimal string and sort arrays as specified before hashing. Canonical JSON means object keys sorted recursively in ASCII/Unicode-code-point order, arrays in the specified order, original Unicode preserved without normalization, ordinary JSON string escaping, no extra spaces, UTF-8, no BOM and no trailing newline. All leaf values in this schema are strings; do not introduce floats, null, undefined or localized dates. Use the language's standard SHA-256 implementation over these exact bytes. This is reproducibility bookkeeping, not encryption or a signature.

Keep authorization outside the hashed snapshot to avoid a circular hash. Record the exact hash, profile revision, language, watermark mode, template hashes, sorted omissions, the user's instruction and its actual message time when available. If the message time is unavailable, record a separate `recorded_at`; never fabricate `authorized_at` from the current clock. Allocate one export UUID outside the snapshot. Reuse the same ID/hash for retries.

The filename uses approved display initials, language, `wm-yunda` or `wm-none`, frozen revision and export UUID. Include the selected mode in the private fit report and Exports authorization metadata. Selecting watermark is output configuration and does not mutate profile answers or revision. Sanitize filename characters; never substitute the full legal name. Recording an export or selecting output language alone must not silently rewrite other answers.

## Direct-page rendering

Use a PDF library that edits the original document pages directly and embeds fonts, such as pdf-lib with fontkit. Establish dependencies once per host. If an approved CLI companion is installed, use its fixed renderer. In a hosted text-only environment, implement this specific procedure once; do not explore multiple rendering architectures. Do not claim a script was delivered by a Skill read.

1. Resolve the chosen variant using [the workbook keys](workbook.md#template-variants). The map's `watermark` must match the frozen choice; only the legacy branded map may omit this property. A no-watermark map must also pin `template_pdf_sha256`, which must equal the snapshot's selected master hash. Never substitute the other variant or erase branding during an export. Load the selected sanitized blank master with automatic metadata changes disabled. Verify hashes, the font license, the map version and exactly seven pages. The current master is approximately 595 by 842 PDF points. Use its actual MediaBox/CropBox and reject rotated pages or mismatching map dimensions rather than guessing a transform.
2. Map pages are zero-based. Every rectangle is `[left, top, right, bottom]`, measured from the top-left in PDF points. Require finite coordinates in bounds and positive width/height. Never treat these as pixels. Only allowlisted fields and the declared derived fields `age` and `heightWeightBmi` may be drawn.
3. Reuse each original page object. Draw text and approved photos directly on that page. Do not create a separate page-sized overlay, merge a second PDF, scale a copied page, or reuse page indexes after reordering. Retain original cover/closing art and page order.
4. Embed the approved font once for the whole document. For the supplied TrueType CJK font use full embedding, not per-page copies or subsetting. Check glyph coverage for every non-whitespace character before saving.
5. Fit text using measured font widths, not character counts. Use map fontSize, a 4-point horizontal inset and 2-point vertical inset. Break on words and CJK characters; permit character breaks for a single long token only when that preserves its full meaning. Preserve explicit newlines. Try size reductions in 0.25-point increments down to 7 points. If the complete text still does not fit, stop for an approved concise wording or template correction. Never omit facts or crop text.
6. For each measured line obtain glyph bounds. Let ascent be the greatest glyph top, descent the smallest glyph bottom, scaled by size/unitsPerEm. Set lineHeight to the larger of size times 1.22 and ascent minus descent plus size times 0.08. Block height is ascent minus descent plus (lineCount minus 1) times lineHeight. The first baseline is pageHeight minus top minus (cellHeight minus blockHeight)/2 minus ascent. Subsequent baselines subtract lineHeight. Center horizontally using each line's measured width unless the map explicitly declares another alignment. This single coordinate calculation applies identically to all pages.
7. For `zh-en`, keep the existing bilingual labels. Use faithful Chinese-English answers already frozen in display_values. Do not translate names, numbers or units into different facts. For `en`, apply only map englishLabels: fill the declared cell interior inset by 0.6 PDF points with its approved fill color, preserve rules/artwork, and fit its supplied English label. Honor heading rectangles. Never whitewash an entire page or change the selected master's artwork. The approved no-watermark master already omits Yunda branding and retains partner logos.
8. Photos are one cover and two distinct gallery roles. The approved v1 map uses two entries named `gallery`; map the first to gallery-1 and the second to gallery-2 in their existing array order. Reject any other ambiguous photo map. Verify bytes and orientation before freezing. Embed the normalized image once and contain proportionally in its mapped rectangle, centered. Do not distort or significantly crop. Approved missing slots stay empty. A photo change changes the snapshot.
9. Remove annotations, comments, embedded files, document actions and private metadata from output; do not append the snapshot, source file, intake text or source paths. Keep fixed vector artwork and the original page boxes. Save one PDF plus a private fit report with page/field/rectangle/size, not a stream of customer values in logs.

## Verify once, upload once

Before upload, confirm seven pages and original boxes; extract text; render and inspect every page at useful resolution. Check expected answers, all blank-approved cells, photo positions, CJK readability, borders and the chosen watermark mode. For no-watermark output check all seven pages for unwanted Yunda logos/company contacts and confirm the cover partner logos remain; do not strip candidate text merely for containing a similar word. Check against internal-only contact/provider strings and legal name, investigating harmless overlaps in context. Passing font-fit calculations alone do not prove visual correctness. One montage may assist inspection, but unreadable thumbnails are not evidence.

If a check fails, repair the affected rendering logic or obtain corrected input, then rerun the relevant checks plus final page/text/privacy checks. Do not redesign the template. A changed input invalidates the old snapshot, while a rendering-only correction can retain the same frozen snapshot and export UUID before upload.

After checks pass, save exact byte length and a local checksum. Upload the exact bytes using the currently discovered temporary-storage and Drive schemas. Obtain temporary URLs just in time and keep them out of user replies and Sheets. Verify final file ID, MIME, size, unique filename, intended folder and private access. Use the provider checksum if available. Download again only on a mismatch or other unresolved integrity concern. A timeout means search the unique filename and reconcile before retrying; never blindly duplicate an upload.

Return only the verified Drive webViewLink as the PDF link. If upload is unavailable, report that the PDF is prepared but Drive delivery failed. Keep recovery files private. Do not present a workspace path as a usable download or end with a promise that an unstarted background sync will complete.

## Commit and recover

Rebuild the current source projection using the same canonical rules, including revision, source answers, photo IDs, selected watermark mode and its current template hashes. Compare to the frozen source projection; reuse frozen translations and export date for unchanged inputs, do not translate again merely to compare. A conflict makes the completed PDF Historical. Do not overwrite a newer latest_pdf.

Use one RAW batch for the export row and current-profile output metadata, then one targeted multi-range readback. Export logging must not change revision or source answers. Format/grow tables only if needed for a valid write; defer cosmetic work. Pending rows are optional recovery records before upload, not a prerequisite for rendering or Drive delivery.

Recovery state names are local operational facts: prepared, verified, uploaded, linked. Resume the first incomplete stage. A valid verified file is not regenerated for a Sheet error. An uploaded file is not uploaded again for a failed row update. An older PDF is never relabeled as a newer profile revision. Never mark Exported until provider verification and Sheet readback succeed.
