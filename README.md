# Yunda intended-parent fixed-template renderer

This complete companion fills a customer-supplied normalized blank six-page master using a hash-bound private coordinate map. It performs no network calls and contains no customer data, templates, fonts, photos, or private links. The separate Google Sheet/Drive workflow owns identity, extraction, factual editing, permissions, and verified delivery.

Use Node.js 22 or later. Run pnpm install --frozen-lockfile --ignore-scripts once, then pnpm test. Prepare the private job in references/render-contract.md. assets contains local master, map, font, and a photos object mapping each selected role to an orientation-normalized PNG. Allocate one export_id UUID and reuse it for safe recovery. output_dir is outside the installed Skill.

Run node scripts/render.mjs render /private/job.json. Missing/conflicting values and missing photos stay blank without an additional confirmation. Exactly six pages are retained. en/zh-en controls answer language; the supplied question labels remain bilingual. none preserves the master; yunda adds a faint text watermark.

The renderer refuses wrong asset hashes, inconsistent dates, unsafe/duplicate field keys, nonblank unresolved answers, invalid geometry, missing glyphs, overflow, and overwriting an immutable export. A report status of rendered-needs-visual-and-private-delivery-verification is not a completed export. Render and inspect every page, verify privacy and template preservation, then upload through Loadout and verify private Drive metadata before logging success.

The distributed coordinate file has an intentionally empty master digest. Provision the exact reviewed blank master and a bound copy of this map privately, visually verify their normalized page renders, then save the links and hashes in the customer's Setup. Never put customer assets or credentials in this source repository or release archive.

Text layout helpers derive from the Aident-owned yunda-profiles-google-sheet renderer under its retained LICENSE.
