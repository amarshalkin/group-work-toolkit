import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseProgram } from '../parse-program.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fix = (n) => readFileSync(join(__dirname, 'fixtures', n), 'utf8');

test('parses markdown numbered list to program[]', () => {
  const r = parseProgram(fix('program-sample.md'), 'md');
  assert.ok(Array.isArray(r.program));
  assert.equal(r.program.length, 7);
  assert.equal(r.program[0].n, 1);
  assert.equal(r.program[0].lecturer, 'Дмитрий Бризицкий');
  assert.match(r.program[0].title, /ИИ.*фронтир/i);
  assert.equal(r.program[0].hall, 'большой зал');
  assert.equal(r.program[6].n, 7);
});

test('parses YAML frontmatter-style program', () => {
  const r = parseProgram(fix('program-sample.yaml'), 'yaml');
  assert.equal(r.event.name, 'Весенний педсовет');
  assert.equal(r.program.length, 2);
  assert.equal(r.program[1].lecturer, 'Виктор Басюк');
});

test('returns {event:null, program:[]} for unrecognised content', () => {
  const r = parseProgram('just some prose without structure', 'md');
  assert.equal(r.program.length, 0);
});
