import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFName, rgb } from 'pdf-lib';
import { checkRect, drawText } from './text-layout.mjs';

export const fields = JSON.parse(fs.readFileSync(new URL('../fields.json', import.meta.url), 'utf8'));
const states = ['Present', 'Missing', 'Conflict'];
const hashPattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  assert(typeof value === 'string', 'Snapshot leaves must be strings');
  return JSON.stringify(value);
}
function checkKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert(Object.keys(value).sort().join('|') === [...keys].sort().join('|'), `Unexpected or missing ${label} keys`);
}
export function freezeSnapshot(input) {
  const s = structuredClone(input);
  checkKeys(
    s,
    ['schema', 'profile', 'language', 'watermark', 'profile_date', 'template', 'values', 'states', 'photos'],
    'snapshot',
  );
  assert(s.schema === 'yunda-ip-export-v1', 'Unsupported snapshot schema');
  checkKeys(s.profile, ['id', 'revision'], 'profile');
  assert(typeof s.profile.id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(s.profile.id), 'Invalid profile ID');
  assert(/^[1-9]\d*$/.test(s.profile.revision), 'Invalid profile revision');
  assert(['en', 'zh-en'].includes(s.language), 'Invalid answer language');
  assert(['none', 'yunda'].includes(s.watermark), 'Invalid watermark');
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(s.profile_date) &&
      new Date(`${s.profile_date}T00:00:00Z`).toISOString().slice(0, 10) === s.profile_date,
    'Invalid profile date',
  );
  checkKeys(s.template, ['version', 'pdf_sha256', 'map_sha256', 'font_sha256'], 'template');
  for (const key of ['pdf_sha256', 'map_sha256', 'font_sha256'])
    assert(hashPattern.test(s.template[key]), 'Invalid template digest');
  checkKeys(s.values, fields, 'display values');
  checkKeys(s.states, fields, 'source states');
  for (const key of fields) {
    assert(typeof s.values[key] === 'string' && states.includes(s.states[key]), 'Invalid value/state');
    if (s.states[key] !== 'Present') assert(s.values[key] === '', 'Missing or conflicting answers must stay blank');
  }
  assert(
    s.values.display_title.trim() && s.values.profile_date === s.profile_date,
    'Missing cover identity or inconsistent date',
  );
  assert(Array.isArray(s.photos) && s.photos.length <= 3, 'At most three authorized photos');
  const seen = new Set();
  for (const photo of s.photos) {
    checkKeys(photo, ['role', 'source_id', 'sha256'], 'photo');
    assert(
      ['photo-1', 'photo-2', 'photo-3'].includes(photo.role) && !seen.has(photo.role),
      'Invalid/duplicate photo role',
    );
    assert(
      typeof photo.source_id === 'string' && photo.source_id && hashPattern.test(photo.sha256),
      'Invalid photo identity',
    );
    seen.add(photo.role);
  }
  s.photos.sort((a, b) => a.role.localeCompare(b.role));
  s.photos.forEach((p, i) => assert(p.role === `photo-${i + 1}`, 'Photo roles must be contiguous'));
  const bytes = canonical(s);
  return { snapshot: s, bytes, snapshotHash: sha256(bytes) };
}
export async function renderJob(job) {
  const { snapshot: s, bytes, snapshotHash } = freezeSnapshot(job.snapshot);
  assert(uuidPattern.test(job.export_id), 'Invalid immutable export ID');
  const readAsset = (file, hash) => {
    const b = fs.readFileSync(file);
    assert(sha256(b) === hash, 'Private asset checksum mismatch');
    return b;
  };
  const master = readAsset(job.assets.master, s.template.pdf_sha256);
  const map = JSON.parse(readAsset(job.assets.map, s.template.map_sha256).toString('utf8'));
  const fontBytes = readAsset(job.assets.font, s.template.font_sha256);
  assert(
    map.schema === 'yunda-ip-field-map-v1' &&
      map.version === s.template.version &&
      map.template_sha256 === s.template.pdf_sha256,
    'Wrong master/map pair',
  );
  assert(map.page_count === 6 && map.fields.length === fields.length, 'Expected exact six-page IP map');
  const mapped = new Set();
  for (const c of map.fields) {
    assert(fields.includes(c.field) && !mapped.has(c.field), 'Unknown/duplicate mapped field');
    mapped.add(c.field);
  }
  const pdf = await PDFDocument.load(master, { updateMetadata: false });
  const pages = pdf.getPages();
  assert(pages.length === 6, 'Master must have exactly six pages');
  for (const p of pages) {
    const box = p.getMediaBox(),
      crop = p.getCropBox();
    assert(
      p.getRotation().angle === 0 &&
        Math.abs(box.x) < 0.01 &&
        Math.abs(box.y) < 0.01 &&
        Math.abs(box.width - map.width) < 0.01 &&
        Math.abs(box.height - map.height) < 0.01 &&
        Math.abs(crop.x) < 0.01 &&
        Math.abs(crop.y) < 0.01 &&
        Math.abs(crop.width - box.width) < 0.01 &&
        Math.abs(crop.height - box.height) < 0.01,
      'Unexpected master page boxes',
    );
  }
  const photoCells = map.photo_layouts[String(s.photos.length)] || [];
  for (const c of [...map.fields, ...photoCells]) {
    assert(Number.isInteger(c.page) && c.page >= 0 && c.page < 6, 'Invalid map page');
    checkRect(c.rect, map.width, map.height);
  }
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const metrics = fontkit.create(fontBytes);
  const placements = [];
  for (const c of map.fields) {
    const result = drawText(pages[c.page], s.values[c.field], c, font, metrics, [0.24, 0.14, 0.1]);
    if (result) placements.push({ field: c.field, page: c.page, rect: c.rect, ...result });
  }
  for (const photo of s.photos) {
    const c = photoCells.find((c) => c.role === photo.role);
    assert(c, 'Missing photo placement');
    const b = readAsset(job.assets.photos[photo.role], photo.sha256);
    assert(
      b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      'Normalize authorized photos to PNG first',
    );
    const image = await pdf.embedPng(b),
      [l, t, r, bottom] = c.rect;
    const scale = Math.min((r - l) / image.width, (bottom - t) / image.height),
      w = image.width * scale,
      h = image.height * scale;
    pages[c.page].drawImage(image, {
      x: l + (r - l - w) / 2,
      y: map.height - bottom + (bottom - t - h) / 2,
      width: w,
      height: h,
    });
    placements.push({ photo: photo.role, page: c.page, rect: c.rect, width: w, height: h });
  }
  if (s.watermark === 'yunda')
    for (const p of pages)
      p.drawText('YUNDA', { x: 205, y: 375, size: 44, font, color: rgb(0.24, 0.14, 0.1), opacity: 0.045 });
  for (const p of pages) for (const k of ['Annots', 'AA']) p.node.delete(PDFName.of(k));
  for (const k of ['Metadata', 'Names', 'OpenAction', 'AA', 'AcroForm', 'Outlines']) pdf.catalog.delete(PDFName.of(k));
  pdf.context.trailerInfo.Info = undefined;
  const output = await pdf.save({ useObjectStreams: true, addDefaultPage: false });
  const filename = `Yunda-${s.profile.id}-r${s.profile.revision}-${s.profile_date}-${s.language}-wm-${s.watermark}-${job.export_id}.pdf`;
  fs.mkdirSync(job.output_dir, { recursive: true, mode: 0o700 });
  const destination = path.join(job.output_dir, filename);
  assert(!fs.existsSync(destination), 'Immutable export already exists; inspect it before retrying');
  fs.writeFileSync(destination, output, { mode: 0o600 });
  const report = {
    export_id: job.export_id,
    profile_id: s.profile.id,
    revision: s.profile.revision,
    language: s.language,
    watermark: s.watermark,
    pages: 6,
    filename,
    bytes: output.length,
    sha256: sha256(output),
    md5: createHash('md5').update(output).digest('hex'),
    snapshot_sha256: snapshotHash,
    photos: s.photos.length,
    blank_fields: fields.filter((k) => !s.values[k]),
    placements,
    status: 'rendered-needs-visual-and-private-delivery-verification',
  };
  fs.writeFileSync(path.join(job.output_dir, `${job.export_id}.snapshot.json`), bytes, { mode: 0o600 });
  fs.writeFileSync(path.join(job.output_dir, `${job.export_id}.report.json`), JSON.stringify(report, null, 2), {
    mode: 0o600,
  });
  return { filename, pages: 6, bytes: output.length, sha256: report.sha256, status: report.status };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [verb, file] = process.argv.slice(2);
    assert(verb === 'render' && file, 'Usage: node scripts/render.mjs render /private/job.json');
    console.log(JSON.stringify(await renderJob(JSON.parse(fs.readFileSync(file, 'utf8')))));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
