# Extract and edit intended-parent questionnaires

Support bilingual PDF questionnaires, the newer Intended Parent(s) Profile DOCX, and older free-text IP Profile Q&A DOCX. Use the field dictionary as the common schema. Recognize paraphrased questions, but preserve distinctions between different questions.

## Extract complete evidence

1. Read all PDF pages and DOCX paragraphs, tables, form fields, and content controls once. Preserve paragraph and table order.
2. PDF text extraction can detach checkmarks from their options. Inspect the actual page when an option is spatial, when several boxes appear marked, or when extracted text conflicts with the selection. For scanned content, use the host's OCR and verify uncertain answers visually.
3. A DOCX option list containing both Yes and No is not itself an answer. Prefer an explicit completed response, checked form control, or a clear selection. Keep an unresolved selection as `Conflict`.
4. Identify the family using the names in the body. An attachment's administrative filename need not match its intended parents. Preserve the source label while mapping the actual people.
5. Detect contradictory bilingual parent headings. If an English heading says Parent II while its Chinese heading says Parent I, keep the block in the case's internal `additional_notes` with state `Conflict` until its subject is clear. Leave the affected parent health fields unresolved. Do not copy the same medical answer to both parents to hide the ambiguity.

## Source precedence

A new explicit user correction takes precedence for the field it corrects. Otherwise a completed questionnaire supplies facts. A finished PDF supplied as an output example controls appearance and editorial style; its extra answers are not evidence that those answers were in the input. If the user explicitly designates an existing PDF as the current authoritative record, import it as that source and preserve provenance. Do not let an output example silently overwrite questionnaire facts.

Keep source dates, birth dates, and current export dates separate. Use a saved `profile_date` for a repeatable export, defaulting to the requested generation date. Derive age from a complete birth date at that date. If a separately supplied age disagrees, retain the conflict; do not copy an old example's age. Avoid interpreting ambiguous numeric dates without context.

## Editorial rules

- Translate Chinese naturally and edit rough English into clear first-person answers. Retain the parent's tone, uncertainty, and scope.
- A short introduction may summarize the parent's supplied statements. Record its source keys. Do not invent occupation details, financial security, personal characteristics, religious beliefs, or promises of support.
- Shorten repetition in a message to the surrogate without adding gratitude, commitments, or relationship preferences the source does not express. If no message exists, leave the field blank unless the user asks for a proposed message; keep any proposal distinct from sourced answers.
- Keep an explicit unknown as unknown. A missing nurse name stays blank, not `N/A`. Use `N/A` only when the source actually says it does not apply.
- Preserve a relationship marked domestic partnership or single. Neither shared children nor two parent names establishes legal marriage.
- Do not infer ethnicity or citizenship from names, language, or residence. Keep city/country fields scoped to their actual subject when parents live in different places.

## Reproductive and pregnancy preferences

These fields record the parents' stated preferences. Do not add clinical advice, predictions, or statistics from the form's explanatory text.

- Desired singleton or twin pregnancy is separate from embryos per transfer. A singleton preference does not become a one-embryo transfer plan.
- Preserve PGT-A, PGT-M, and legacy PGD/PGS separately. Do not label a generic PGD/PGS response as a specific PGT-A result.
- A general reduction answer remains general. Specific twin and triplet questions stay unanswered unless the source explicitly covers them. A reduction preference conditional on embryo splitting must retain that condition.
- Preserve separate positions for correctable abnormalities, severe abnormalities, and Down syndrome. A view about one condition does not fill another condition's answer.
- Following a doctor's recommendation does not imply refusal of invasive testing, consent to termination, or a fixed yes/no answer.
- Own egg and own sperm are independent claims. Leave either unanswered if the source does not specify it. Do not derive donor use from genetic parenthood assumptions.
- Preserve delivery-room attendance conditional on the surrogate's agreement and travel or appointment limits expressed by the parents.
- A future plan to arrange newborn insurance is not current insurance coverage. Never insert a coverage plan when the source is silent.

Retain health and pregnancy-history details in internal fields even when absent from the outward template. The profile includes only dictionary fields marked for export and supported edited answers.

## Efficient verification

Review identity and checkmark ambiguities first, then map and save the full intake in one batch. Missing answers do not block drafting or export. Report material conflicts briefly; leave affected export answers blank and continue with the rest. Ask only when the unresolved issue prevents selecting the correct family, account, template, or output destination.
