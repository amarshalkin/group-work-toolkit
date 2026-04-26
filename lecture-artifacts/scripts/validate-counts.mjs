// Heuristic check: Russian number-words in event.markers should correspond to
// some DATA array length. Soft warning — does not throw. Used by the
// lecture-artifact-build skill as a sanity gate before final inject.

const NUM_WORDS = {
  'один': 1, 'одна': 1, 'одно': 1,
  'два': 2, 'две': 2,
  'три': 3, 'четыре': 4, 'пять': 5, 'шесть': 6, 'семь': 7,
  'восемь': 8, 'девять': 9, 'десять': 10,
  'одиннадцать': 11, 'двенадцать': 12,
};

function arraySizes(data) {
  const sizes = {};
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) sizes[k] = v.length;
    }
  }
  return sizes;
}

export function validateCounts(data, event) {
  const issues = [];
  const markers = (event && event.markers) || {};
  const sizes = arraySizes(data);
  const sizeValues = new Set(Object.values(sizes));
  for (const [key, val] of Object.entries(markers)) {
    if (typeof val !== 'string' || val.length === 0) continue;
    const lower = val.toLowerCase();
    for (const [word, n] of Object.entries(NUM_WORDS)) {
      const re = new RegExp('(?:^|[^\\p{L}])' + word + '(?:$|[^\\p{L}])', 'iu');
      if (!re.test(lower)) continue;
      if (sizeValues.has(n)) continue;
      issues.push({
        marker: key,
        word,
        mentionedCount: n,
        availableArraySizes: sizes,
        message: `Marker "${key}" mentions "${word}" (=${n}); no DATA array has length ${n}. Available: ${JSON.stringify(sizes)}.`,
      });
    }
  }
  return issues;
}

// CLI: node validate-counts.mjs <data.json> <event.json>
// Exit 0 with output if no issues; exit 1 with issues listed.
async function main(argv) {
  const [dataPath, eventPath] = argv;
  if (!dataPath || !eventPath) {
    process.stderr.write('usage: validate-counts.mjs <data.json> <event.json>\n');
    process.exit(2);
  }
  const fs = await import('node:fs');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const issues = validateCounts(data, event);
  if (issues.length === 0) {
    process.stdout.write('ok: no count mismatches\n');
    process.exit(0);
  }
  for (const i of issues) process.stderr.write('WARN: ' + i.message + '\n');
  process.exit(1);
}

import { pathToFileURL } from 'node:url';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write('validate-counts: ' + err.message + '\n');
    process.exit(1);
  });
}
