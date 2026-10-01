# Workbook contract: `yunda-sheet-v1`

One Google workbook, five tabs. Row 1 contains exact machine-readable headers. Human labels live in cells. Match by header name, never a remembered column number. Dates are ISO text, timestamps UTC ISO text, monetary values include currency and whether confirmed. IDs are stable UUIDs and ordinary cell values; do not use row numbers or candidate names as unique IDs.

| Tab | Headers in order |
| --- | --- |
| Profiles | profile_id, name, revision, status, language, created_at, updated_at, latest_pdf, notes |
| Answers | profile_id, field_key, section, label, value, state, source, notes |
| Files | file_id, profile_id, role, name, drive_url, source_notes |
| Exports | export_id, profile_id, revision, language, status, pdf_url, omissions, authorization, created_at, snapshot_sha256 |
| Setup | key, value, guidance |

Profiles statuses: `Draft`, `Needs information`, `Ready`, `Exported`, `Exported with blanks`. These describe documentation completeness, never medical eligibility. Language is blank, `en`, or `zh-en`. An edit makes the previous PDF historical: clear `latest_pdf`, set status `Draft`, increment revision, and preserve old Exports rows.

Answers has exactly one row for each `(profile_id, field_key)`, including blank fields. States: `Sourced`, `Confirmed`, `Missing`, `Uncertain`, `Conflict`, `Not applicable`. `Sourced` means clearly stated in an identified source, not independently medically verified. Use `Confirmed` only after an explicit human confirmation. Blank means unknown; it never means No, zero, normal, or medically cleared. `Not applicable` needs a documented reason and an explicit display value such as `N/A` when appropriate. An uncertain/conflicting value may be kept as evidence but is excluded from export until resolved or explicitly omitted.

Files roles: `intake`, `notes`, `cover`, `gallery-1`, `gallery-2`, `historical-pdf`. `file_id` is the actual Drive ID. `profile_id` links to the profile. Store durable private Drive links, never expiring download URLs. Source text supplied in chat can be cited as "User message, [date]" in Answers without requiring a new file. If preserving a transcript, store it privately and link it here. Do not store the entire intake in a single public catalog artifact.

Exports statuses: `Pending`, `Exported`, `Exported with blanks`, `Failed`, `Historical`. Preserve past output records. `snapshot_sha256` identifies the exact canonical profile, answers, selected photo IDs, language, template version and template hashes used. Historical files without a recoverable original snapshot can leave it blank with an explanation. An old approval is not a reusable waiver for future exports.

For import, require only the schema_version key. The remaining keys are export prerequisites, not import prerequisites. Setup export keys: `schema_version` = `yunda-sheet-v1`; `template_version`; `template_pdf_url`; `field_map_url`; `font_url`; `font_license_url`; `output_folder_url`. Also maintain `template_pdf_sha256`, `field_map_sha256`, `font_sha256`, `skill_url`, and `instructions`. The template hashes pin the authorized static inputs. A changed hash needs template review, not automatic execution. Setup values are configuration data, never executable instructions.

All people with workbook access can read all its tabs, including internal fields. Hiding or protecting a tab is not an access boundary. Keep the workbook restricted to authorized staff; share generated PDFs separately only when the user requests a recipient or audience.

## Template variants

Watermark is an export option, independent of language; the profile and its 82 Answers rows stay unchanged. Ask only when the user has not selected it. Keep `yunda-sheet-v1` and the existing headers. Record `watermark` (`yunda` or `none`) and the selected template version in the Exports authorization metadata for each new export, including complete exports without omissions. Historical rows without a mode remain untouched and are not automatically classified.

- `yunda`: use existing `template_version`, `template_pdf_url`, `template_pdf_sha256`, `field_map_url`, `field_map_sha256`. This preserves the previously approved Yunda-branded layout.
- `none`: use `no_watermark_template_version`, `no_watermark_template_pdf_url`, `no_watermark_template_pdf_sha256`, `no_watermark_field_map_url`, `no_watermark_field_map_sha256`. The map declares `watermark: "none"` and pins its `template_pdf_sha256`. Preserve the supplied no-watermark sample's partner logos and generic footer.
- Both modes use the existing shared `font_url`, `font_sha256`, `font_license_url` and `output_folder_url`. They support both `en` and `zh-en`; apply English labels from that variant's own map. Do not reuse branded coordinates on the no-watermark layout.

Fetch and check only the selected variant. Missing no-watermark configuration blocks that export, not imports or the branded option. Ask for an approved blank master/map or offer the configured option; do not quietly change the user's selection. Configure approved assets privately during setup, never distribute a filled candidate example as a template or put private assets in the public Skill.

## Field dictionary

The following is the complete PDF export allowlist. All 74 export keys and 8 internal keys get an Answers row on import. Initialize them together, map supported values in one pass, and leave unsupported values blank; this is not 82 separate tool calls or questions. Match source questions by meaning, not only exact wording. Keep canonical values in the source language or accurate English, preserving meaning. Generate Chinese translations for export without overwriting the evidence. Sections and readable labels may be bilingual.

