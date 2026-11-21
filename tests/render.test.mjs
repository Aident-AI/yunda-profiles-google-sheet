import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { canonical, fields, freezeSnapshot } from '../scripts/render.mjs';
import { checkRect, fitText } from '../scripts/text-layout.mjs';

function fixture() {
  const values = Object.fromEntries(fields.map((k) => [k, '']));
  values.display_title = 'Synthetic Parent';
  values.profile_date = '2026-11-21';
  const states = Object.fromEntries(fields.map((k) => [k, values[k] ? 'Present' : 'Missing']));
  return {
    schema: 'yunda-ip-export-v1',
    profile: { id: 'SYNTHETIC', revision: '1' },
    language: 'zh-en',
    watermark: 'none',
    profile_date: '2026-11-21',
    template: {
      version: 'synthetic',
      pdf_sha256: '0'.repeat(64),
      map_sha256: '1'.repeat(64),
      font_sha256: '2'.repeat(64),
    },
    values,
    states,
    photos: [],
  };
}
test('a request with missing answers and no photos renders a valid frozen job without another approval', () =>
  assert.equal(freezeSnapshot(fixture()).snapshot.photos.length, 0));
test('unresolved medical preferences cannot acquire invented answers', () => {
  const s = fixture();
  s.values.embryos_per_transfer = 'One';
  assert.throws(() => freezeSnapshot(s), /must stay blank/);
  s.states.embryos_per_transfer = 'Conflict';
  assert.throws(() => freezeSnapshot(s), /must stay blank/);
});
test('clinical screening and birth dates cannot enter the export allowlist', () => {
  for (const k of ['date_of_birth', 'hepatitis_b', 'internal_notes']) {
    const s = fixture();
    s.values[k] = 'private';
    assert.throws(() => freezeSnapshot(s), /Unexpected/);
  }
});
test('the PDF date cannot drift from the frozen profile date', () => {
  const s = fixture();
  s.values.profile_date = '2020-01-01';
  assert.throws(() => freezeSnapshot(s), /inconsistent date/);
});
test('snapshot hashing is independent of JSON property order', () => {
  const s = fixture();
  const reversed = Object.fromEntries(Object.entries(s).reverse());
  assert.equal(freezeSnapshot(s).snapshotHash, freezeSnapshot(reversed).snapshotHash);
});
test('selected photo identities and bytes are part of the immutable snapshot', () => {
  const s = fixture(),
    before = freezeSnapshot(s).snapshotHash;
  s.photos = [{ role: 'photo-1', source_id: 'synthetic-photo', sha256: '3'.repeat(64) }];
  assert.notEqual(freezeSnapshot(s).snapshotHash, before);
  s.photos.push({ ...s.photos[0] });
  assert.throws(() => freezeSnapshot(s), /duplicate/);
});
test('fixed map covers all outward fields exactly once within six pages', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../references/fixed-template-map.json', import.meta.url)));
  assert.equal(m.page_count, 6);
  assert.deepEqual(m.fields.map((c) => c.field).sort(), [...fields].sort());
  for (const c of m.fields) {
    assert(c.page >= 0 && c.page < 6);
    checkRect(c.rect, m.width, m.height);
  }
  for (const cells of Object.values(m.photo_layouts)) for (const c of cells) checkRect(c.rect, m.width, m.height);
});
test('out-of-bounds answer coordinates cannot silently draw outside the template', () =>
  assert.throws(() => checkRect([0, 0, 600, 20], 595.5, 842.25), /bounds/));
test('unreadable overflow fails instead of adding pages or clipping', () => {
  const font = { widthOfTextAtSize: (s, size) => s.length * size * 0.6 };
  const metrics = {
    hasGlyphForCodePoint: () => true,
    unitsPerEm: 1000,
    layout: (s) => ({ glyphs: [...s].map(() => ({ bbox: { maxY: 800, minY: -200 } })) }),
  };
  assert.throws(() => fitText('x'.repeat(2000), [0, 0, 100, 20], 11, font, metrics), /does not fit/);
});
test('canonical snapshots reject hidden non-string objects and numerical coercion', () =>
  assert.throws(() => canonical({ state: 0 }), /strings/));
