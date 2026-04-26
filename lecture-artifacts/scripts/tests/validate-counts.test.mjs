import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateCounts } from '../validate-counts.mjs';

test('validateCounts: no issues when count matches array length', () => {
  const data = { parameters: [1, 2, 3, 4, 5, 6] };
  const event = { markers: { 'page-title': 'Шесть переключателей описывают школу' } };
  const issues = validateCounts(data, event);
  assert.equal(issues.length, 0);
});

test('validateCounts: issue when count mismatches all array lengths', () => {
  const data = { parameters: [1, 2, 3, 4] };
  const event = { markers: { 'page-title': 'Шесть переключателей описывают школу' } };
  const issues = validateCounts(data, event);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].marker, 'page-title');
  assert.equal(issues[0].word, 'шесть');
  assert.equal(issues[0].mentionedCount, 6);
});

test('validateCounts: ignores numbers when value matches a different array', () => {
  const data = { parameters: [1, 2, 3, 4], indicators: [1, 2, 3, 4, 5, 6] };
  const event = { markers: { 'page-title': 'Шесть приборов считают' } };
  const issues = validateCounts(data, event);
  // "Шесть" matches indicators.length, so no issue
  assert.equal(issues.length, 0);
});

test('validateCounts: handles missing event.markers gracefully', () => {
  const issues = validateCounts({ x: [1, 2] }, {});
  assert.equal(issues.length, 0);
});

test('validateCounts: ignores non-string marker values', () => {
  const data = { parameters: [1, 2, 3, 4] };
  const event = { markers: { 'page-title': null, 'count': 6 } };
  const issues = validateCounts(data, event);
  assert.equal(issues.length, 0);
});

test('validateCounts: case-insensitive number-word matching', () => {
  const data = { items: [1, 2, 3] };
  const event = { markers: { 'page-title': 'СЕМЬ артефактов' } };
  const issues = validateCounts(data, event);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].word, 'семь');
});

test('validateCounts: word boundary — does not match substring', () => {
  // "семьдесят" contains "семь" but should not match as standalone "семь"
  const data = { items: [1] };
  const event = { markers: { 'page-title': 'семьдесят процентов' } };
  const issues = validateCounts(data, event);
  // "семьдесят" is not in the dictionary; "семь" should not match because word-boundary fails
  assert.equal(issues.length, 0);
});
