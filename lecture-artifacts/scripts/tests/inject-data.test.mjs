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
