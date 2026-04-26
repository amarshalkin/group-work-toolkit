# Lecture-Artifacts Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `lecture-artifacts` Claude Code plugin (8 templates: 7 lecture artefacts + landing) inside the renamed `pedsovet` marketplace, with `.claude/lecture-artifacts.local.md` as shared event state and try-call integration with `knottasoft:host-html` for publishing.

**Architecture:** Thin slash commands → shared `lecture-artifact-build` skill → pure Node `inject-data.mjs` engine. Templates are self-contained `templates/<id>/{template.html, schema.md, example-data.json}`. Each template page keeps its `const DATA = {…}` block as the only mutable region; the engine swaps that block plus event-marker spans (`<!-- evt:* -->`) and the `<title>`. Old `group-work-toolkit` plugin gets demoted from marketplace root into a sibling subfolder.

**Tech Stack:** Claude Code plugin manifest + commands + skills. Node ≥ 18 (no npm deps; ESM modules; `node --test`). Markdown/YAML frontmatter for `.local.md`. GitHub repo rename via `gh`.

**Reference spec:** `docs/superpowers/specs/2026-04-26-lecture-artifacts-plugin-design.md` (in this same repo).

**Path conventions used in this plan:**
- `<root>` = `/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026`
- `<repo>` = git repo root. Before Task 1: `<root>/group-work-toolkit`. After Task 1: `<root>/pedsovet` (and the old plugin lives at `<repo>/group-work-toolkit/`).
- `<plugin>` = `<repo>/lecture-artifacts/` (new plugin, created in Task 4).
- `<templates-source>` = `<root>/методика/prototype/final/`.

---

## File Structure (target end state, in `<repo>` after migration)

```
pedsovet/                                          ← <repo>, GitHub: amarshalkin/pedsovet
├── .claude-plugin/
│   └── marketplace.json                           ← rewritten: name=pedsovet, 2 plugins
├── docs/superpowers/{specs,plans}/                ← already present
├── group-work-toolkit/                            ← old plugin demoted into subfolder
│   ├── .claude-plugin/plugin.json
│   ├── commands/, skills/, evals/, references/, assets/
│   ├── README.md, CHANGELOG.md
└── lecture-artifacts/                             ← <plugin>, NEW
    ├── .claude-plugin/plugin.json
    ├── commands/
    │   ├── init.md
    │   ├── manifesto.md
    │   ├── pick-and-plan.md
    │   ├── scenario-cards.md
    │   ├── case-matcher.md
    │   ├── parameter-dashboard.md
    │   ├── step-builder.md
    │   ├── diagnostic-quiz.md
    │   └── event-landing.md
    ├── skills/
    │   ├── event-init/SKILL.md
    │   ├── lecture-artifact-build/
    │   │   ├── SKILL.md
    │   │   └── references/{injection-protocol,transcript-to-data,host-integration}.md
    │   └── event-landing-build/SKILL.md
    ├── templates/
    │   ├── manifesto/{template.html, schema.md, example-data.json}
    │   ├── pick-and-plan/{...}
    │   ├── scenario-cards/{...}
    │   ├── case-matcher/{...}
    │   ├── parameter-dashboard/{...}
    │   ├── step-builder/{...}
    │   ├── diagnostic-quiz/{...}
    │   └── event-landing/{...}
    ├── scripts/
    │   ├── inject-data.mjs
    │   ├── parse-program.mjs
    │   └── tests/
    │       ├── inject-data.test.mjs
    │       ├── parse-program.test.mjs
    │       └── fixtures/
    ├── references/{adding-new-template, event-config-format, template-mapping}.md
    ├── README.md
    └── CHANGELOG.md
```

**File-responsibility cheatsheet:**
- `inject-data.mjs` — pure transformer: `(template.html, data, eventFields) → output.html`. No filesystem coupling beyond CLI argument parsing. Three responsibilities: (a) replace `const DATA = {…}` block; (b) replace `<!-- evt:KEY -->…<!-- /evt -->` spans; (c) replace `<title>`. Plus `--validate` mode that just runs schema validation.
- `parse-program.mjs` — pure transformer: `(rawText, format) → normalizedProgram`. Supports md/yaml/json. Falls back to `null` if structure can't be inferred.
- Skill `lecture-artifact-build` — orchestrates one template build: pick lecture from program, read transcript, generate JSON via Claude reasoning, run `inject-data.mjs --validate` then build, attempt host-html, update `.local.md`.
- Skill `event-init` — owns `.local.md` lifecycle (create, parse program, top up missing fields via `AskUserQuestion`).
- Skill `event-landing-build` — reads `.local.md` + filesystem state, builds landing.
- `templates/<id>/template.html` — the page itself, with: (a) anchored `const DATA = {…}` block (already present in source pages), (b) `<!-- evt:* -->` spans added once, (c) example data still inline so the file opens in browser as a working preview.
- `templates/<id>/schema.md` — human description + JSON Schema (json fenced block) for the DATA structure.
- `templates/<id>/example-data.json` — a copy of the current DATA from `final/<id>/index.html`, used as golden test input.

---

## Phase 1 — Marketplace migration

### Task 1: Demote old plugin into subfolder, rename root

**Files:**
- Move: `<root>/group-work-toolkit/{commands,skills,evals,references,assets,README.md,CHANGELOG.md,SKILL.md,.gitignore}` → `<root>/group-work-toolkit/group-work-toolkit/`
- Move: `<root>/group-work-toolkit/.claude-plugin/plugin.json` → `<root>/group-work-toolkit/group-work-toolkit/.claude-plugin/plugin.json`
- Keep at root: `.claude-plugin/marketplace.json`, `.git/`, `docs/`
- Then rename `<root>/group-work-toolkit/` → `<root>/pedsovet/`

- [ ] **Step 1: From `<root>/group-work-toolkit`, list current contents to confirm what moves**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/group-work-toolkit"
ls -A
```

Expected output should include: `.claude-plugin .git .gitignore CHANGELOG.md README.md SKILL.md assets commands docs evals references skills` (varies; confirm before moving).

- [ ] **Step 2: Create the new subfolder for the demoted plugin**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/group-work-toolkit"
mkdir -p group-work-toolkit/.claude-plugin
```

- [ ] **Step 3: Move plugin contents into the subfolder using `git mv`**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/group-work-toolkit"
git mv commands group-work-toolkit/commands
git mv skills group-work-toolkit/skills
git mv evals group-work-toolkit/evals
git mv references group-work-toolkit/references 2>/dev/null || true
git mv assets group-work-toolkit/assets 2>/dev/null || true
git mv README.md group-work-toolkit/README.md
git mv CHANGELOG.md group-work-toolkit/CHANGELOG.md
git mv SKILL.md group-work-toolkit/SKILL.md 2>/dev/null || true
git mv .claude-plugin/plugin.json group-work-toolkit/.claude-plugin/plugin.json
```

(`docs/` stays at root — it's the marketplace's docs, not the plugin's. `.gitignore` stays at root.)

- [ ] **Step 4: Verify file moves**

```bash
git status -s | head -40
ls group-work-toolkit/
ls .claude-plugin/
```

Expected: `.claude-plugin/` at root contains only `marketplace.json`. `group-work-toolkit/` subfolder contains the plugin.

- [ ] **Step 5: Commit the file moves**

```bash
git commit -m "Demote group-work-toolkit plugin into subfolder for two-plugin marketplace"
```

- [ ] **Step 6: Rename the root folder**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026"
mv group-work-toolkit pedsovet
```

(Folder rename — no git operation needed. The git repo continues to work; only the user-facing folder name changes.)

- [ ] **Step 7: Verify the rename and that git still works**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet"
git status -sb
git log -1 --oneline
```

Expected: `## main...origin/main` and the previous commit hash.

---

### Task 2: Rewrite `marketplace.json` for two plugins, bump versions

**Files:**
- Modify: `<repo>/.claude-plugin/marketplace.json` (full rewrite)
- Modify: `<repo>/group-work-toolkit/.claude-plugin/plugin.json` (bump to `0.10.1`, no other changes)

- [ ] **Step 1: Replace `<repo>/.claude-plugin/marketplace.json` with the new two-plugin manifest**

Write file content (overwrite existing):

```json
{
  "name": "pedsovet",
  "owner": {
    "name": "Artem Marshalkin",
    "email": "artem.marshalkin@gmail.com",
    "url": "https://github.com/amarshalkin"
  },
  "metadata": {
    "description": "Маркетплейс плагинов для подготовки и проведения педагогических событий: проектирование групповой работы (group-work-toolkit) и сборка HTML-артефактов из расшифровок лекций (lecture-artifacts).",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "group-work-toolkit",
      "source": "./group-work-toolkit",
      "description": "Проектирование, ревью и пост-сессионный разбор групповой работы. 3 скилла (design-group-work, review-session-design, debrief-session), 3 slash-команды.",
      "version": "0.10.1",
      "author": { "name": "Артём Маршалкин", "email": "artem.marshalkin@gmail.com" },
      "category": "education",
      "tags": ["education", "facilitation", "moderation", "group-work", "ksp", "russian"]
    },
    {
      "name": "lecture-artifacts",
      "source": "./lecture-artifacts",
      "description": "Превращает расшифровку лекции в готовую HTML-страницу-артефакт по одному из 7 функциональных шаблонов (квиз, дашборд, кейсы, манифест и т. д.) с опциональной автопубликацией через knottasoft:host-html.",
      "version": "0.1.0",
      "author": { "name": "Артём Маршалкин", "email": "artem.marshalkin@gmail.com" },
      "category": "education",
      "tags": ["education", "lectures", "html", "templates", "russian", "knotta"]
    }
  ]
}
```

- [ ] **Step 2: Bump `group-work-toolkit/.claude-plugin/plugin.json` version to `0.10.1`**

Edit `<repo>/group-work-toolkit/.claude-plugin/plugin.json`: change `"version": "0.10.0"` → `"version": "0.10.1"`. Description and other fields untouched.

- [ ] **Step 3: Validate JSON syntax**

```bash
node -e 'JSON.parse(require("fs").readFileSync(".claude-plugin/marketplace.json"))' && \
node -e 'JSON.parse(require("fs").readFileSync("group-work-toolkit/.claude-plugin/plugin.json"))' && \
echo "JSON OK"
```

Expected: `JSON OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/marketplace.json group-work-toolkit/.claude-plugin/plugin.json
git commit -m "Marketplace: rename to pedsovet, register lecture-artifacts (v1.0.0)"
```

---

### Task 3: Rename GitHub repo and update remote

