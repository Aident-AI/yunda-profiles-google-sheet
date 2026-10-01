import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

const fields = JSON.parse(fs.readFileSync(new URL('../fields.json', import.meta.url), 'utf8'));
const roles = ['cover', 'gallery-1', 'gallery-2'];
const derived = ['age', 'heightWeightBmi'];
const safeStates = ['Sourced', 'Confirmed', 'Not applicable'];
const allStates = [...safeStates, 'Missing', 'Uncertain', 'Conflict'];
const hashPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertKeys(value, expected, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert(Object.keys(value).sort().join('|') === [...expected].sort().join('|'), `${label} has unexpected or missing keys`);
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  assert(typeof value === 'string', 'Snapshot leaves must be strings');
  return JSON.stringify(value);
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function freezeSnapshot(input) {
  const snapshot = structuredClone(input);
  assert(['yunda-export-v1', 'yunda-export-v2'].includes(snapshot.schema), 'Unsupported snapshot schema');
  const v2 = snapshot.schema === 'yunda-export-v2';
  assertKeys(snapshot, ['schema', 'profile', 'language', 'export_date', 'answers', 'display_values', 'photos', 'template', 'omissions', ...(v2 ? ['watermark'] : [])], 'snapshot');
  if (v2) assert(['yunda', 'none'].includes(snapshot.watermark), 'Choose yunda or none watermark explicitly');
  assertKeys(snapshot.profile, ['profile_id', 'revision'], 'profile');
  assert(uuidPattern.test(snapshot.profile.profile_id), 'Invalid profile ID');
  assert(typeof snapshot.profile.revision === 'string' && /^[1-9]\d*$/.test(snapshot.profile.revision), 'Revision must be a positive decimal string');
  assert(['en', 'zh-en'].includes(snapshot.language), 'Unsupported language');
  assert(/^\d{4}-\d{2}-\d{2}$/.test(snapshot.export_date) && new Date(`${snapshot.export_date}T00:00:00Z`).toISOString().slice(0, 10) === snapshot.export_date, 'Invalid export date');
  assertKeys(snapshot.template, ['version', 'template_pdf_sha256', 'field_map_sha256', 'font_sha256'], 'template');
  for (const key of ['template_pdf_sha256', 'field_map_sha256', 'font_sha256']) assert(hashPattern.test(snapshot.template[key]), 'Invalid template digest');
  assert(Array.isArray(snapshot.answers) && snapshot.answers.length === fields.length, 'Expected every export field exactly once');
  const seen = new Set();
  for (const answer of snapshot.answers) {
    assertKeys(answer, ['field_key', 'value', 'state'], 'answer');
    assert(fields.includes(answer.field_key) && !seen.has(answer.field_key), 'Unknown or duplicate export field');
    assert(typeof answer.value === 'string' && allStates.includes(answer.state), 'Invalid answer value/state');
    seen.add(answer.field_key);
  }
  snapshot.answers.sort((a, b) => a.field_key < b.field_key ? -1 : a.field_key > b.field_key ? 1 : 0);
  assert(snapshot.display_values && typeof snapshot.display_values === 'object' && !Array.isArray(snapshot.display_values), 'Missing display values');
  for (const [key, value] of Object.entries(snapshot.display_values)) {
    assert([...fields, ...derived].includes(key) && typeof value === 'string', 'Unsafe display key/value');
  }
  for (const key of fields) assert(Object.hasOwn(snapshot.display_values, key), 'Every display field must be explicit, including blanks');
  const answers = Object.fromEntries(snapshot.answers.map(answer => [answer.field_key, answer]));
  const omissions = [];
  for (const answer of snapshot.answers) {
    const conditional = ['previousIvfClinicAndDate', 'oneTimeTransfer'].includes(answer.field_key) && answers.previousSurrogacy.value === 'No' && safeStates.includes(answers.previousSurrogacy.state);
    const unresolved = !safeStates.includes(answer.state) || !answer.value.trim();
    if (unresolved && !conditional) omissions.push(answer.field_key);
    if (unresolved) assert(snapshot.display_values[answer.field_key] === '', 'Unresolved fields must remain blank');
    if (!unresolved) assert(snapshot.display_values[answer.field_key].trim(), 'A sourced answer cannot be silently omitted');
  }
  assert(snapshot.display_values.displayName.trim(), 'Public display name is required');
  assert(Array.isArray(snapshot.photos), 'Photos must be an array');
  const photoRoles = new Set();
  const photoIds = new Set();
  for (const photo of snapshot.photos) {
    assertKeys(photo, ['role', 'file_id', 'sha256'], 'photo');
    assert(roles.includes(photo.role) && !photoRoles.has(photo.role), 'Unknown or duplicate photo role');
    assert(typeof photo.file_id === 'string' && photo.file_id && !photoIds.has(photo.file_id), 'Each selected photo must have a distinct identity');
    assert(hashPattern.test(photo.sha256), 'Invalid photo digest');
    photoRoles.add(photo.role);
    photoIds.add(photo.file_id);
  }
  for (const role of roles) if (!photoRoles.has(role)) omissions.push(`photos.${role}`);
  snapshot.photos.sort((a, b) => roles.indexOf(a.role) - roles.indexOf(b.role));
  assert(Array.isArray(snapshot.omissions), 'Omissions must be an array');
  snapshot.omissions.sort();
  assert(snapshot.omissions.join('|') === omissions.sort().join('|'), 'Omissions must exactly match unresolved fields and absent photos');
  const bytes = canonical(snapshot);
  return { snapshot, bytes, snapshotHash: sha256(bytes) };
}

export function checkAuthorization(snapshot, snapshotHash, authorization) {
  if (!snapshot.omissions.length) return;
  if (snapshot.schema === 'yunda-export-v2' && authorization === undefined) return;
  assert(authorization && authorization.snapshot_sha256 === snapshotHash, 'Missing or stale blank authorization');
  if (snapshot.schema === 'yunda-export-v2') assert(authorization.watermark === snapshot.watermark, 'Blank authorization watermark mismatch');
  assert(authorization.profile_revision === snapshot.profile.revision && authorization.language === snapshot.language, 'Authorization revision/language mismatch');
  assert(Array.isArray(authorization.omissions) && [...authorization.omissions].sort().join('|') === snapshot.omissions.join('|'), 'Authorization omissions mismatch');
  assert(typeof authorization.instruction === 'string' && authorization.instruction.trim(), 'Authorization must record the user instruction');
}

export function checkRect(rect, width, height) {
  assert(Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite), 'Invalid rectangle');
  const [left, top, right, bottom] = rect;
  assert(left >= 0 && top >= 0 && right > left && bottom > top && right <= width && bottom <= height, 'Rectangle out of bounds');
}

