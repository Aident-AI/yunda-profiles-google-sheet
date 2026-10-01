# Yunda Profiles with Google Sheets

A companion to the public Loadout Skill for importing, finding and updating profiles in a private Google Sheet and producing an exact-template English or Chinese-English PDF with or without Yunda watermark delivered through private Google Drive.

ChatGPT reads the public Skill's instructions. CLI-backed agents receive this reviewed renderer through the same Skill's authorized favorite/sync lifecycle. The Skill needs no application server or repository checkout at runtime. Requested PDFs use available information and leave unknown fields/photos blank without repeated approval prompts.

Start with SKILL.md and load only the requested workflow. Import needs references/workbook.md; PDF export additionally needs references/export.md and references/export-contract.md. Renderer usage is in references/cli-renderer.md. The renderer requires Node.js 22+ and pinned pdf-lib/fontkit dependencies. Run pnpm install --frozen-lockfile --ignore-scripts, then pnpm test.

No customer data, templates, photos, fonts, account credentials or workbook URLs are distributed in this source. Users supply their authorized assets privately through their own connected Google accounts. See LICENSE for distribution terms.