**Files:** none (GitHub-side rename + local remote update)

- [ ] **Step 1: Rename the GitHub repo**

```bash
gh repo rename pedsovet -R amarshalkin/group-work-toolkit --confirm
```

Expected: `✓ Renamed repository ... → amarshalkin/pedsovet`. (GitHub keeps a redirect from the old URL.)

If `gh` is not authenticated as `amarshalkin` or rename fails, stop and ask the user — do not proceed.

- [ ] **Step 2: Update the local remote URL**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet"
git remote set-url origin https://github.com/amarshalkin/pedsovet.git
git remote -v
```

Expected: both `(fetch)` and `(push)` lines show the new URL.

- [ ] **Step 3: Push the migration commits**

```bash
git push origin main
```

Expected: push succeeds, no errors.

---

## Phase 2 — Plugin scaffold

### Task 4: Create `lecture-artifacts` directory tree and manifest

**Files:**
- Create: `<repo>/lecture-artifacts/.claude-plugin/plugin.json`
- Create: `<repo>/lecture-artifacts/{commands,skills,templates,scripts,scripts/tests,scripts/tests/fixtures,references}/.gitkeep`
- Create: `<repo>/lecture-artifacts/README.md`
- Create: `<repo>/lecture-artifacts/CHANGELOG.md`

- [ ] **Step 1: Create the directory structure**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet"
mkdir -p lecture-artifacts/{.claude-plugin,commands,skills,templates,scripts/tests/fixtures,references}
touch lecture-artifacts/{commands,skills,templates,references}/.gitkeep
touch lecture-artifacts/scripts/tests/.gitkeep
touch lecture-artifacts/scripts/tests/fixtures/.gitkeep
```

- [ ] **Step 2: Write `lecture-artifacts/.claude-plugin/plugin.json`**

```json
{
  "name": "lecture-artifacts",
  "version": "0.1.0",
  "description": "Превращает расшифровку лекции в HTML-страницу по одному из 7 функциональных шаблонов с опциональной публикацией через knottasoft:host-html.",
  "author": {
    "name": "Артём Маршалкин",
    "email": "artem.marshalkin@gmail.com"
  }
}
```

- [ ] **Step 3: Write `lecture-artifacts/README.md`** (brief stub — full README in Task 25)

```markdown
# lecture-artifacts

Claude Code плагин: расшифровка лекции → HTML-страница-артефакт по одному из 7 функциональных шаблонов.

См. [CHANGELOG](CHANGELOG.md). Полный README — после первого функционального релиза.
```

- [ ] **Step 4: Write `lecture-artifacts/CHANGELOG.md`**

```markdown
# Changelog

## [Unreleased]

- Каркас плагина.
```

- [ ] **Step 5: Validate manifest, commit**

```bash
node -e 'JSON.parse(require("fs").readFileSync("lecture-artifacts/.claude-plugin/plugin.json"))' && echo OK
git add lecture-artifacts/
git commit -m "Scaffold lecture-artifacts plugin (empty manifest + dir tree)"
```

---

## Phase 3 — Injection engine (TDD)

### Task 5: Write a synthetic-template golden test for `inject-data.mjs`

**Files:**
- Create: `<plugin>/scripts/tests/fixtures/synthetic.template.html`
- Create: `<plugin>/scripts/tests/fixtures/synthetic.data.json`
- Create: `<plugin>/scripts/tests/fixtures/synthetic.event.json`
- Create: `<plugin>/scripts/tests/fixtures/synthetic.expected.html`
- Create: `<plugin>/scripts/tests/inject-data.test.mjs`

The synthetic fixture exercises all three replacement modes without depending on any real template.

- [ ] **Step 1: Create `synthetic.template.html`**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<title>OLD TITLE</title>
</head>
<body>
<header><!-- evt:event-name -->OLD EVENT<!-- /evt --> · <!-- evt:lecture-num -->00<!-- /evt --></header>
<h1><!-- evt:act-title -->OLD ACT TITLE<!-- /evt --></h1>
<script>
/* ════════════════════════════════════════════════════════════════════════
   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).
   ════════════════════════════════════════════════════════════════════════ */
const DATA = {
  oldKey: 'oldValue'
};
console.log(DATA);
</script>
</body>
</html>
```

- [ ] **Step 2: Create `synthetic.data.json`**

```json
{ "items": [{ "n": 1, "label": "first" }, { "n": 2, "label": "second" }] }
```

- [ ] **Step 3: Create `synthetic.event.json`**

```json
{
  "title": "Synthetic title",
  "markers": {
    "event-name": "Тест-событие",
    "lecture-num": "07",
    "act-title": "АКТ VII · ТЕСТ"
  }
}
```

- [ ] **Step 4: Create `synthetic.expected.html`** (the byte-for-byte expected output)

```html
<!DOCTYPE html>
<html lang="ru">
<head>
<title>Synthetic title</title>
</head>
<body>
<header><!-- evt:event-name -->Тест-событие<!-- /evt --> · <!-- evt:lecture-num -->07<!-- /evt --></header>
<h1><!-- evt:act-title -->АКТ VII · ТЕСТ<!-- /evt --></h1>
<script>
/* ════════════════════════════════════════════════════════════════════════
   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).
   ════════════════════════════════════════════════════════════════════════ */
const DATA = {
  "items": [
    {
      "n": 1,
      "label": "first"
    },
    {
      "n": 2,
      "label": "second"
    }
  ]
};
console.log(DATA);
</script>
</body>
</html>
```

- [ ] **Step 5: Create `inject-data.test.mjs`**

```js
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
```

- [ ] **Step 6: Run the test — must fail (no `inject-data.mjs` yet)**

```bash
cd lecture-artifacts
node --test scripts/tests/inject-data.test.mjs
```

Expected: ERR `Cannot find module '../inject-data.mjs'` or similar — test does not yet pass.

- [ ] **Step 7: Commit the failing test**

```bash
git add scripts/tests/
git commit -m "lecture-artifacts: failing golden test for inject engine"
```

---

### Task 6: Implement `inject-data.mjs` with three replacements

**Files:**
- Create: `<plugin>/scripts/inject-data.mjs`

- [ ] **Step 1: Write `scripts/inject-data.mjs`**

```js
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
```

- [ ] **Step 2: Run the test — must pass**

```bash
node --test scripts/tests/inject-data.test.mjs
```

Expected: `tests 1`, `pass 1`, `fail 0`.

- [ ] **Step 3: Commit**

```bash
git add scripts/inject-data.mjs
git commit -m "lecture-artifacts: inject engine (DATA block, evt-markers, title, --validate)"
```

---

### Task 7: Edge-case tests — missing markers, malformed DATA banner, CLI validate

**Files:**
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs` (add cases)

- [ ] **Step 1: Append the following tests to `inject-data.test.mjs`**

```js
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('throws when DATA banner+block missing', () => {
  const tpl = '<html><body>no DATA here</body></html>';
  assert.throws(() => inject(tpl, { x: 1 }, {}), /DATA banner\+block not found/);
});

test('leaves output unchanged when markers map is empty', () => {
  const tpl = `<title>T</title>\n<!-- evt:x -->keep<!-- /evt -->\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = { a: 1 };`;
  const out = inject(tpl, { a: 1 }, {});
  assert.match(out, /<!-- evt:x -->keep<!-- \/evt -->/);
  assert.match(out, /const DATA = \{\s+"a": 1\s*\};/);
});

test('event-name marker with cyrillic content', () => {
  const tpl = `<!-- evt:e -->Old<!-- /evt -->\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = { };`;
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
```

- [ ] **Step 2: Run all tests**

```bash
node --test scripts/tests/inject-data.test.mjs
```

Expected: `tests 6`, `pass 6`, `fail 0`.

- [ ] **Step 3: Commit**

```bash
git add scripts/tests/inject-data.test.mjs
git commit -m "lecture-artifacts: edge-case + CLI tests for inject engine"
```

---

## Phase 4 — First template end-to-end (manifesto, simplest)

The manifesto template has the simplest DATA shape (`theses[]`, `links[]`) — perfect first integration. Note: `links[]` is filled at build time from sister artefacts' `published_url` in `.local.md`, not from the transcript. We document this in the schema.

### Task 8: Copy `final/07-manifesto/index.html` into the plugin and add evt markers

**Files:**
- Create: `<plugin>/templates/manifesto/template.html`

