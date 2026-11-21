# Generate and deliver a private profile PDF

## Read once

Read the selected `Profiles` row, actual parents, all relevant `Answers`, included `Photos`, and Setup settings in one bounded batch. Pin `record_version`, `profile_date`, selected language, watermark setting, and the private template's Drive file ID and version or modified time.

Use the Sheet's current edited answers. Do not silently regenerate from old source attachments or previous PDFs. Follow [the mapping rules](mapping.md), [field dictionary](field-dictionary.json), and [layout contract](layout.md).

If the user specified export options, use them. Otherwise reuse Setup defaults. Ask one combined question only when a required option or asset cannot be resolved. Missing personal answers are not prerequisites.

## Assemble and render

1. Retrieve the verified private template and authorized photos through Loadout. Temporary download URLs stay in the current working session. Identify template graphics separately from family images.
2. Populate the section mapping from fields marked for profile export. Use parent display names, the exact profile date, and supported English or Chinese-English answers. Exclude DOBs, legal-name-only fields, health screening answers, source references, and internal notes.
3. Preserve source uncertainty and material conditions. `Missing` and unresolved `Conflict` answers stay blank. Explicit unknown or not-applicable answers remain explicit. Do not copy answer text printed in an example template.
4. Follow the fixed [rendering contract](render-contract.md) and matching coordinate map. Preserve the exact six supplied master pages; overlay answers and photos only. Do not recreate or repaginate the template. A public read does not install a companion.
5. Render every output page to images and inspect them at readable size. Check the cover, table wrapping, section continuation, footer, CJK glyphs, and photos. Repair visible overlap, clipping, or missing characters and inspect the latest render again.

If an example PDF is used as a background, remove its old personal text, metadata, bookmarks or outlines, embedded files, hidden layers, annotations, form values, and photos before adding current content. Painting opaque boxes over personal text is insufficient because the underlying data may remain extractable. If clean removal cannot be verified, use a clean template or recreate the layout from approved assets.

## Verify content

Compare every nonblank exported answer with its `Present` Sheet row and provenance. Confirm:

- Only the selected family's names, statements, and authorized photos appear.
- Age uses the pinned profile date, and the cover date is not inherited from the template.
- Checkbox answers match the visually verified source selection.
- Legal marriage, citizenship, ethnicity, donor sources, insurance, and clinical preferences are never inferred from unrelated fields.
- A singleton preference has not filled embryo count, a general reduction answer has not filled specific twin/triplet decisions, and legacy testing has not been renamed PGT-A.
- No old family text remains in extracted text, PDF metadata, annotations, or form fields.
- Every page is readable and the actual page count is recorded.

Recheck the current record version before final delivery. If the family changed during rendering, regenerate from the new version or clearly deliver the pinned earlier version requested by the user.

## Private Drive delivery

Verify the output folder's identity and private access using the user's selected account. Stage the local PDF through the referenced file-storage Actions and the returned upload contract, then use the upload-from-URL Action with its temporary HTTPS download URL, the final filename, `mime_type = application/pdf`, and the verified `parent_folder_id`. Keep SSL verification enabled. The same flow saves authorized photos with their actual image MIME type. Do not upload source questionnaires as a side effect.

Use a filename such as `Yunda-{profile_id}-r{record_version}-{profile_date}-{language}.pdf` and create a new file for each export. Read back file ID, MIME type, size, checksum, parent folder, and stable web link after upload. Compare bytes or provider checksum with the rendered file. Compare inherited users and roles with the verified expected workspace collaborators, and check for unexpected public or domain-wide permissions. Do not change sharing to make delivery succeed. If privacy or intended collaborator access cannot be verified, report that limitation without calling the file privately delivered. After an uncertain upload result, search the target folder and reconcile the exact filename and checksum before retrying.

Return the verified Drive link immediately. Then add an immutable `Exports` row and update `Profiles.last_pdf_url` for the same record version. If logging fails, preserve the delivered PDF and report the Sheet-sync issue briefly.

If Drive delivery fails after rendering, provide the verified local PDF when supported, state that Drive upload is pending, and retain enough local evidence to retry safely. A local PDF preview does not prove Sheet-based photo ingestion, private Drive delivery, or hosted rendering. Report those checks separately.
