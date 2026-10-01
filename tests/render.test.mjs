import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { freezeSnapshot, canonical, checkAuthorization, checkRect, firstBaseline, fitText, resolvePhotoCells, checkTemplateVariant } from '../scripts/render.mjs';

const fields = JSON.parse(fs.readFileSync(new URL('../fields.json', import.meta.url), 'utf8'));
function fixture() {
  return {
    schema: 'yunda-export-v1',
    profile: { profile_id: '11111111-1111-4111-8111-111111111111', revision: '2' },
    language: 'zh-en', export_date: '2026-09-30',
    answers: fields.map(field_key => ({ field_key, value: field_key === 'displayName' ? 'T.S.' : '', state: field_key === 'displayName' ? 'Confirmed' : 'Missing' })),
    display_values: Object.fromEntries(fields.map(key => [key, key === 'displayName' ? 'T.S.' : ''])),
    photos: [], template: { version: 'test', template_pdf_sha256: 'a'.repeat(64), field_map_sha256: 'b'.repeat(64), font_sha256: 'c'.repeat(64) },
    omissions: [...fields.filter(key => key !== 'displayName'), 'photos.cover', 'photos.gallery-1', 'photos.gallery-2'],
  };
}

test('snapshot hash is independent of answer row and object key ordering', () => {
  const first = fixture();
  const second = fixture();
  second.answers.reverse();
  second.display_values = Object.fromEntries(Object.entries(second.display_values).reverse());
  assert.equal(freezeSnapshot(first).snapshotHash, freezeSnapshot(second).snapshotHash);
});

test('revision or bilingual display change invalidates prior approval', () => {
  const input = fixture();
  const first = freezeSnapshot(input);
  const authorization = { snapshot_sha256: first.snapshotHash, profile_revision: '2', language: 'zh-en', omissions: first.snapshot.omissions, instruction: 'Use these blanks for this test.' };
  checkAuthorization(first.snapshot, first.snapshotHash, authorization);
  input.profile.revision = '3';
  const next = freezeSnapshot(input);
  assert.throws(() => checkAuthorization(next.snapshot, next.snapshotHash, authorization), /stale/);
  input.profile.revision = '2';
  input.display_values.displayName = 'T.S. / 示例';
  assert.notEqual(freezeSnapshot(input).snapshotHash, first.snapshotHash);
});

test('private keys, duplicate fields and invented missing values are rejected', () => {
  const privateInput = fixture();
  privateInput.display_values['internal.phone'] = 'PRIVATE';
  assert.throws(() => freezeSnapshot(privateInput), /Unsafe display/);
  const duplicates = fixture();
  duplicates.answers[1] = duplicates.answers[0];
  assert.throws(() => freezeSnapshot(duplicates), /duplicate/);
  const invented = fixture();
  invented.display_values.hiv = 'No';
  assert.throws(() => freezeSnapshot(invented), /remain blank/);
});

test('omission authorization must cover the exact unresolved fields and photo roles', () => {
  const input = fixture();
  input.omissions.pop();
  assert.throws(() => freezeSnapshot(input), /exactly match/);
});

test('canonical UTF-8 uses sorted keys, preserves CJK and rejects ambiguous numeric leaves', () => {
  assert.equal(canonical({ z: '中', a: '1' }), '{"a":"1","z":"中"}');
  assert.throws(() => canonical({ a: 1 }), /strings/);
});

test('top-left conversion does not accumulate an offset on later pages', () => {
  const fit = { height: 20, ascent: 9 };
  for (let page = 0; page < 7; page++) assert.equal(firstBaseline(842, [30, 100, 200, 140], fit), 723);
  assert.equal(firstBaseline(842, [30, 500, 200, 540], fit), 323);
  assert.throws(() => checkRect([0, 0, 596, 10], 595, 842), /out of bounds/);
});

test('legacy gallery map order maps to distinct gallery-1 and gallery-2 roles', () => {
  const cells = [{ role: 'cover' }, { role: 'gallery' }, { role: 'gallery' }];
  assert.deepEqual(resolvePhotoCells(cells).map(cell => cell.role), ['cover', 'gallery-1', 'gallery-2']);
  assert.throws(() => resolvePhotoCells([{ role: 'cover' }, { role: 'cover' }, { role: 'gallery' }]), /three supported/);
});

test('overflow and missing glyphs fail instead of silently clipping', () => {
  const font = { widthOfTextAtSize: (text, size) => text.length * size };
  const metrics = { unitsPerEm: 1000, hasGlyphForCodePoint: point => point < 128, layout: text => ({ glyphs: [...text].map(() => ({ bbox: { maxY: 800, minY: -200 } })) }) };
  assert.throws(() => fitText('中', [0, 0, 100, 30], 11, font, metrics), /glyph/);
  assert.throws(() => fitText('long '.repeat(300), [0, 0, 100, 30], 11, font, metrics), /does not fit/);
  const result = fitText('test', [0, 0, 100, 30], 11, font, metrics);
  assert.equal(result.lines.join(''), 'test');
});

test('v2 requires an explicit watermark choice and changes the frozen hash', () => {
  const input = { ...fixture(), schema: 'yunda-export-v2', watermark: 'yunda' };
  const branded = freezeSnapshot(input);
  input.watermark = 'none';
  const neutral = freezeSnapshot(input);
  assert.notEqual(branded.snapshotHash, neutral.snapshotHash);
  const authorization = { snapshot_sha256: branded.snapshotHash, profile_revision: '2', language: 'zh-en', watermark: 'yunda', omissions: branded.snapshot.omissions, instruction: 'These blanks, with watermark.' };
  assert.throws(() => checkAuthorization(neutral.snapshot, neutral.snapshotHash, authorization), /stale/);
  authorization.snapshot_sha256 = neutral.snapshotHash;
  assert.throws(() => checkAuthorization(neutral.snapshot, neutral.snapshotHash, authorization), /watermark mismatch/);
  for (const value of [undefined, '', 'false', false, 'other']) {
    input.watermark = value;
    assert.throws(() => freezeSnapshot(input), /explicitly/);
  }
});

test('watermark selection cannot silently use the other master or an unpinned neutral master', () => {
  const snapshot = { ...fixture(), schema: 'yunda-export-v2', watermark: 'none' };
  assert.throws(() => checkTemplateVariant(snapshot, {}), /variant mismatch/);
  assert.throws(() => checkTemplateVariant(snapshot, { watermark: 'none' }), /pin/);
  assert.throws(() => checkTemplateVariant(snapshot, { watermark: 'none', template_pdf_sha256: 'd'.repeat(64) }), /identity mismatch/);
  const map = { watermark: 'none', template_pdf_sha256: snapshot.template.template_pdf_sha256 };
  assert.equal(checkTemplateVariant(snapshot, map), 'none');
  snapshot.watermark = 'yunda';
  assert.throws(() => checkTemplateVariant(snapshot, map), /variant mismatch/);
  assert.equal(checkTemplateVariant(snapshot, {}), 'yunda');
});

test('legacy snapshots retain their hash and only use the branded legacy map', () => {
  const snapshot = fixture();
  assert.equal(checkTemplateVariant(snapshot, {}), 'yunda');
  assert.throws(() => checkTemplateVariant(snapshot, { watermark: 'none' }), /variant mismatch/);
  const frozen = freezeSnapshot(snapshot);
  assert.equal(Object.hasOwn(frozen.snapshot, 'watermark'), false);
  assert.equal(frozen.bytes, canonical({ ...snapshot, answers: [...snapshot.answers].sort((a, b) => a.field_key < b.field_key ? -1 : 1), omissions: [...snapshot.omissions].sort() }));
});