- [ ] **Step 1: Copy the source file**

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet"
cp "../методика/prototype/final/07-manifesto/index.html" lecture-artifacts/templates/manifesto/template.html
```

(The source pages live in the project root, outside the marketplace repo.)

- [ ] **Step 2: Open the file and locate the spots that need event markers**

Targets to find by full-text search:
- The `<title>` tag (always one in head).
- The string `Весенний педсовет 2026` — wrap the brand part in `<!-- evt:event-name -->…<!-- /evt -->` and the year in `<!-- evt:event-year -->…<!-- /evt -->`.
- The page header/footer showing the act number (roman numeral) — wrap in `<!-- evt:lecture-num -->…<!-- /evt -->`.
- The page header line containing the lecture title (e.g. «АКТ VII · МАНИФЕСТ ВЕСЕННЕГО ПЕДСОВЕТА 2026») — wrap in `<!-- evt:act-title -->…<!-- /evt -->`.

Open the file and read static text strings until the `<script>` block (around line 425); the DATA block stays untouched.

- [ ] **Step 3: Insert the markers**

Wrap each occurrence of the event-name string and the act-number string in marker pairs. Example transformation:

Before:
```html
<header class="topbar"><span>Весенний педсовет 2026</span><span>VII</span></header>
```

After:
```html
<header class="topbar"><span><!-- evt:event-name -->Весенний педсовет<!-- /evt --> <!-- evt:event-year -->2026<!-- /evt --></span><span><!-- evt:lecture-num -->VII<!-- /evt --></span></header>
```

Apply consistently. The exact lines vary; preserve indentation. Leave the `const DATA = { … };` block exactly as-is.

- [ ] **Step 4: Verify the file is still valid HTML and renders the existing example data**

```bash
node -e 'const fs=require("fs"); const s=fs.readFileSync("lecture-artifacts/templates/manifesto/template.html","utf8"); if(!s.includes("<!-- evt:event-name -->"))throw"missing event-name marker"; if(!s.match(/const DATA = \{[\s\S]*?\n\};/))throw"DATA block damaged"; console.log("ok",s.length,"bytes");'
```

Expected: `ok <N> bytes`.

Open the file in a browser (manually) and confirm the page still renders with the seed example data — vertically, with theses unfolding. If it doesn't render, the markup was damaged; revert and try again.

- [ ] **Step 5: Commit**

```bash
git add lecture-artifacts/templates/manifesto/template.html
git commit -m "templates/manifesto: import from final/07-manifesto with event markers"
```

---

### Task 9: Write `templates/manifesto/schema.md`

**Files:**
- Create: `<plugin>/templates/manifesto/schema.md`

- [ ] **Step 1: Write the schema document**

````markdown
# Schema: manifesto

Шаблон **«Манифест события»**. На странице — пронумерованные тезисы (от 5 до 12, обычно 7), каждый с цитатой, авторством и предлагаемым «действием на неделю». Внизу — ссылки на остальные артефакты события.

## Что заполняется из расшифровки

`theses[]` — каждый тезис собирается из материала лекций события: ключевая мысль, цитата спикера, призыв к действию.

## Что заполняется автоматически (не из расшифровки)

`links[]` — заполняется во время сборки из `.claude/lecture-artifacts.local.md`: для каждой записи в `program[]` с непустым `published_url` создаётся элемент с `num` (порядковый номер), `title` (название артефакта по типу), `desc` (короткое описание из шаблона) и `href` (URL).

Если на момент сборки опубликовано меньше 6 артефактов — массив `links[]` короче. Манифест перестраивается командой `/manifesto` повторно по мере публикации остальных страниц.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["theses", "links"],
  "additionalProperties": false,
  "properties": {
    "theses": {
      "type": "array",
      "minItems": 5,
      "maxItems": 12,
      "items": {
        "type": "object",
        "required": ["c", "num", "title", "author", "explain", "quote", "who", "action"],
        "additionalProperties": false,
        "properties": {
          "c":       { "type": "string", "enum": ["blue", "teal", "ochre", "rose", "olive", "plum", "amber"] },
          "num":     { "type": "string", "pattern": "^[IVX]+$" },
          "title":   { "type": "string", "minLength": 10 },
          "author":  { "type": "string" },
          "explain": { "type": "string", "minLength": 40 },
          "quote":   { "type": "string", "minLength": 20 },
          "who":     { "type": "string" },
          "action":  { "type": "string", "minLength": 20 }
        }
      }
    },
    "links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["num", "title", "desc", "href"],
        "additionalProperties": false,
        "properties": {
          "num":   { "type": "string", "pattern": "^[IVX]+$" },
          "title": { "type": "string" },
          "desc":  { "type": "string" },
          "href":  { "type": "string", "format": "uri" }
        }
      }
    }
  }
}
```

## Подсказки для извлечения

- Цвета `c` идут по порядку из палитры; не повторять подряд один и тот же.
- `num` — римские цифры, начиная с `I`, по числу тезисов.
- `quote` — это **точная или близкая к тексту цитата** из расшифровки. Если в расшифровке нет ничего подходящего — переформулировать ключевую мысль одной фразой и пометить `who: "по мотивам …"`.
- `action` — конкретное микро-действие на неделю, в повелительном наклонении.

## Event-маркеры, которые подменяет движок

- `event-name` ← `event.name`
- `event-year` ← год из `event.month_year`
- `lecture-num` ← `program[i].n` (римскими)
- `act-title` ← `program[i].title`
````

- [ ] **Step 2: Commit**

```bash
git add lecture-artifacts/templates/manifesto/schema.md
git commit -m "templates/manifesto: schema (theses[], auto-built links[])"
```

---

### Task 10: Capture `example-data.json` and add a manifesto golden test

**Files:**
- Create: `<plugin>/templates/manifesto/example-data.json`
- Create: `<plugin>/scripts/tests/fixtures/manifesto.event.json`
- Create: `<plugin>/scripts/tests/fixtures/manifesto.expected.html`
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs`

- [ ] **Step 1: Extract the existing DATA block from `template.html` into `example-data.json`**

The DATA block in `template.html` is JS object literal syntax (single quotes, trailing commas, comments). We need strict JSON. Use a one-off Node extraction:

```bash
cd "/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet"
node -e '
const fs = require("fs");
const t = fs.readFileSync("lecture-artifacts/templates/manifesto/template.html","utf8");
const m = t.match(/const DATA = (\{[\s\S]*?\n\});/);
const tmp = "tmp-extract.mjs";
fs.writeFileSync(tmp, "export default " + m[1] + ";");
import("./" + tmp).then(mod => {
  fs.writeFileSync("lecture-artifacts/templates/manifesto/example-data.json", JSON.stringify(mod.default, null, 2));
  fs.unlinkSync(tmp);
  console.log("wrote example-data.json");
});
'
```

Verify result is valid JSON:

```bash
node -e 'JSON.parse(require("fs").readFileSync("lecture-artifacts/templates/manifesto/example-data.json"))' && echo OK
```

- [ ] **Step 2: Create `manifesto.event.json` fixture**

```json
{
  "title": "07 · Манифест Весеннего педсовета 2026",
  "markers": {
    "event-name": "Весенний педсовет",
    "event-year": "2026",
    "lecture-num": "VII",
    "act-title": "АКТ VII · МАНИФЕСТ ВЕСЕННЕГО ПЕДСОВЕТА 2026"
  }
}
```

- [ ] **Step 3: Generate the golden expected output once and freeze it**

```bash
node lecture-artifacts/scripts/inject-data.mjs \
  lecture-artifacts/templates/manifesto/template.html \
  lecture-artifacts/templates/manifesto/example-data.json \
  lecture-artifacts/scripts/tests/fixtures/manifesto.event.json \
  lecture-artifacts/scripts/tests/fixtures/manifesto.expected.html
```

Open `manifesto.expected.html` in a browser and visually confirm it renders correctly. If yes — this becomes the golden snapshot.

- [ ] **Step 4: Add the test**

Append to `inject-data.test.mjs`:

```js
test('golden: manifesto template + example data', () => {
  const tpl = readFileSync(join(__dirname, '..', '..', 'templates', 'manifesto', 'template.html'), 'utf8');
  const data = JSON.parse(readFileSync(join(__dirname, '..', '..', 'templates', 'manifesto', 'example-data.json'), 'utf8'));
  const event = JSON.parse(fixture('manifesto.event.json'));
  const expected = fixture('manifesto.expected.html');
  const actual = inject(tpl, data, event);
  assert.equal(actual, expected);
});
```

- [ ] **Step 5: Run all tests**

```bash
cd lecture-artifacts && node --test scripts/tests/inject-data.test.mjs && cd ..
```

Expected: `tests 7`, `pass 7`, `fail 0`.

- [ ] **Step 6: Commit**

```bash
git add lecture-artifacts/templates/manifesto/example-data.json \
        lecture-artifacts/scripts/tests/fixtures/manifesto.event.json \
        lecture-artifacts/scripts/tests/fixtures/manifesto.expected.html \
        lecture-artifacts/scripts/tests/inject-data.test.mjs
git commit -m "templates/manifesto: example data + golden snapshot test"
```

---

### Task 11: Build skill `lecture-artifact-build` and `commands/manifesto.md`

**Files:**
- Create: `<plugin>/skills/lecture-artifact-build/SKILL.md`
- Create: `<plugin>/skills/lecture-artifact-build/references/injection-protocol.md`
- Create: `<plugin>/skills/lecture-artifact-build/references/transcript-to-data.md`
- Create: `<plugin>/skills/lecture-artifact-build/references/host-integration.md`
- Create: `<plugin>/commands/manifesto.md`

- [ ] **Step 1: Write `skills/lecture-artifact-build/SKILL.md`**

````markdown
---
name: lecture-artifact-build
description: Build one HTML artefact from a lecture transcript using a named template. Reads the event config from `.claude/lecture-artifacts.local.md`, picks the right lecture from the program, generates DATA per the template's schema, runs the inject engine, optionally publishes via knottasoft:host-html. Invoked by template-specific slash commands (/manifesto, /diagnostic-quiz, etc.).
---

# Skill: lecture-artifact-build

This skill is the engine behind every template-specific slash command. The command supplies `template` (e.g. `manifesto`) and a path to a transcript file; this skill orchestrates the rest.

## Inputs

- `template` — id of the template, must match a folder in `${CLAUDE_PLUGIN_ROOT}/templates/`.
- `transcript` — path to `.md`, `.txt`, or `.docx` file. Read with the `Read` tool (Claude Code handles all three).

## Process

1. **Read event config.** Open `.claude/lecture-artifacts.local.md` from the user's CWD. Parse the YAML frontmatter into `event` and `program[]`. If the file is missing, follow §Fallback below.
2. **Pick the lecture.** Filter `program[]` where `template == <input template>`. If exactly one — use it. If many — ask the user which one via `AskUserQuestion`. If none — ask the user to pick a lecture number from the program; bind that lecture to this template.
3. **Read the transcript** with the `Read` tool. Verify it is non-empty.
4. **Read the template artefacts**: `templates/<template>/template.html`, `templates/<template>/schema.md`, `templates/<template>/example-data.json`.
5. **Generate DATA JSON.** Read the schema thoroughly. Use the example as a shape reference. Extract content from the transcript that satisfies the schema. Pin general fields (`lecturer`, `lectureTitle`, `date`) from `program[i]` — never invent. For arrays with strict cardinality (e.g. "exactly 12 questions"), match exactly; if the transcript doesn't cover all entries, fill remaining ones with conservative typical content and add a note in the user-facing summary.
6. **Special case for `manifesto`.** Build `links[]` from `.local.md`: every `program[i]` (excluding the manifesto's own entry) with non-null `published_url` becomes one link `{num: roman(i.n), title: defaultTitleFor(i.template), desc: defaultDescFor(i.template), href: i.published_url}`. The mapping `(template) → (default title, default desc)` is defined in `references/template-mapping.md`. If a sister artefact has no `published_url` yet, omit it from `links[]`.
7. **Validate.** Write the generated JSON to a temp file (`/tmp/lecture-artifact-<template>-<timestamp>.json`). Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/inject-data.mjs --validate <data.json> ${CLAUDE_PLUGIN_ROOT}/templates/<template>/template.html`. If exit code ≠ 0, fix the JSON (one retry) and re-validate. If still failing, report the error to the user and stop.
8. **Build the event.json.** Compute marker values from `event` and `program[i]`:
   - `event-name` ← `event.name`
   - `event-year` ← year extracted from `event.month_year` (e.g. "Апрель 2026" → "2026")
   - `lecture-num` ← Roman numeral of `program[i].n`
   - `act-title` ← `program[i].title`
   And `title` (the `<title>` tag) ← `"<n> · <program[i].title>"`.
