#!/usr/bin/env node
// Pure transformer: (template HTML, data, eventFields) -> output HTML.
// Three replacements: <title>, <!-- evt:KEY -->...<!-- /evt --> spans, and the
// `const DATA = {...};` block delimited by the «DATA — обновляется...» banner.

import { readFileSync, writeFileSync } from 'node:fs';

const DATA_BLOCK_RE =
  /(\/\* ═+\s*\n\s*DATA — обновляется[\s\S]*?═+ \*\/\s*\n)const DATA = \{[\s\S]*?\n\};/m;

export function replaceDataBlock(html, data) {
  if (!DATA_BLOCK_RE.test(html)) {
    throw new Error('inject-data: DATA banner+block not found in template');
  }
  const json = JSON.stringify(data, null, 2);
  return html.replace(DATA_BLOCK_RE, `$1const DATA = ${json};`);
}

export function replaceEvtMarkers(html, markers) {
  let out = html;
  for (const [key, value] of Object.entries(markers || {})) {
    const re = new RegExp(
      `(<!-- evt:${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')} -->)[\\s\\S]*?(<!-- /evt -->)`,
      'g',
    );
    out = out.replace(re, `$1${value}$2`);
  }
  return out;
}

export function replaceTitle(html, title) {
  if (title == null) return html;
  return html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
}

export function inject(template, data, event = {}) {
  let out = template;
  out = replaceTitle(out, event.title);
  out = replaceEvtMarkers(out, event.markers);
  out = replaceDataBlock(out, data);
  return out;
}

// CLI: node inject-data.mjs <template.html> <data.json> <event.json> <output.html>
//      node inject-data.mjs --validate <data.json> <template.html>
async function main(argv) {
  if (argv[0] === '--validate') {
    const [, dataPath, tplPath] = argv;
    if (!dataPath || !tplPath) {
      process.stderr.write('usage: inject-data.mjs --validate <data.json> <template.html>\n');
      process.exit(2);
    }
    let data;
    try {
      data = JSON.parse(readFileSync(dataPath, 'utf8'));
    } catch (err) {
      process.stderr.write(`invalid JSON in ${dataPath}: ${err.message}\n`);
      process.exit(1);
    }
    const tpl = readFileSync(tplPath, 'utf8');
    if (!DATA_BLOCK_RE.test(tpl)) {
      process.stderr.write(`template ${tplPath}: DATA banner+block not found\n`);
      process.exit(1);
    }
    try {
      replaceDataBlock(tpl, data);
    } catch (err) {
      process.stderr.write(`validation failed: ${err.message}\n`);
      process.exit(1);
    }
    process.stdout.write('ok\n');
    process.exit(0);
  }
  const [tplPath, dataPath, eventPath, outPath] = argv;
  if (!tplPath || !dataPath || !eventPath || !outPath) {
    process.stderr.write(
      'usage: inject-data.mjs <template.html> <data.json> <event.json> <output.html>\n',
    );
    process.exit(2);
  }
  const tpl = readFileSync(tplPath, 'utf8');
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
  const out = inject(tpl, data, event);
  writeFileSync(outPath, out);
  process.stdout.write(`wrote ${outPath} (${out.length} bytes)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`inject-data: ${err.message}\n`);
    process.exit(1);
  });
}
