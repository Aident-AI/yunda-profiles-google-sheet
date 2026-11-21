# Fixed six-page intended-parent layout

The approved private master is the layout. Preserve its six A4 portrait pages, bilingual questions, headings, cover art, logos, colors, table grids, footers, margins, and existing text. Fill only the mapped blank answer rectangles and photo slots. Do not rebuild the tables from a style description or add IVF sections absent from this master.

Page order is cover; both intended-parent blocks; general questions; pregnancy questions; matching information/message; family photos. Missing second-parent answers leave that block blank; never infer parent identity or gender from the template headings. Confirm the selected master suits the actual parents before export.

Use [the coordinate map](fixed-template-map.json), measured in points from the top-left of a normalized master. The private bound map pins the actual master SHA-256. The distributed map is a geometry contract with an unbound template hash; it is not a template and cannot replace the private reviewed pair. Provision and visually verify the bound pair once, then store their ordinary Drive links and hashes in Setup.

A source PDF can have a nonzero MediaBox/CropBox origin. Normalize it once by translating content by the negative original lower-left point, then setting both page boxes to (0,0,width,height). Verify all six normalized renders match the source. Do not change coordinates independently of the master.

The fixed form has 40 outward display slots, including cover title/date, seven fields per actual parent, and the matching/general/pregnancy fields. A singleton preference does not fill embryos-per-transfer. Only specific PGT-A evidence fills the PGT-A row; legacy PGD/PGS remains separate. The gamete answer row has separate egg and sperm cells. DOBs, legal-name-only fields, health screening, provenance, and internal notes stay out of the PDF.

Default answer size is 11 pt, with the map's cover sizes. Wrap within each rectangle and reduce only down to 7 pt. Fail on remaining overflow; never add pages or move the template. Both en and zh-en choose answer text only and preserve bilingual question labels. Font embedding must cover every drawn glyph; inspect actual rendered Chinese, not only extracted text.

Use one to three authorized photos on page six according to the mapped layout. Normalize EXIF orientation, preserve proportions, contain images in the rectangles, and never crop faces. No photo leaves the supplied page blank. No synthetic person, screenshot, or template portrait is a substitute.

The watermark option is none or a very light additional YUNDA text mark. Normal master branding always stays. The default none must remain pixel-identical outside the filled rectangles.