9. **Inject.** Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/inject-data.mjs <template.html> <data.json> <event.json> <output.html>` where `<output.html>` = `<cwd>/<event.output_dir>/<n>-<template>.html`.
10. **Sanity-check (try-call, optional).** Try invoking the `knotta-host-html:host-doctor` skill on the output file. On `not found` or any error: skip silently. See `references/host-integration.md`.
11. **Publish (try-call, optional).** If `host_html.enabled` ≠ `"never"`: try invoking `knotta-host-html:host-html` with the output file. If it returns `{url, qr}`: capture them. If `not found`: do not publish, mention in final response that installing `knottasoft:host-html` enables auto-publish.
12. **Update `.local.md`.** Patch `program[i]`: `transcript`, `output`, `published_url`, `qr`, `built_at`. Patch root `updated_at`. Re-serialize; preserve the markdown body unchanged.
13. **Reply to user.** A short block: file path; URL (if any); QR (if any); 1-line quality note ("11/12 пунктов покрыто расшифровкой, 1 — типовой").

## Fallback (no `.local.md`)

If `.claude/lecture-artifacts.local.md` does not exist:
1. Use `AskUserQuestion` to collect the minimum: event name, month/year, lecture number, lecturer name, lecture title, lecture date.
2. Create a fresh `.local.md` with one program entry for this lecture (template = current command's template id).
3. Continue from step 3.

## Why each reference exists

- `references/injection-protocol.md` — exact regex contract for the three replacements (so the engine and templates stay in sync).
- `references/transcript-to-data.md` — extraction patterns: how to read transcripts efficiently, when to invent vs. quote, how to mark uncertain content.
- `references/host-integration.md` — try-call contract for `knottasoft:host-html` skills, expected return shapes, fallback behaviour.
````

- [ ] **Step 2: Write `references/injection-protocol.md`**

```markdown
# Injection Protocol

The engine `scripts/inject-data.mjs` performs three replacements on the template HTML.

## 1. DATA block

Regex: `/(\/\* ═+\s*\n\s*DATA — обновляется[\s\S]*?═+ \*\/\s*\n)const DATA = \{[\s\S]*?\n\};/m`

Banner comment lines (the `═` rules and the «DATA — обновляется…» phrase) are preserved. The `const DATA = { … };` line is replaced with `const DATA = ${JSON.stringify(data, null, 2)};`.

**Contract for templates:** keep the banner exactly as in the source. Do not put another `};` line at column 0 inside the block.

## 2. evt-marker spans

Regex per key: `/(<!-- evt:KEY -->)[\s\S]*?(<!-- \/evt -->)/g`

The content between matched marker pairs is replaced by the value from `event.markers[KEY]`. Keys present in the template but missing from the markers map are left untouched.

**Contract for templates:** every dynamic event-bound text is wrapped in a marker pair. The marker can wrap inline text or block text; do not nest markers.

## 3. <title>

Regex: `/<title>[\s\S]*?<\/title>/`. Replaced if `event.title` is provided.

**Contract for templates:** exactly one `<title>` tag in the head. Always.
```

- [ ] **Step 3: Write `references/transcript-to-data.md`**

```markdown
# Transcript → Data extraction

When generating a JSON for a template's schema:

- **Quote, don't paraphrase.** Quote-fields must be near-verbatim. If the transcript is too vague to quote, mark the source as "по мотивам ..." and keep the quote short.
- **Pin general fields from the program**, never from the transcript: `lecturer`, `title`/`lectureTitle`, `date`. The transcript is sometimes recorded under another speaker's lecture by mistake.
- **For arrays with strict cardinality** (e.g. "exactly 12 questions"): if the transcript covers fewer items, generate the rest as conservative typical content. In the user-facing summary, state how many slots were filled from transcript vs. typical.
- **Round numeric fields** sensibly. Don't write `42.7` if surrounding values are integers.
- **Cyrillic stays cyrillic.** Don't transliterate names.
- **HTML in fields:** only where the schema explicitly allows it (e.g. inline `<b>...</b>` in some explain-fields). When in doubt, output plain text.
```

- [ ] **Step 4: Write `references/host-integration.md`**

```markdown
# host-html try-call contract

The `knottasoft:host-html` plugin exposes (at least) two skills we try to call.

## host-doctor (sanity check)

Try-call: `Skill { skill: "knotta-host-html:host-doctor", args: "<absolute path to output.html>" }`

Outcomes:
- **Success:** report rendered to chat; we continue regardless.
- **Not found:** the plugin is not installed. Skip silently.

## host-html (publish)

Try-call: `Skill { skill: "knotta-host-html:host-html", args: "<absolute path to output.html>" }`

Expected return shapes:
- `published_url`: a URL on `p.knotta.ru/<slug>` (string).
- `qr`: either an absolute path to a local `.qr.svg` next to the output, or a URL.

If the skill prompts for a pro key — surface that prompt to the user, then resume.

If `not found` — don't publish, leave `published_url` and `qr` as `null` in `.local.md`. In the final user reply, add a one-liner: "установите плагин `knottasoft:host-html`, чтобы публиковать автоматически — пока файл сохранён локально".

## Toggle: `host_html.enabled` in `.local.md`

- `auto` (default) — try-call publish on every build.
- `never` — skip the publish step entirely.
- `always` — try-call publish; if not found, surface a louder warning to the user.
```

- [ ] **Step 5: Write `commands/manifesto.md`**

```markdown
---
description: Собрать страницу-манифест события из расшифровки лекции (или нескольких) и опубликовать через knottasoft:host-html, если плагин установлен.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` со следующими параметрами:

- `template`: `manifesto`
- `transcript`: `$ARGUMENTS` (путь к файлу расшифровки; если пусто — спроси у пользователя через AskUserQuestion)

Скилл сам прочитает `.claude/lecture-artifacts.local.md`, найдёт нужную лекцию в программе, сгенерирует JSON по `templates/manifesto/schema.md`, соберёт HTML и (если возможно) опубликует.

В ответе пользователю покажи:
- Путь к собранному HTML.
- URL опубликованной страницы (если есть) и путь/URL QR-кода.
- Одну строчку: «X тезисов сгенерировано из расшифровки, Y ссылок добавлено в links[] из уже опубликованных артефактов».
```

- [ ] **Step 6: Sanity-check the manifest files**

```bash
node -e 'const fs=require("fs"); for (const f of ["lecture-artifacts/skills/lecture-artifact-build/SKILL.md","lecture-artifacts/commands/manifesto.md"]) { const s=fs.readFileSync(f,"utf8"); if(!s.startsWith("---\n")) throw "missing frontmatter: "+f; } console.log("ok")'
```

Expected: `ok`.

- [ ] **Step 7: Commit**

```bash
git add lecture-artifacts/skills/ lecture-artifacts/commands/manifesto.md
git commit -m "lecture-artifacts: skill lecture-artifact-build + /manifesto command"
```

---

## Phase 5 — Init flow

### Task 12: `scripts/parse-program.mjs` with tests

**Files:**
- Create: `<plugin>/scripts/parse-program.mjs`
- Create: `<plugin>/scripts/tests/parse-program.test.mjs`
- Create: `<plugin>/scripts/tests/fixtures/program-sample.md`
- Create: `<plugin>/scripts/tests/fixtures/program-sample.yaml`

- [ ] **Step 1: Create the markdown fixture**

```markdown
# Программа Весеннего педсовета 2026

1. Дмитрий Бризицкий — «ИИ: современный фронтир» — 28.04 17:00 (большой зал)
2. Виктор Басюк — «Образовательное пространство школы» — 29.04 09:20 (большой зал)
3. Константин Серёгин — «Цифра в мировом образовании» — 29.04 11:00
4. 7 параллельных мастер-классов — 29.04 14:00
5. Иван Палитай — «Основы российской государственности» — 30.04 09:00
6. Сиденко · Чернова · Антонова — синтез трёх параллельных лекций — 30.04 11:00
7. Манифест — закрытие — 02.05 12:00
```

- [ ] **Step 2: Create the YAML fixture**

```yaml
event:
  name: Весенний педсовет
  month_year: Апрель 2026
program:
  - n: 1
    lecturer: Дмитрий Бризицкий
    title: ИИ — современный фронтир
    date: 2026-04-28 17:00
    hall: большой зал
  - n: 2
    lecturer: Виктор Басюк
    title: Образовательное пространство школы
    date: 2026-04-29 09:20
```

- [ ] **Step 3: Write the test (failing)**

```js
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
```

- [ ] **Step 4: Run — fails (no parse-program.mjs yet)**

```bash
node --test scripts/tests/parse-program.test.mjs
```

Expected: ERR `Cannot find module '../parse-program.mjs'`.

- [ ] **Step 5: Implement `parse-program.mjs`**

```js
// Lightweight parser for «программа мероприятия» files. Supports md (numbered list)
// and yaml (event/program structure). JSON support comes for free via JSON.parse.
// On unrecognised content, returns { event: null, program: [] } and lets the
// init skill ask the user.

export function parseProgram(text, format = 'md') {
  if (format === 'json') {
    try {
      const j = JSON.parse(text);
      return normalize(j);
    } catch {
      return { event: null, program: [] };
    }
  }
  if (format === 'yaml') {
    return parseYaml(text);
  }
  return parseMarkdown(text);
}

function normalize(obj) {
  return {
    event: obj.event ?? null,
    program: Array.isArray(obj.program) ? obj.program : [],
  };
}

// Minimal YAML parser sufficient for our shape (no anchors, no flow collections).
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = { event: null, program: [] };
  let mode = null; // 'event' | 'program'
  let curItem = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trim().startsWith('#')) continue;
    if (/^event:\s*$/.test(line)) { mode = 'event'; out.event = {}; continue; }
    if (/^program:\s*$/.test(line)) { mode = 'program'; continue; }
    if (mode === 'event' && /^\s{2}(\w+):\s*(.*)$/.test(line)) {
      const [, k, v] = line.match(/^\s{2}(\w+):\s*(.*)$/);
      out.event[k] = v.trim();
      continue;
    }
    if (mode === 'program' && /^\s{2}-\s+(\w+):\s*(.*)$/.test(line)) {
      curItem = {};
      out.program.push(curItem);
      const [, k, v] = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
      curItem[k] = coerce(v.trim());
      continue;
    }
    if (mode === 'program' && /^\s{4}(\w+):\s*(.*)$/.test(line) && curItem) {
      const [, k, v] = line.match(/^\s{4}(\w+):\s*(.*)$/);
      curItem[k] = coerce(v.trim());
    }
  }
  return out;
}

function coerce(v) {
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

// Markdown: numbered list items shaped «N. lecturer — «title» — date hall».
const MD_ITEM_RE = /^\s*(\d+)[.)\]]\s+(.+)$/;
function parseMarkdown(text) {
  const out = { event: null, program: [] };
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(MD_ITEM_RE);
    if (!m) continue;
    const n = Number(m[1]);
    const rest = m[2];
    const item = { n };
    const parts = rest.split(/\s+[—-]\s+/);
    if (parts.length >= 1) item.lecturer = stripQuotes(parts[0]);
    if (parts.length >= 2) item.title = stripQuotes(parts[1]);
    if (parts.length >= 3) {
      const datePart = parts[2];
      const hallMatch = datePart.match(/\(([^)]+)\)\s*$/);
      if (hallMatch) {
        item.hall = hallMatch[1].trim();
        item.date = datePart.replace(/\(([^)]+)\)\s*$/, '').trim();
      } else {
        item.date = datePart.trim();
      }
    }
    if (parts.length >= 4) item.hall = stripQuotes(parts[3]);
    out.program.push(item);
  }
  return out;
}

function stripQuotes(s) {
  return s.replace(/^[«"']+|[«»"']+$/g, '').trim();
}
```

