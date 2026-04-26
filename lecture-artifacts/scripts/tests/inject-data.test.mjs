import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inject } from '../inject-data.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

test('synthetic: replaces DATA block, evt-markers, <title>', () => {
  const tpl = fixture('synthetic.template.html');
  const data = JSON.parse(fixture('synthetic.data.json'));
  const event = JSON.parse(fixture('synthetic.event.json'));
  const expected = fixture('synthetic.expected.html');
  const actual = inject(tpl, data, event);
  assert.equal(actual, expected);
});

import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('throws when DATA banner+block missing', () => {
  const tpl = '<html><body>no DATA here</body></html>';
  assert.throws(() => inject(tpl, { x: 1 }, {}), /DATA banner\+block not found/);
});

test('leaves output unchanged when markers map is empty', () => {
  const tpl = `<title>T</title>\n<!-- evt:x -->keep<!-- /evt -->\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n  a: 1\n};`;
  const out = inject(tpl, { a: 1 }, {});
  assert.match(out, /<!-- evt:x -->keep<!-- \/evt -->/);
  assert.match(out, /const DATA = \{\s+"a": 1\s*\};/);
});

test('event-name marker with cyrillic content', () => {
  const tpl = `<!-- evt:e -->Old<!-- /evt -->\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};`;
  const out = inject(tpl, {}, { markers: { e: 'Весенний педсовет' } });
  assert.match(out, /<!-- evt:e -->Весенний педсовет<!-- \/evt -->/);
});

test('CLI --validate: ok on synthetic fixtures', () => {
  const cli = join(__dirname, '..', 'inject-data.mjs');
  const data = join(__dirname, 'fixtures', 'synthetic.data.json');
  const tpl = join(__dirname, 'fixtures', 'synthetic.template.html');
  const r = spawnSync('node', [cli, '--validate', data, tpl], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ok/);
});

test('CLI --validate: fails when template has no DATA banner', () => {
  const cli = join(__dirname, '..', 'inject-data.mjs');
  const data = join(__dirname, 'fixtures', 'synthetic.data.json');
  const broken = join(__dirname, 'fixtures', 'broken.template.html');
  writeFileSync(broken, '<html>no banner here</html>');
  const r = spawnSync('node', [cli, '--validate', data, broken], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /DATA banner\+block not found/);
});