export function checkTemplateVariant(snapshot, map) {
  const watermark = snapshot.schema === 'yunda-export-v2' ? snapshot.watermark : 'yunda';
  const mapped = map.watermark ?? 'yunda';
  assert(['yunda', 'none'].includes(mapped) && mapped === watermark, 'Template watermark variant mismatch');
  if (watermark === 'none') assert(hashPattern.test(map.template_pdf_sha256), 'No-watermark map must pin its reviewed master');
  if (map.template_pdf_sha256) assert(map.template_pdf_sha256 === snapshot.template.template_pdf_sha256, 'Map and master identity mismatch');
  return watermark;
}

export function resolvePhotoCells(cells) {
  let gallery = 0;
  const normalized = cells.map(cell => ({ ...cell, role: cell.role === 'gallery' ? `gallery-${++gallery}` : cell.role }));
  assert(normalized.length === 3 && new Set(normalized.map(cell => cell.role)).size === 3 && normalized.every(cell => roles.includes(cell.role)), 'Expected exactly the three supported photo slots');
  return normalized;
}

function wrap(text, font, size, width) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    const tokens = paragraph.match(/[\u2e80-\u9fff\uf900-\ufaff]|[^\s\u2e80-\u9fff\uf900-\ufaff]+|[ \t]+/gu) || [''];
    let line = '';
    for (const token of tokens) {
      const pieces = font.widthOfTextAtSize(token, size) > width ? [...token] : [token];
      for (const piece of pieces) {
        if (line && font.widthOfTextAtSize((line + piece).trimEnd(), size) > width) {
          lines.push(line.trimEnd());
          line = piece.trimStart();
        } else line += piece;
        if (font.widthOfTextAtSize(line.trimEnd(), size) > width) return null;
      }
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

export function fitText(text, rect, startSize, font, metrics) {
  const [left, top, right, bottom] = rect;
  assert(Number.isFinite(startSize) && startSize >= 7 && startSize <= 60, 'Invalid font size');
  for (const character of text.replace(/\s/gu, '')) assert(metrics.hasGlyphForCodePoint(character.codePointAt(0)), 'Missing font glyph');
  for (let size = startSize; size >= 7; size = Math.round((size - 0.25) * 100) / 100) {
    const lines = wrap(text, font, size, right - left - 8);
    if (!lines) continue;
    const bounds = lines.flatMap(line => metrics.layout(line).glyphs.map(glyph => glyph.bbox));
    const ascent = Math.max(0, ...bounds.map(box => box.maxY)) / metrics.unitsPerEm * size;
    const descent = Math.min(0, ...bounds.map(box => box.minY)) / metrics.unitsPerEm * size;
    const lineHeight = Math.max(size * 1.22, ascent - descent + size * 0.08);
    const height = ascent - descent + (lines.length - 1) * lineHeight;
    if (height <= bottom - top - 4) return { size, lines, ascent, descent, lineHeight, height };
  }
  throw new Error('Text does not fit at readable size; request an approved correction');
}

export function firstBaseline(pageHeight, rect, fitted) {
  return pageHeight - rect[1] - (rect[3] - rect[1] - fitted.height) / 2 - fitted.ascent;
}

function drawText(page, text, cell, font, metrics, color = [0.12, 0.10, 0.09]) {
  if (!text) return null;
  const fitted = fitText(text, cell.rect, cell.fontSize || 11.5, font, metrics);
  const baseline = firstBaseline(page.getHeight(), cell.rect, fitted);
  for (const [index, line] of fitted.lines.entries()) {
    page.drawText(line, { x: cell.rect[0] + (cell.rect[2] - cell.rect[0] - font.widthOfTextAtSize(line, fitted.size)) / 2, y: baseline - index * fitted.lineHeight, font, size: fitted.size, color: rgb(...color) });
  }
  return { size: fitted.size, lines: fitted.lines.length, firstBaseline: baseline };
}

export async function renderJob(job) {
  const { snapshot, bytes, snapshotHash } = freezeSnapshot(job.snapshot);
  assert(uuidPattern.test(job.export_id), 'Invalid export UUID');
  checkAuthorization(snapshot, snapshotHash, job.authorization);
  const readAsset = (filename, hash) => {
    const bytes = fs.readFileSync(filename);
    assert(sha256(bytes) === hash, 'Asset digest mismatch');
    return bytes;
  };
  const master = readAsset(job.assets.master, snapshot.template.template_pdf_sha256);
  const map = JSON.parse(readAsset(job.assets.map, snapshot.template.field_map_sha256).toString('utf8'));
  const watermark = checkTemplateVariant(snapshot, map);
  const fontBytes = readAsset(job.assets.font, snapshot.template.font_sha256);
  assert(map.version === snapshot.template.version && Array.isArray(map.fields) && Array.isArray(map.photos) && Array.isArray(map.englishLabels), 'Invalid map contract');
  map.photos = resolvePhotoCells(map.photos);
  const pdf = await PDFDocument.load(master, { updateMetadata: false });
  const pages = pdf.getPages();
  assert(pages.length === 7, 'Master must have seven pages');
  for (const page of pages) {
    const box = page.getCropBox();
    const media = page.getMediaBox();
    assert(page.getRotation().angle === 0 && box.x === 0 && box.y === 0 && media.x === 0 && media.y === 0 && box.width === map.width && box.height === map.height && media.width === map.width && media.height === map.height, 'Page boxes or rotation disagree with map');
  }
  for (const cell of [...map.fields, ...map.photos, ...map.englishLabels]) {
    assert(Number.isInteger(cell.page) && cell.page >= 0 && cell.page < pages.length, 'Invalid map page index');
    checkRect(cell.rect, map.width, map.height);
  }
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const metrics = fontkit.create(fontBytes);
  const placements = [];
  if (snapshot.language === 'en') {
    for (const cell of map.englishLabels) {
      assert(typeof cell.text === 'string' && Array.isArray(cell.fill) && cell.fill.length === 3 && cell.fill.every(n => Number.isFinite(n) && n >= 0 && n <= 1), 'Invalid English label');
      const [left, top, right, bottom] = cell.rect;
      const page = pages[cell.page];
      page.drawRectangle({ x: left + 0.6, y: page.getHeight() - bottom + 0.6, width: right - left - 1.2, height: bottom - top - 1.2, color: rgb(...cell.fill) });
      drawText(page, cell.text, cell, font, metrics, cell.heading ? [1, 1, 1] : [0.12, 0.10, 0.09]);
    }
  }
  for (const cell of map.fields) {
    assert([...fields, ...derived].includes(cell.field), 'Unknown or private map field');
    const result = drawText(pages[cell.page], snapshot.display_values[cell.field] || '', cell, font, metrics);
    if (result) placements.push({ field: cell.field, page: cell.page, rect: cell.rect, ...result });
  }
  for (const photo of snapshot.photos) {
    const cells = map.photos.filter(cell => cell.role === photo.role);
    assert(cells.length === 1, 'Photo role must have exactly one mapped slot');
    const cell = cells[0];
    const imageBytes = readAsset(job.assets.photos[photo.role], photo.sha256);
    assert(imageBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Use orientation-normalized PNG photo bytes');
    const image = await pdf.embedPng(imageBytes);
    const [left, top, right, bottom] = cell.rect;
    const scale = Math.min((right - left) / image.width, (bottom - top) / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    pages[cell.page].drawImage(image, { x: left + (right - left - width) / 2, y: map.height - bottom + (bottom - top - height) / 2, width, height });
  }
  for (const page of pages) {
    page.node.delete(PDFName.of('Annots'));
    page.node.delete(PDFName.of('AA'));
  }
  for (const key of ['Metadata', 'Names', 'OpenAction', 'AA', 'AcroForm', 'Outlines']) pdf.catalog.delete(PDFName.of(key));
  pdf.context.trailerInfo.Info = undefined;
  const output = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const label = snapshot.display_values.displayName.replace(/[^A-Za-z0-9._-]/g, '').slice(0, 40) || 'Profile';
  const variantSuffix = snapshot.schema === 'yunda-export-v2' ? `_wm-${watermark}` : '';
  const filename = `${label}_${snapshot.language}${variantSuffix}_r${snapshot.profile.revision}_${job.export_id}.pdf`;
  fs.mkdirSync(job.output_dir, { recursive: true, mode: 0o700 });
  const outputPath = path.join(job.output_dir, filename);
  assert(!fs.existsSync(outputPath), 'Output exists; inspect and reuse it instead of rerendering');
  fs.writeFileSync(outputPath, output, { mode: 0o600 });
  fs.writeFileSync(path.join(job.output_dir, `${job.export_id}.snapshot.json`), bytes, { mode: 0o600 });
  const omissionPolicy = !snapshot.omissions.length ? 'complete' : job.authorization === undefined ? 'leave-unknowns-blank' : 'recorded-instruction';
  const report = { export_id: job.export_id, snapshot_sha256: snapshotHash, revision: snapshot.profile.revision, language: snapshot.language, watermark, omission_policy: omissionPolicy, omissions: snapshot.omissions, filename, bytes: output.length, sha256: sha256(output), md5: createHash('md5').update(output).digest('hex'), pages: pages.length, placements, status: 'rendered-needs-visual-and-privacy-verification' };
  fs.writeFileSync(path.join(job.output_dir, `${job.export_id}.report.json`), JSON.stringify(report, null, 2), { mode: 0o600 });
  return { filename, bytes: report.bytes, pages: report.pages, watermark, snapshot_sha256: snapshotHash, status: report.status };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, file] = process.argv.slice(2);
    assert(['prepare', 'render'].includes(command) && file, 'Usage: node scripts/render.mjs prepare snapshot.json | render job.json');
    const input = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (command === 'prepare') {
      const { snapshot, snapshotHash } = freezeSnapshot(input);
      console.log(JSON.stringify({ snapshot_sha256: snapshotHash, revision: snapshot.profile.revision, language: snapshot.language, watermark: snapshot.watermark ?? 'yunda', omissions: snapshot.omissions }));
    } else console.log(JSON.stringify(await renderJob(input)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