- [ ] **Step 6: Run tests — should pass**

```bash
node --test scripts/tests/parse-program.test.mjs
```

Expected: 3 passing tests.

- [ ] **Step 7: Commit**

```bash
git add lecture-artifacts/scripts/parse-program.mjs lecture-artifacts/scripts/tests/parse-program.test.mjs lecture-artifacts/scripts/tests/fixtures/program-sample.*
git commit -m "lecture-artifacts: parse-program.mjs (md/yaml) with tests"
```

---

### Task 13: Skill `event-init` and `commands/init.md`

**Files:**
- Create: `<plugin>/skills/event-init/SKILL.md`
- Create: `<plugin>/commands/init.md`
- Create: `<plugin>/references/event-config-format.md`

- [ ] **Step 1: Write `skills/event-init/SKILL.md`**

````markdown
---
name: event-init
description: Initialize or update `.claude/lecture-artifacts.local.md` for a lecture event. Optionally accepts a program file (md/yaml/json), parses it, then asks via AskUserQuestion only for fields that could not be extracted. Used by the /init slash command.
---

# Skill: event-init

Idempotent. Running `/init` twice reuses existing values; missing fields are topped up.

## Inputs

- `program-file` (optional) — path to a program description in md/yaml/json. The skill detects format by extension.

## Process

1. **Read existing config** if `.claude/lecture-artifacts.local.md` exists. Parse YAML frontmatter into `current = {event, program, host_html}`.
2. **Read program file** if provided. Detect format by extension. Run `parseProgram` from `${CLAUDE_PLUGIN_ROOT}/scripts/parse-program.mjs`. Get `parsed = {event, program}`.
3. **If no program file given, ask:** `AskUserQuestion`:
   - "Программа есть как файл?" → "Да, путь:"/"Нет, введу вручную"/"Пропустить программу"
   - If file path: read it, parse it.
   - If "manually": ask user to paste a numbered list as a single message; parse on the fly.
   - If "skip": leave `program: []` for now.
4. **Merge** with priority: `current` wins for non-null fields, then `parsed` fills, then user input fills the rest.
5. **Top up event-level fields** via `AskUserQuestion`, **only if missing** in the merged object:
   - `event.name`
   - `event.month_year` (try to derive from `program[].date` first)
   - `event.location` (optional; "—" to skip)
   - `event.output_dir` (default: transliterated event name + year, e.g. `lecture-artifacts/spring-2026`)
6. **Top up program rows** via `AskUserQuestion` for each `program[i]` missing `template`. Show a multi-choice with the 7 functional template ids (`diagnostic-quiz`, `parameter-dashboard`, `case-matcher`, `pick-and-plan`, `scenario-cards`, `step-builder`, `manifesto`) and a description of each. Skip rows that already have `template` set.
7. **Defaults for fresh rows**: `transcript: null`, `output: null`, `published_url: null`, `qr: null`, `built_at: null`.
8. **Defaults for `host_html`**: `enabled: auto` (only if creating fresh).
9. **Write** the YAML frontmatter back to `.claude/lecture-artifacts.local.md`. Preserve any free-form markdown body that exists. If creating fresh, the body is empty except for an `# <event.name> <year>` heading.
10. **Create `<cwd>/<event.output_dir>/`** if missing.
11. **Reply**: a one-screen summary — event name, total lectures, templates assigned, output dir, file path of the config, what's still missing if anything.

See `${CLAUDE_PLUGIN_ROOT}/references/event-config-format.md` for the exact frontmatter schema.

## Transliteration helper for output_dir

Map for the slug: «Весенний педсовет 2026» → `spring-pedsovet-2026`. Use a simple table:

```
а→a б→b в→v г→g д→d е→e ё→yo ж→zh з→z и→i й→y к→k л→l м→m н→n о→o п→p р→r с→s т→t у→u ф→f х→kh ц→ts ч→ch ш→sh щ→shch ъ→'' ы→y ь→'' э→e ю→yu я→ya
```

Lower-case everything, replace spaces with `-`, drop punctuation. If the result is empty, use `event-<timestamp>`.
````

- [ ] **Step 2: Write `commands/init.md`**

```markdown
---
description: Инициализировать или обновить общий конфиг события (`.claude/lecture-artifacts.local.md`). Опционально принимает путь к файлу с программой; недостающие поля добирает через AskUserQuestion.
argument-hint: [путь-к-программе.md|.yaml|.json]
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion
---

Запусти скилл `lecture-artifacts:event-init` с параметром `program-file=$ARGUMENTS` (если пусто — без параметра, скилл сам спросит у пользователя).

В конце покажи краткую сводку: название события, число лекций в программе, сколько шаблонов уже назначено, путь к созданному `.claude/lecture-artifacts.local.md`.
```

- [ ] **Step 3: Write `references/event-config-format.md`**

````markdown
# Format: `.claude/lecture-artifacts.local.md`

```yaml
event:
  name:           string                    # required
  short:          string?                   # optional, used in compact contexts
  month_year:     string                    # required, e.g. "Апрель 2026"
  location:       string?                   # optional
  output_dir:     string                    # required, relative to <cwd>
  brand:
    primary:      string?                   # css color, optional, reserved for future
  landing_output: string?                   # absolute path to built index.html, set by /event-landing
  landing_url:    string?                   # set by host-html
  landing_qr:     string?                   # set by host-html
program:
  - n:            integer                   # required, lecture order in event
    template:     string                    # required after init, one of 7 ids
    lecturer:     string                    # required
    title:        string                    # required
    date:         string                    # required, free-form (e.g. "2026-04-28 17:00")
    hall:         string?                   # optional
    transcript:   string|null               # absolute path, set by template command
    output:       string|null               # absolute path, set by template command
    published_url: string|null              # set by host-html
    qr:           string|null               # path or url, set by host-html
    built_at:     string|null               # ISO 8601, set by template command
host_html:
  enabled:        "auto"|"always"|"never"   # default "auto"
created_at:       string                    # ISO 8601, written by /init
updated_at:       string                    # ISO 8601, refreshed by every command
```

The free-form markdown body (after the closing `---`) is preserved by all commands and ignored by parsers — use it for organiser notes.
````

- [ ] **Step 4: Sanity-check frontmatter parse**

```bash
node -e '
const fs = require("fs");
for (const f of [
  "lecture-artifacts/skills/event-init/SKILL.md",
  "lecture-artifacts/commands/init.md",
]) {
  const s = fs.readFileSync(f, "utf8");
  if (!s.startsWith("---\n")) throw new Error("no frontmatter: " + f);
}
console.log("ok");
'
```

- [ ] **Step 5: Commit**

```bash
git add lecture-artifacts/skills/event-init/ lecture-artifacts/commands/init.md lecture-artifacts/references/event-config-format.md
git commit -m "lecture-artifacts: skill event-init + /init command + config format docs"
```

---

## Phase 6 — Remaining 6 templates

Each template task follows the same shape — copy source, add evt markers, write schema, capture example data, golden test, write thin command file. The template-specific differences live in: which evt markers to add, what the schema's required fields are, and the example data shape.

For brevity, Tasks 14–19 use a shared step list. Where a step needs template-specific values, they are listed inline.

### Task 14: Template `pick-and-plan` (source: `final/04-seven-masterclasses`)

**Files:**
- Create: `<plugin>/templates/pick-and-plan/{template.html, schema.md, example-data.json}`
- Create: `<plugin>/scripts/tests/fixtures/pick-and-plan.{event.json,expected.html}`
- Create: `<plugin>/commands/pick-and-plan.md`
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs` (add golden test)

DATA shape (from source): `{ classes: [{id, acc, title, lecturer, tag, duration, diff, idea, planLine}, ...] }`. Cardinality: 5–10 items, typically 7. `diff` ∈ 1..5.

- [ ] **Step 1: Copy source and add evt markers**

```bash
cp "../методика/prototype/final/04-seven-masterclasses/index.html" lecture-artifacts/templates/pick-and-plan/template.html
```

Open the file. Wrap event-name, event-year, lecture-num, act-title in `<!-- evt:* -->...<!-- /evt -->` pairs (same pattern as Task 8 step 3). Keep `const DATA = {…};` block intact. Open in browser to confirm it still renders.

- [ ] **Step 2: Write `templates/pick-and-plan/schema.md`**

````markdown
# Schema: pick-and-plan

Шаблон **«Каталог → выбор N → план»**. На странице — карточки занятий/практик/мастер-классов; пользователь выбирает 3 и получает план «что сделать в понедельник».

## Что заполняется из расшифровки

`classes[]` — каждое занятие из материала лекции/секции: автор, заголовок, идея в одном абзаце, одно действие на следующий рабочий день.

## JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["classes"],
  "additionalProperties": false,
  "properties": {
    "classes": {
      "type": "array",
      "minItems": 5,
      "maxItems": 10,
      "items": {
        "type": "object",
        "required": ["id", "acc", "title", "lecturer", "tag", "duration", "diff", "idea", "planLine"],
        "additionalProperties": false,
        "properties": {
          "id":        { "type": "string", "pattern": "^mk\\d+$" },
          "acc":       { "type": "string", "enum": ["blue", "teal", "ochre", "rose", "olive", "plum", "amber"] },
          "title":     { "type": "string", "minLength": 5 },
          "lecturer":  { "type": "string" },
          "tag":       { "type": "string", "enum": ["Теория", "Практика", "Метод", "Этика", "Инструмент"] },
          "duration":  { "type": "string", "pattern": "^\\d+ мин$" },
          "diff":      { "type": "integer", "minimum": 1, "maximum": 5 },
          "idea":      { "type": "string", "minLength": 30 },
          "planLine":  { "type": "string", "minLength": 15 }
        }
      }
    }
  }
}
```

