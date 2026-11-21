# Workbook contract

Use one workbook with six tabs: `Profiles`, `Parents`, `Answers`, `Photos`, `Exports`, and `Setup`. The schema version is `1.0.0`. The field dictionary defines which fields apply to a family and which repeat for each intended parent.

## Setup

`Setup` has columns `key | value | notes`. Put `schema_version` in A2 and `1.0.0` in B2. Other settings are looked up by key, not fixed row numbers:

- `profile_type = intended-parent`
- `default_language = en`, with allowed values `en` or `zh-en`
- `default_watermark = none`, with allowed values `none` or `yunda`
- `output_folder_url`: a stable private Drive folder link
- `template_file_url`: a stable private intended-parent reference PDF or template link
- `brand_assets_folder_url`: optional private logo and artwork folder
- `brand_name`, `contact_email`, `contact_phone`, `contact_website`: user-maintained display values
- `expected_collaborators`: private JSON list of the intended workspace collaborators and roles, verified from the selected folder or explicitly supplied by the user

Do not copy contact details or partner logos from an old customer's PDF as defaults. The private template and brand settings determine the current approved branding.

When the user asks to reuse an existing workspace's sharing, read its current permissions first. Create the new workbook and files inside the verified private folder so intended collaborators inherit access. Read back each new resource's parent and permissions; confirm the expected users and roles, and check for unexpected `anyone` or domain-wide access. Do not declare sharing complete from the parent folder alone. If inheritance is missing, resolve the exact requested access through current Loadout sharing Actions before claiming delivery; do not make files public as a workaround.

An existing workbook must match this schema before import. If the user requests a new workbook, create it in the verified private folder. Reuse its empty default tab as `Profiles` through the sheet-properties Action. Add other missing schema tabs through the referenced setup Actions. Use exact names and disable automatic name suffixes; on retry, inspect existing tabs first. Preserve unrelated tabs and never overwrite a populated tab to make it match. Set enough rows for all applicable answer keys and freeze the header through supported grid properties. Write headers and settings in one batch and verify them. Use the formatting Action for a contrasting header and wrapped narrative columns; cosmetic formatting must not become a prerequisite for importing data.

## Tab headers

`Profiles`:

`profile_id | display_title | record_version | parent_count | profile_date | status | source_refs | created_at | updated_at | last_pdf_url | internal_notes`

`Parents`:

`profile_id | parent_id | display_order | display_name | legal_name | birth_date | source_age | gender | occupation | location | source_ref`

`Answers`:

`profile_id | subject_id | field_key | value_original | value_en | value_zh | state | source_ref | source_locator | derived_from | updated_at`

`Photos`:

`profile_id | photo_id | subject_id | display_order | drive_url | source_ref | caption | include_in_pdf`

`Exports`:

`export_id | profile_id | record_version | language | watermark | profile_date | template_file_id | template_version | drive_file_id | drive_url | page_count | generated_at | status`

`Setup`:

`key | value | notes`

## Identity and records

`profile_id` is the stable family key. `parent_id` is stable within that family; `display_order` controls Parent #1 and #2. Do not assume Parent #1 is female or Parent #2 is male. A single-parent case has one parent row and no invented second parent.

Reuse a supplied profile ID. Otherwise search the workbook for the complete parent identity before assigning a new opaque ID such as `IP-` plus a UUID. Similar names or shared clinics alone do not establish a match. Ask once if existing records leave two plausible matches.

Each `Answers` row is unique by `(profile_id, subject_id, field_key)`. Use `subject_id = case` for family fields and the stable `parent_id` for parent fields. Save one row for every applicable dictionary field, including missing fields. `Parents` provides the identity index; `Answers` holds the original and edited values, including the corresponding demographic keys. Update both in the same batch when a demographic value changes.

Use `Present` for explicit information, including an explicit unknown or conditional answer. Use `Missing` for an unanswered field, keeping all value columns empty. Use `Conflict` for incompatible evidence or an ambiguous assignment. Keep alternatives and their source locations in `value_original`; leave edited export values empty until resolved. No condition or missing option is silently converted to yes or no.

`derived_from` records dictionary keys and the transformation when a value is calculated or a supported narrative is edited. For example, an age derived from a birth date records the birth-date field and exact `profile_date`. An introduction composed from multiple answers cites those keys. Preserve `value_original` when correcting English or translating Chinese.

`source_refs` and `source_ref` may contain stable private Drive links or a descriptive local filename and digest for an attached file. They never contain expiring URLs. A local attachment reference does not mean the document was archived to Drive. Do not upload source originals unless the user's request includes private archival.

`status` is `draft` or `ready`; import never asserts medical verification. `internal_notes` contains operational issues that are excluded from the profile PDF.

## Batch writes and recovery

Read the profile index, parent index, relevant answer rows, and settings in one bounded batch. Choose explicit target ranges. Use RAW input so source answers cannot become spreadsheet formulas. Do not append duplicates when updating an existing key.

Before overwriting an existing record, verify that its current version still matches the version read. This check cannot make Google Sheets writes transactional; if concurrent editing is detected, reread and reconcile instead of overwriting it. Increment `record_version` once for the combined import or update.

After writing, read back the exact affected ranges. Compare keys, original values, states, parent order, and version. On a timeout or interrupted response, perform this read before retrying. A partially written record remains `draft` and is repaired using the same IDs.

## Photos and exports

Keep only authorized family photos in `Photos`; a chat screenshot, agency logo, decorative template artwork, or sender avatar is not a family photo. Preserve the image-to-family association before extraction. For DOCX, extract `word/media` images through their document relationships, rather than assuming every embedded image is a portrait.

If the requested import includes photo storage, upload to the verified private workspace and save stable Drive links. Without permission for photo upload, keep local images for a same-session preview and report that reusable Drive photo ingestion is pending. Never put base64 or signed URLs in cells.

An export is immutable evidence of one record version and exact template version. Preserve prior `Exports` rows. Log `verified` only after render inspection and successful Drive metadata readback. A local-only artifact can be logged as `local-only` with empty Drive fields. Clear `Profiles.last_pdf_url` whenever facts change; update it to the new verified link after export.

## Fixed-template Setup keys

For export, verify template_file_url, fixed_template_map_url, answer_font_url, template_version, template_sha256, field_map_sha256, answer_font_sha256, and expected_page_count (6). These are private stable Drive links and reviewed byte hashes. Keep the master/map pair together; source originals and client data never enter the public package. Set default_language to zh-en and default_watermark to none for the supplied bilingual form. Both answer languages preserve the template's bilingual question labels. Do not silently reuse a previous layout when any required asset is missing.