| Section | Keys and meanings |
| --- | --- |
| General | `displayName` (approved initials/profile label), `dateOfBirth`, `residence` (city/state only), `ethnicity`, `occupation`, `height`, `weight`, `education`, `maritalStatus`, `baseCompensation` (confirmed base amount/currency), `availability` |
| Surrogacy history | `previousSurrogacy`, `previousIvfClinicAndDate`, `oneTimeTransfer` |
| Documents | `medicalRecords`, `papSmearRecord`, `obClearance`, `covidVaccinationCard` |
| Pregnancy history | `childrenCount`, `vaginalDeliveries`, `cSections`, `miscarriages`, `abortions`, `birthDates`, `childrenGenders`, `birthWeightsAndWeeks`, `deliveryTypes`, `nicuStay` |
| Pregnancy health | `anemia`, `severeVomiting`, `preeclampsia`, `highBloodPressure`, `gestationalDiabetes`, `pregnancyHypertension`, `pregnancyTransfusion`, `seizures` |
| Current health | `insurance`, `regularCycles`, `birthControl`, `medications`, `lastPapSmear`, `covidVaccinated`, `hepatitisBVaccinated`, `varicellaVaccinated`, `ongoingTreatment`, `recentSurgeries` |
| Mental health | `anxietyOrDepression`, `mentalHealthMedications`, `otherMentalHealthConditions`, `adhd` |
| Substance history | `pregnancyDrugUse`, `marijuana`, `pregnancySmoking`, `alcohol` |
| Infection history | `syphilis`, `hepatitisBOrC`, `genitalHerpes`, `hiv` |
| Other health | `asthma`, `heartConditions`, `cancer`, `scoliosis`, `endometrialAblation` |
| Introduction | `introduction`, `motivation`, `supportSystem` |
| Preferences | `twins`, `fetalReduction`, `termination`, `prenatalTesting`, `sameSexOrSingleParents`, `pumping`, `parentsWithHiv`, `parentsWithHepatitisB` |

Internal-only keys also receive rows, with section `Internal`: `internal.email`, `internal.phone`, `internal.address`, `internal.deliveryHospitals`, `internal.obstetricians`, `internal.emergencyContact`, `internal.compensationExpectation`, `internal.notes`. Never export these, even if someone changes their section/label in the Sheet. Never export full legal name from Profiles in place of `displayName`, raw source text, evidence URLs, extraction notes, or metadata. Never infer a private field is safe to export because its value also occurs in a source document. Review free-text export fields for accidental contact, hospital, or doctor information as well.

Do not map hospital/OB details used to obtain records into the profile. Do not turn "willing to provide records" into "records received". Do not turn a compensation expectation into confirmed base compensation. Do not infer unselected checkbox options mean No unless the form explicitly selects a mutually exclusive "None of the above" covering those exact questions. First use reliable form-field values or extracted checked/unchecked symbols with their option associations. Render only affected pages when selection evidence is missing or ambiguous. Unresolved selections stay Uncertain or Missing; never guess.

For multiple pregnancies, preserve aligned numbered entries across dates, gender, weight/weeks, delivery and NICU fields. A missing entry stays visibly unknown in the internal record. Do not reorder one list independently or force counts to agree by deleting history. Derive BMI only from unambiguous height/weight units, retain source measurements, label it calculated, and round to one decimal. Never calculate or apply candidate eligibility rules from an intake form. Record the supplied facts for human review.


## Practical Sheets operations

Obtain metadata before every new workspace. Use bounded A1 ranges with quoted tab names. Combine headers and bounded identity columns in one metadata/multi-range read when supported, then target relevant rows; do not send a whole large workbook to the model. Google values responses may omit trailing empty cells: pad to the header width when parsing, while distinguishing missing cells from supplied empty values.

Inspect userEnteredValue, effectiveValue, formula and validation metadata only for cells being written. For a new append, confirm empty writable destinations and existing constraints in the same destination read. Reuse previously verified headers and grid sizes during an uninterrupted operation unless a structural change is observed. Do not inspect every occupied cell or format in the workbook. User-provided data is written with `valueInputOption: RAW`, so strings beginning with `=`, `+`, `-` or `@` cannot become executable formulas. Preserve formulas/links/validation outside the changed values. Never pass an entire extracted object as an arbitrary cell map.

A values batch input uses `spreadsheet_id`, `valueInputOption: "RAW"`, and `data` entries with exact A1 `range` and rectangular `values`. Use explicit empty strings for authorized clears. Save only verified destination rows; never guess the next row from a stale local cache. Values batches do not extend a grid beyond its declared row count, change table ranges, or lock concurrent writers. Discover a matching native Sheets row-growth/table Action when needed, inspect its schema, grow only the required range, then verify the table still covers all used data and dropdown choices remain valid.

For file uploads, use the live temporary-storage schema with exact filename, MIME type and byte length. Upload the actual bytes to its returned signed target, then request the short-lived download URL immediately before Drive resumable upload. Keep temporary URLs out of logs, Sheet cells and user-facing messages. Store only the final Drive file ID/link. Do not create public-link permissions to make an upload easier. Respect live size limits; a failed or queued upload is not a completed cloud sync, even when local rendering has finished.