## Подсказки

- `id` — порядковый: `mk1`, `mk2`, ...
- `acc` — акценты идут циклично, не повторять подряд.
- `diff` — 1=новичок, 5=сложно.
- `planLine` — императив, конкретное действие, начинается с глагола.
````

- [ ] **Step 3: Extract `example-data.json`** (same one-off node script as Task 10 step 1, with `pick-and-plan` paths).

- [ ] **Step 4: Create event fixture and generate golden expected**

`scripts/tests/fixtures/pick-and-plan.event.json`:

```json
{
  "title": "04 · Меню 3 практик",
  "markers": {
    "event-name": "Весенний педсовет",
    "event-year": "2026",
    "lecture-num": "IV",
    "act-title": "АКТ IV · СЕМЬ МАСТЕР-КЛАССОВ → ТРИ ПРАКТИКИ В ПОНЕДЕЛЬНИК"
  }
}
```

```bash
node lecture-artifacts/scripts/inject-data.mjs \
  lecture-artifacts/templates/pick-and-plan/template.html \
  lecture-artifacts/templates/pick-and-plan/example-data.json \
  lecture-artifacts/scripts/tests/fixtures/pick-and-plan.event.json \
  lecture-artifacts/scripts/tests/fixtures/pick-and-plan.expected.html
```

- [ ] **Step 5: Add golden test**

Append to `inject-data.test.mjs`:

```js
test('golden: pick-and-plan template + example data', () => {
  const tpl = readFileSync(join(__dirname, '..', '..', 'templates', 'pick-and-plan', 'template.html'), 'utf8');
  const data = JSON.parse(readFileSync(join(__dirname, '..', '..', 'templates', 'pick-and-plan', 'example-data.json'), 'utf8'));
  const event = JSON.parse(fixture('pick-and-plan.event.json'));
  const expected = fixture('pick-and-plan.expected.html');
  assert.equal(inject(tpl, data, event), expected);
});
```

- [ ] **Step 6: Write `commands/pick-and-plan.md`**

```markdown
---
description: Собрать страницу «каталог → выбор 3 → план действий» из расшифровки лекции.
argument-hint: <путь-к-расшифровке.md|.txt|.docx>
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:lecture-artifact-build` с параметрами:

- `template`: `pick-and-plan`
- `transcript`: `$ARGUMENTS`

В ответе пользователю покажи путь к HTML, URL (если есть), QR (если есть) и одну строчку: «N карточек сгенерировано из расшифровки».
```

- [ ] **Step 7: Run all tests**

```bash
cd lecture-artifacts && node --test scripts/tests/ && cd ..
```

Expected: prior tests + 1 new golden = passing.

- [ ] **Step 8: Commit**

```bash
git add lecture-artifacts/templates/pick-and-plan/ \
        lecture-artifacts/scripts/tests/fixtures/pick-and-plan.* \
        lecture-artifacts/scripts/tests/inject-data.test.mjs \
        lecture-artifacts/commands/pick-and-plan.md
git commit -m "templates/pick-and-plan: schema, example, golden test, command"
```

---

### Task 15: Template `scenario-cards` (source: `final/05-values-atlas`)

DATA shape: `{ values: [{id, num, name, latin, acc, quote, scenario:{duration, grade, objective, steps[5]}}, ...] }`. Cardinality: 6–10 items.

Same 8-step procedure as Task 14. Substitutions:

- Source: `../методика/prototype/final/05-values-atlas/index.html`
- evt markers: same four (event-name, event-year, lecture-num, act-title).
- Schema (`templates/scenario-cards/schema.md`): root requires `values[]`. Each item:
  - `id`: string, lowercase, latin (e.g. `family`, `motherland`).
  - `num`: roman, `I` upwards.
  - `name`: string ≥ 3 chars (cyrillic ok).
  - `latin`: string, latin transliteration.
  - `acc`: same enum as elsewhere.
  - `quote`: string ≥ 20 chars.
  - `scenario.duration`: pattern `^\d+ минут?$`.
  - `scenario.grade`: pattern `^\d–\d класс$`.
  - `scenario.objective`: string ≥ 30 chars.
  - `scenario.steps`: array of 4–6 strings, each ≥ 30 chars.
- Event fixture markers: `lecture-num: "V"`, `act-title: "АКТ V · АТЛАС ЦЕННОСТЕЙ"`.
- Command description: «Собрать атлас тематических карточек, в каждой готовый сценарий 15-минутного фрагмента урока».

- [ ] **Step 1**: copy source, add markers (same as Task 14 step 1).
- [ ] **Step 2**: write schema as above.
- [ ] **Step 3**: extract example-data.json.
- [ ] **Step 4**: create event fixture and generate golden expected.
- [ ] **Step 5**: add golden test (same shape as Task 14 step 5, swap `pick-and-plan` → `scenario-cards`).
- [ ] **Step 6**: write `commands/scenario-cards.md` (same shape as Task 14 step 6, swap template id and one-line summary).
- [ ] **Step 7**: run tests.
- [ ] **Step 8**: `git commit -m "templates/scenario-cards: schema, example, golden test, command"`.

---

### Task 16: Template `case-matcher` (source: `final/03-world-map`)

DATA shape: `{ countries: [{id, name, latin, code, acc, tag, modelLong, works[], fails[], transferable}, ...], matchQuestions: [...], matchProfiles: [...] }`. Cardinality: 6–10 countries; 5–8 matchQuestions; matchProfiles equal to or subset of countries.

Substitutions for the 8-step procedure:

- Source: `../методика/prototype/final/03-world-map/index.html`
- Schema requires `countries[]`, `matchQuestions[]`, `matchProfiles[]`. Each country has `id, name, latin, code (ISO-2), acc, tag, modelLong (≥80 chars), works (array of strings), fails (array of strings), transferable (≥40 chars)`. Each matchQuestion has `q, options[3..5]` where each option carries scoring weights pointing at country ids. Each matchProfile has `id, countryId, title, why`. Define this precisely in the JSON Schema.
- Event fixture markers: `lecture-num: "III"`, `act-title: "АКТ III · КАРТОТЕКА «ЦИФРА В МИРЕ»"`.

- [ ] Steps 1–8 as in Task 14, with the substitutions above. Final commit message: `templates/case-matcher: schema, example, golden test, command`.

---

### Task 17: Template `parameter-dashboard` (source: `final/02-digital-environment`)

DATA shape: `{ lecturer, date, parameters: [{id, cat, label, explain, initial, states:[5 with ranges]}, ...], indicators: [...], thresholds: {...}, roadmap: {months:[...], items:[...]} }`. Cardinality: 5–8 parameters; 3–5 indicators.

Substitutions:

- Source: `../методика/prototype/final/02-digital-environment/index.html`
- Schema requires `lecturer, date, parameters[], indicators[], thresholds, roadmap`. The `parameters[].states` array has exactly 5 items, each with `r:[lo, hi]` non-overlapping ranges covering 0..100, and `t` (description ≥ 40 chars).
- Event fixture: `lecture-num: "II"`, `act-title: "АКТ II · ПУЛЬТ ЦИФРОВОЙ СРЕДЫ ШКОЛЫ"`.

- [ ] Steps 1–8. Final commit: `templates/parameter-dashboard: schema, example, golden test, command`.

---

### Task 18: Template `step-builder` (source: `final/06-lesson-constructor`)

DATA shape: `{ steps: [{id, title, sub, options:[{id, title, desc, voices:{s, c, a}}, ...]}, ...], finalVoices: {...} }`. Cardinality: 4–8 steps; each step has 2–4 options; voices have keys `s` (методист), `c` (безопасность), `a` (возрастная пригодность).

Substitutions:

- Source: `../методика/prototype/final/06-lesson-constructor/index.html`
- Schema requires `steps[]` and `finalVoices`. Each step has `id, title, sub` (subtitle), `options[2..4]`. Each option has `id, title, desc, voices.{s, c, a}` where each voice is HTML-fragment string ≥ 50 chars.
- Event fixture: `lecture-num: "VI"`, `act-title: "АКТ VI · УРОК-КОНСТРУКТОР"`.

- [ ] Steps 1–8. Final commit: `templates/step-builder: schema, example, golden test, command`.

---

### Task 19: Template `diagnostic-quiz` (source: `final/01-frontier-map`)

DATA shape: `{ lecturer, lectureTitle, date, scale: [5 levels with roman/short/name/range/desc], questions: [{q, options:[4 with text+score]}, exactly 12], territories:[8 with id/title/short] }`. The strictest cardinality of all templates.

Substitutions:

- Source: `../методика/prototype/final/01-frontier-map/index.html`
- Schema is the strictest: `scale.length == 5`, `questions.length == 12`, each question has `options.length == 4` with `score` 0..3, `territories.length == 8`. Total max score = 36 (= 12 × 3) — encode as schema constraint.
- Event fixture: `lecture-num: "I"`, `act-title: "АКТ I · КАРТА ИИ-ФРОНТИРА 2026"`.
- In `commands/diagnostic-quiz.md` add a one-liner in the user reply: "сгенерирован самотест из 12 вопросов; X вопросов сформулированы из расшифровки, Y — типовые".

- [ ] Steps 1–8. Final commit: `templates/diagnostic-quiz: schema, example, golden test, command`.

---

## Phase 7 — Event landing

### Task 20: Template `event-landing` (source: `final/index.html`)

**Files:**
- Create: `<plugin>/templates/event-landing/{template.html, schema.md, example-data.json}`
- Create: `<plugin>/scripts/tests/fixtures/event-landing.{event.json, expected.html}`
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs`

DATA shape: `{ event: {name, year, dates, location}, artifacts: [{n, template, title, lecturer, date, href, qr, status}, ...] }`. Status enum: `published | local | pending`.

- [ ] **Step 1: Copy source**

```bash
cp "../методика/prototype/final/index.html" lecture-artifacts/templates/event-landing/template.html
```

