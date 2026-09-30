# Yunda Profiles with Google Sheets

A companion to the public Loadout Skill for importing, finding and updating profiles in a private Google Sheet and producing an exact-template English or Chinese-English PDF delivered through private Google Drive.

ChatGPT reads the public Skill's instructions. CLI-backed agents receive this reviewed renderer through the same Skill's authorized favorite/sync lifecycle. The Skill needs no application server or repository checkout at runtime.

Start with SKILL.md. Renderer usage is in references/cli-renderer.md. The renderer requires Node.js 22+ and pinned pdf-lib/fontkit dependencies. Run pnpm install --frozen-lockfile --ignore-scripts, then pnpm test.

No customer data, templates, photos, fonts, account credentials or workbook URLs are distributed in this source. Users supply their authorized assets privately through their own connected Google accounts. See LICENSE for distribution terms.
