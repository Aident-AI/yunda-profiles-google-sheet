import { rgb } from 'pdf-lib';

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
  for (const character of text.replace(/\s/gu, ''))
    assert(metrics.hasGlyphForCodePoint(character.codePointAt(0)), 'Missing font glyph');
  for (let size = startSize; size >= 7; size = Math.round((size - 0.25) * 100) / 100) {
    const lines = wrap(text, font, size, right - left - 8);
    if (!lines) continue;
    const bounds = lines.flatMap((line) => metrics.layout(line).glyphs.map((glyph) => glyph.bbox));
    const ascent = (Math.max(0, ...bounds.map((box) => box.maxY)) / metrics.unitsPerEm) * size;
    const descent = (Math.min(0, ...bounds.map((box) => box.minY)) / metrics.unitsPerEm) * size;
    const lineHeight = Math.max(size * 1.22, ascent - descent + size * 0.08);
    const height = ascent - descent + (lines.length - 1) * lineHeight;
    if (height <= bottom - top - 4) return { size, lines, ascent, descent, lineHeight, height };
  }
  throw new Error(
    'Text does not fit at readable size; shorten the display text without changing its meaning or report overflow',
  );
}

export function firstBaseline(pageHeight, rect, fitted) {
  return pageHeight - rect[1] - (rect[3] - rect[1] - fitted.height) / 2 - fitted.ascent;
}

export function drawText(page, text, cell, font, metrics, color = [0.12, 0.1, 0.09]) {
  if (!text) return null;
  const fitted = fitText(text, cell.rect, cell.fontSize || 11.5, font, metrics);
  const baseline = firstBaseline(page.getHeight(), cell.rect, fitted);
  for (const [index, line] of fitted.lines.entries()) {
    page.drawText(line, {
      x: cell.rect[0] + (cell.rect[2] - cell.rect[0] - font.widthOfTextAtSize(line, fitted.size)) / 2,
      y: baseline - index * fitted.lineHeight,
      font,
      size: fitted.size,
      color: rgb(...color),
    });
  }
  return { size: fitted.size, lines: fitted.lines.length, firstBaseline: baseline };
}

export function checkRect(rect, width, height) {
  assert(Array.isArray(rect) && rect.length === 4 && rect.every(Number.isFinite), 'Invalid rectangle');
  const [l, t, r, b] = rect;
  assert(l >= 0 && t >= 0 && r > l && b > t && r <= width && b <= height, 'Rectangle out of bounds');
}