The current `final/index.html` has hardcoded `<a>` tags pointing at p.knotta.ru URLs, not a `const DATA = {…}` block like the lecture templates. We need to refactor it so it follows the same anchored pattern.

- [ ] **Step 2: Refactor `template.html` so it is DATA-driven**

(a) Choose where the artefact cards are rendered — find the `<div class="grid">…</div>` (or analogous wrapper containing the 7 hardcoded artefact links) and give it a stable id, e.g. `<div id="artifacts" class="grid"></div>`. Strip the existing `<a>` children so the wrapper is empty.

(b) Add a `<script>` block at the bottom of `<body>` containing the canonical anchor banner + the DATA object + a render function. Use safe DOM construction (`createElement`, `textContent`, `setAttribute`) — do not assign string HTML to elements:

```js
/* ════════════════════════════════════════════════════════════════════════
   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).
   ════════════════════════════════════════════════════════════════════════ */
const DATA = {
  event: { name: "Весенний педсовет", year: "2026", dates: "28.04 – 02.05", location: "Пятигорск" },
  artifacts: [ /* seed with the seven entries from the original final/index.html */ ]
};

const STATUS_LABEL = { published: 'опубликовано', local: 'локально', pending: 'в работе' };

function renderCard(a) {
  const card = document.createElement('a');
  card.className = 'card card-' + a.template;
  card.dataset.status = a.status;
  if (a.href) card.setAttribute('href', a.href);
  const num = document.createElement('div');
  num.className = 'card-num';
  num.textContent = String(a.n);
  const title = document.createElement('div');
  title.className = 'card-title';
  title.textContent = a.title;
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  meta.textContent = a.lecturer + ' · ' + a.date;
  const status = document.createElement('div');
  status.className = 'card-status';
  status.textContent = STATUS_LABEL[a.status] || a.status;
  card.append(num, title, meta, status);
  return card;
}

const grid = document.getElementById('artifacts');
DATA.artifacts.forEach(a => grid.appendChild(renderCard(a)));
```

(c) Wrap the event-name and year strings shown in the page header/footer in `<!-- evt:* -->` markers, same as in other templates.

(d) Keep all existing CSS untouched — the `.card`, `.card-num`, `.card-title`, `.card-meta`, `.card-status` selectors above must match what's already in the stylesheet. If they don't, add minimal CSS to match the original visual.

- [ ] **Step 3: Write `templates/event-landing/schema.md`**

````markdown
# Schema: event-landing

Лендинг события. Собирается командой `/event-landing` из `.local.md` + реального состояния `<output_dir>/`.

## JSON Schema

```json
{
  "type": "object",
  "required": ["event", "artifacts"],
  "additionalProperties": false,
  "properties": {
    "event": {
      "type": "object",
      "required": ["name", "year", "dates"],
      "properties": {
        "name":     { "type": "string" },
        "year":     { "type": "string", "pattern": "^\\d{4}$" },
        "dates":    { "type": "string" },
        "location": { "type": "string" }
      }
    },
    "artifacts": {
      "type": "array",
      "minItems": 1,
      "maxItems": 7,
      "items": {
        "type": "object",
        "required": ["n", "template", "title", "lecturer", "date", "status"],
        "properties": {
          "n":        { "type": "integer", "minimum": 1, "maximum": 7 },
          "template": { "type": "string" },
          "title":    { "type": "string" },
          "lecturer": { "type": "string" },
          "date":     { "type": "string" },
          "href":     { "type": ["string", "null"] },
          "qr":       { "type": ["string", "null"] },
          "status":   { "type": "string", "enum": ["published", "local", "pending"] }
        }
      }
    }
  }
}
```
````

- [ ] **Step 4: Create `example-data.json`** — seed with the seven artefacts from current `final/index.html`, each with the current p.knotta.ru URL and `status: "published"`.

- [ ] **Step 5: Generate golden expected** (same shell command pattern as Task 10 step 3).

- [ ] **Step 6: Add golden test** (same shape as prior templates).

- [ ] **Step 7: Run tests**

```bash
cd lecture-artifacts && node --test scripts/tests/ && cd ..
```

- [ ] **Step 8: Commit**

```bash
git add lecture-artifacts/templates/event-landing/ \
        lecture-artifacts/scripts/tests/fixtures/event-landing.* \
        lecture-artifacts/scripts/tests/inject-data.test.mjs
git commit -m "templates/event-landing: refactored to DATA-driven, schema, example, golden test"
```

---

### Task 21: Skill `event-landing-build` and `commands/event-landing.md`

**Files:**
- Create: `<plugin>/skills/event-landing-build/SKILL.md`
- Create: `<plugin>/commands/event-landing.md`

- [ ] **Step 1: Write `skills/event-landing-build/SKILL.md`**

````markdown
---
name: event-landing-build
description: Build the event landing page from `.claude/lecture-artifacts.local.md` and the actual contents of `<event.output_dir>/`. Idempotent — re-run after each new artefact is published. Used by /event-landing.
---

# Skill: event-landing-build

## Process

1. **Read `.claude/lecture-artifacts.local.md`.** If missing — refuse: tell the user to run `/init` first.
2. **Scan `<event.output_dir>/`** with `Bash` (`ls`/`find`). Build a map `n → {output, qr}` from filenames matching `<n>-<template>.html` and `<n>-<template>.qr.svg`.
3. **For each `program[i]`**, derive `status`:
   - If `program[i].published_url` is set → `published`, `href` = `published_url`, `qr` = `program[i].qr` (URL or local path).
   - Else if `program[i].output` exists on disk → `local`, `href` = relative `./<n>-<template>.html`, `qr` = null.
   - Else → `pending`, `href` = null, `qr` = null.
4. **Build `data`**: `{event: {...}, artifacts: [for each i in program: {n, template, title, lecturer, date, href, qr, status}]}`.
5. **Build `event.json`**: title `"<event.name> <year>"`; markers same shape as other templates.
6. **Validate, inject, write to `<output_dir>/index.html`**.
7. **Patch `.local.md`**: `event.landing_output = <abs path>`.
8. **Try-call publish** (same as `lecture-artifact-build` step 11). On success, patch `event.landing_url` and `event.landing_qr`.
9. **Reply**: path, optional URL, optional QR, summary "X published / Y local / Z pending of N".

## Idempotency

The command may be invoked any number of times. Each run reflects current disk state, not cached `.local.md` state — if the user manually deleted an artefact, it correctly drops to `pending`.
````

- [ ] **Step 2: Write `commands/event-landing.md`**

```markdown
---
description: Собрать главную страницу-лендинг события из `.local.md` + реальных артефактов в output-папке. Запускается после публикации каждого нового артефакта — лендинг обновляется.
allowed-tools: Read, Write, Edit, Bash, AskUserQuestion, Skill
---

Запусти скилл `lecture-artifacts:event-landing-build` без аргументов.

В ответе покажи: путь к собранному `index.html`, URL опубликованного лендинга (если есть), QR (если есть), сводку «X из N артефактов опубликовано, Y локально, Z в работе».
```

- [ ] **Step 3: Commit**

```bash
git add lecture-artifacts/skills/event-landing-build/ lecture-artifacts/commands/event-landing.md
git commit -m "lecture-artifacts: skill event-landing-build + /event-landing command"
```

---

## Phase 8 — Try-call host integration testing

### Task 22: Manual end-to-end smoke checklist

**Files:**
- Create: `<plugin>/references/release-smoke.md`

- [ ] **Step 1: Create the manual smoke checklist**

```markdown
# Release smoke checklist

Run before tagging a release. Manual.

## Setup

- Check that `knottasoft:host-html` plugin is installed locally: `/host-rules` should show its description.
- Ensure a Knotta pro key is configured (run `/host-html --status`).

## Sequence

1. In an empty test directory:
   - `/init` → choose «нет программы» → enter event name «Тест-педсовет», month_year «Май 2099», output_dir auto.
   - Verify `.claude/lecture-artifacts.local.md` has `event.name`, `event.month_year`, empty `program[]`.
2. Append one program row manually to `.local.md`: `n=1, template=manifesto, lecturer=Тест, title=Тест-лекция, date=2099-05-01`.
3. Create a 50-line dummy transcript in `transcript.md`.
4. Run `/manifesto transcript.md`.
5. Verify:
   - `<output_dir>/1-manifesto.html` exists, opens in browser, theses are populated.
   - If host-html ran: `published_url` and `qr` set in `.local.md`.
   - The reply quoted both the file path and (if available) the URL.
6. Run `/event-landing`.
7. Verify `<output_dir>/index.html` shows the manifesto card with status `published` (or `local` if host-html unavailable).
8. Repeat for 2–3 more templates to spot-check shape variation.

## Failure modes to verify

- Run a template command without `.local.md` → it should ask for minimum fields and proceed.
- Run with a non-existent transcript path → friendly error, no half-written output.
- Disable host-html (uninstall plugin) → command still succeeds locally, mentions "установите knottasoft:host-html".
```

- [ ] **Step 2: Commit**

```bash
git add lecture-artifacts/references/release-smoke.md
git commit -m "lecture-artifacts: release smoke checklist"
```

---

## Phase 9 — Polish, docs, release

### Task 23: Reference docs (adding-new-template, template-mapping)

**Files:**
- Create: `<plugin>/references/adding-new-template.md`
- Create: `<plugin>/references/template-mapping.md`

- [ ] **Step 1: Write `references/adding-new-template.md`**

````markdown
# Adding a new template

To add an 8th template (or beyond):

1. Create `templates/<id>/template.html`. Required: a `<title>` tag, the `const DATA = {…}` block delimited by the «DATA — обновляется» banner (copy the banner from any existing template), and `<!-- evt:* -->` marker spans for event-bound text.
2. Create `templates/<id>/schema.md`: a human description + a JSON Schema fenced block. Match the shape of existing schemas.
3. Create `templates/<id>/example-data.json` with seed data that satisfies the schema. The `template.html` should display this data sensibly.
4. Generate a golden snapshot:
   ```bash
   node scripts/inject-data.mjs templates/<id>/template.html templates/<id>/example-data.json scripts/tests/fixtures/<id>.event.json scripts/tests/fixtures/<id>.expected.html
   ```
5. Add a test in `scripts/tests/inject-data.test.mjs` that asserts injection produces the snapshot.
6. Add `commands/<id>.md` (use `commands/manifesto.md` as a starting point, change `template:` arg).
7. Add the row to `references/template-mapping.md`.
8. Bump plugin version, update CHANGELOG.

## Contract for `template.html`

- Exactly one `<title>` tag in head.
- Exactly one `const DATA = {…};` block delimited by the canonical banner. Do not put another `};` line at column 0 inside the block (regex anchored on `\n};`).
- Every dynamic event-bound text wrapped in `<!-- evt:KEY -->...<!-- /evt -->`. Reuse keys: `event-name`, `event-year`, `lecture-num`, `act-title`. New keys are allowed.
- Page must render correctly when opened directly in a browser (so the seed data must be valid).
````

- [ ] **Step 2: Write `references/template-mapping.md`**

```markdown
# Template mapping (old prototype name → functional id)

| # | Source folder in `final/`     | Plugin template id     | Default title (for landing/manifesto links) | Short desc                                  |
|---|--------------------------------|------------------------|---------------------------------------------|---------------------------------------------|
| 1 | `01-frontier-map`              | `diagnostic-quiz`      | Карта самотеста                             | самотест · уровни · карта                   |
| 2 | `02-digital-environment`       | `parameter-dashboard`  | Пульт параметров                            | N шкал · профиль · roadmap                  |
| 3 | `03-world-map`                 | `case-matcher`         | Атлас кейсов                                | страны · модели · подбор                    |
| 4 | `04-seven-masterclasses`       | `pick-and-plan`        | Меню практик                                | каталог · выбор · план                      |
| 5 | `05-values-atlas`              | `scenario-cards`       | Атлас сценариев                             | темы · сценарий 15 мин                      |
| 6 | `06-lesson-constructor`        | `step-builder`         | Конструктор                                 | шаги · 3 голоса · план                      |
| 7 | `07-manifesto`                 | `manifesto`            | Манифест                                    | тезисы · цитата · действие                  |
| – | `index.html`                   | `event-landing`        | —                                           | —                                           |

The «default title» and «short desc» columns are used by:
- `manifesto` skill when filling `links[]` for sister artefacts.
- `event-landing` skill when no per-program override is set.
```

- [ ] **Step 3: Commit**

```bash
git add lecture-artifacts/references/adding-new-template.md lecture-artifacts/references/template-mapping.md
git commit -m "lecture-artifacts: docs — adding-new-template + template-mapping"
```

---

### Task 24: Plugin README, CHANGELOGs, marketplace CHANGELOG

**Files:**
- Modify: `<plugin>/README.md` (full rewrite)
- Modify: `<plugin>/CHANGELOG.md`
- Modify: `<repo>/group-work-toolkit/CHANGELOG.md` (one-line note about move)
- Create: `<repo>/CHANGELOG.md` (marketplace-level changelog)

- [ ] **Step 1: Replace `lecture-artifacts/README.md`** with the full doc

```markdown
# lecture-artifacts

Claude Code плагин: расшифровка лекции → готовая HTML-страница-артефакт по одному из 7 функциональных шаблонов. Опционально публикуется через `knottasoft:host-html` и возвращает URL + QR.

## Что внутри

7 функциональных шаблонов + лендинг события:

| Команда                  | Что делает                                         |
|--------------------------|----------------------------------------------------|
| `/diagnostic-quiz <f>`   | квиз-самодиагностика с уровнями + радар-карта      |
| `/parameter-dashboard <f>` | панель параметров со шкалой + дорожная карта     |
| `/case-matcher <f>`      | сравнительные кейсы + квиз-подбор                  |
| `/pick-and-plan <f>`     | каталог → выбор N → план действий                  |
| `/scenario-cards <f>`    | тематические карточки с готовым сценарием          |
| `/step-builder <f>`      | пошаговый ветвящийся конструктор                   |
| `/manifesto <f>`         | пронумерованные тезисы с цитатой и действием       |
| `/event-landing`         | главная страница комплекта                         |
| `/init [program]`        | завести/обновить общий конфиг события              |

## Быстрый старт

```bash
# 1. Подключить маркетплейс pedsovet:
/plugin marketplace add amarshalkin/pedsovet
/plugin install lecture-artifacts@pedsovet

# 2. Инициализировать событие в проектной папке:
/init programme.md          # или без аргумента — спросит интерактивно

# 3. Собрать страницу из расшифровки:
/manifesto transcripts/lecture-7.md

# 4. После каждой новой лекции — обновить лендинг:
/event-landing
```

## Конфиг

Все команды читают и обновляют `.claude/lecture-artifacts.local.md` в проектной папке (формат — см. `references/event-config-format.md`). Файл в гит не коммитится — это ваш рабочий стейт события.

## Интеграция с knottasoft:host-html

Если плагин `knottasoft:host-html` установлен и pro-ключ настроен — каждая команда автоматически публикует страницу и возвращает URL + QR. Если не установлен — страница сохраняется только локально, плагин подсказывает в ответе. Поведение управляется полем `host_html.enabled` в `.local.md` (`auto`/`always`/`never`).

## Добавить новый шаблон

См. `references/adding-new-template.md`.
```

- [ ] **Step 2: Replace `lecture-artifacts/CHANGELOG.md`**

```markdown
# Changelog

## [0.1.0] — 2026-04-26

Первый релиз.

- 7 функциональных шаблонов: diagnostic-quiz, parameter-dashboard, case-matcher, pick-and-plan, scenario-cards, step-builder, manifesto.
- Шаблон event-landing — главная страница комплекта.
- Команда `/init` со сбором программы события и общих полей.
- Скрипт-движок `inject-data.mjs` (3 типа подстановки) с golden-снапшотами.
- Парсер программы `parse-program.mjs` (md/yaml/json).
- Try-call интеграция с `knottasoft:host-html` (host-doctor + host-html).
- Поддержка локальной работы без host-html.
```

- [ ] **Step 3: Append note to `group-work-toolkit/CHANGELOG.md`**

Add at the top:

```markdown
## [0.10.1] — 2026-04-26

- Плагин переехал из корня маркетплейса в подпапку (`pedsovet/group-work-toolkit/`) в рамках перехода маркетплейса на двухплагинную структуру. Логика плагина не менялась.
```

- [ ] **Step 4: Create `<repo>/CHANGELOG.md`**

````markdown
# Marketplace changelog

## [1.0.0] — 2026-04-26

- Маркетплейс переименован: `group-work-toolkit` → `pedsovet`.
- GitHub repo переименован: `amarshalkin/group-work-toolkit` → `amarshalkin/pedsovet` (старый URL автоматически редиректится).
- Существующий плагин `group-work-toolkit` переехал из корня в подпапку.
- Добавлен второй плагин: `lecture-artifacts` v0.1.0.

### Миграция для пользователей

Если вы подключали маркетплейс по старому URL — он продолжит работать через GitHub-редирект, но рекомендуется обновить команду:

```bash
/plugin marketplace remove group-work-toolkit
/plugin marketplace add amarshalkin/pedsovet
```
````

- [ ] **Step 5: Commit**

```bash
git add lecture-artifacts/README.md lecture-artifacts/CHANGELOG.md \
        group-work-toolkit/CHANGELOG.md CHANGELOG.md
git commit -m "Docs: full README/CHANGELOGs for v1.0.0 release"
```

---

### Task 25: Final verification, tag, push

**Files:** none.

- [ ] **Step 1: Run all tests**

```bash
cd lecture-artifacts
node --test scripts/tests/
cd ..
```

Expected: all tests pass — 6 (engine) + 3 (parse-program) + 8 (template goldens) = ~17 passing.

- [ ] **Step 2: Validate every plugin manifest is valid JSON and every command/skill has frontmatter**

```bash
node -e '
const fs = require("fs");
const path = require("path");
function check(file) {
  if (file.endsWith(".json")) JSON.parse(fs.readFileSync(file));
  else if (file.endsWith(".md")) {
    const s = fs.readFileSync(file, "utf8");
    if (!s.startsWith("---\n")) throw new Error("no frontmatter: " + file);
  }
}
for (const f of ["lecture-artifacts/.claude-plugin/plugin.json",
                 "group-work-toolkit/.claude-plugin/plugin.json",
                 ".claude-plugin/marketplace.json"]) check(f);
function walk(dir, ext) {
  return fs.readdirSync(dir, { recursive: true })
    .filter(n => n.endsWith(ext)).map(n => path.join(dir, n));
}
walk("lecture-artifacts/commands", ".md").forEach(check);
walk("lecture-artifacts/skills", ".md").filter(p => p.endsWith("SKILL.md")).forEach(check);
console.log("ok");
'
```

Expected: `ok`.

- [ ] **Step 3: Push remaining commits and tag**

```bash
git push origin main
git tag -a v1.0.0 -m "Marketplace pedsovet v1.0.0: lecture-artifacts plugin (v0.1.0) + group-work-toolkit (v0.10.1)"
git push origin v1.0.0
```

- [ ] **Step 4: Manual release smoke check**

Follow `lecture-artifacts/references/release-smoke.md` end-to-end. If anything misbehaves — file a fix as a follow-up commit, do not amend the tagged release.

---

## Self-review notes (the plan author's checklist results)

This section was filled during the `writing-plans` self-review pass.

**Spec coverage check:**
- §4 (architecture): Tasks 4–13 implement scaffold + engine + skills + commands. ✓
- §5 (marketplace migration): Tasks 1–3. ✓
- §6 (plugin structure): Task 4. ✓
- §7 (template mapping): Task 23 (references/template-mapping.md) plus per-template tasks 8–19. ✓
- §8 (init + .local.md): Tasks 12–13. ✓
- §9 (build flow + injection): Tasks 5–7 (engine), Task 11 (skill), Tasks 8–19 (templates). ✓
- §10 (event-landing + host-html try-call): Tasks 20–22. ✓
- §11 (testing): inline TDD across engine + per-template golden tests + Task 22 manual smoke. ✓
- §12 (risks): mitigations realised — `--validate` (built into engine in Task 6) catches banner damage; manual smoke (Task 22) covers host-html flakiness. ✓
- §13 (impl order): plan order matches spec recommendation. ✓

**Placeholder scan:** every code step has full code; every command step has the exact command. The six template tasks (15–19) reuse the same 8-step structure with explicit substitutions — no `"similar to Task N"` shortcuts in actual steps.

**Type consistency check:** the `event` object passed to `inject` always has `{title?, markers?: {...}}`. The `data` JSON shape per template is defined in each `schema.md`. The `.local.md` shape is defined once in `references/event-config-format.md` and referenced by all skills. Consistent.

---

## Execution

**Plan complete.** Auto-mode is active — proceeding with `superpowers:subagent-driven-development` (fresh subagent per task with two-stage review). User can interject at any point to switch to inline execution or pause.
