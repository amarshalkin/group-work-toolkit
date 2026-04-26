# Conditional Rendering (lecture-artifacts v0.3.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `evt-if:KEY` directive to the inject engine and use it across all 8 templates so hardcoded blocks (lecture date/time, manifesto signature rows, landing hero-stats, timeline, top counter) become conditional on event/program data; remove duplicate `evt:lecture-title` eyebrow on per-artifact pages; refactor landing timeline to DATA-driven render.

**Architecture:** Engine extension is a pure function `applyConditionals(html, markers)` that runs before existing replacement passes. Templates wrap conditional blocks with `<!-- evt-if:KEY -->...<!-- /evt-if -->` markers. Orchestrator skills (`lecture-artifact-build`, `event-landing-build`) pass markers only when the underlying field is non-empty in `.local.md`; missing → block disappears at build time. Landing timeline becomes a DATA-driven JS render using safe DOM API.

**Tech Stack:** Same as v0.2.0 — Node ≥ 18 ESM, no npm deps, `node --test`. No runtime additions.

**Reference spec:** `docs/superpowers/specs/2026-04-26-conditional-rendering-design.md` (in this same repo).

**Path conventions:**
- `<repo>` = `/Users/marshalkin/Documents/Knotta/ПРОЕКТЫ/Центр Знание/педсовет-весна-2026/pedsovet`
- `<plugin>` = `<repo>/lecture-artifacts`

**Single-commit constraint:** the user requested ONE commit at the end (Task 10). Tasks 1–9 leave the working tree dirty. Run `node --test` after each significant change to catch regressions before continuing — but DO NOT commit until Task 10.

---

## File Structure (target end state)

```
lecture-artifacts/
├── .claude-plugin/plugin.json                                      ← version 0.2.0 → 0.3.0
├── CHANGELOG.md                                                    ← prepend [0.3.0]
├── scripts/
│   ├── inject-data.mjs                                             ← +applyConditionals export, +CLI usage
│   └── tests/
│       ├── inject-data.test.mjs                                    ← +3 evt-if tests, +manifesto rich-fixture test
│       └── fixtures/
│           ├── manifesto.event-rich.json                           ← NEW
│           └── manifesto.expected-rich.html                        ← NEW
├── templates/
│   ├── diagnostic-quiz/template.html                               ← remove eyebrow, wrap hero-meta
│   ├── parameter-dashboard/template.html                           ← remove eyebrow, wrap hero-meta
│   ├── case-matcher/template.html                                  ← remove eyebrow
│   ├── pick-and-plan/template.html                                 ← remove eyebrow
│   ├── scenario-cards/template.html                                ← remove eyebrow, wrap hero-meta
│   ├── step-builder/template.html                                  ← (no change — no eyebrow, no hero-meta)
│   ├── manifesto/template.html                                     ← wrap hero-meta rows + signature rows; tweak lecture-title in hero-eye
│   └── event-landing/template.html                                 ← wrap topbar counter, hero-stats, section-eye+timeline; remove art-sub; conditional date in card render
├── scripts/tests/fixtures/{manifesto,diagnostic-quiz,...}.expected.html  ← regenerate 8 goldens
├── skills/
│   ├── lecture-artifact-build/SKILL.md                             ← step 8 markers list updated
│   ├── event-landing-build/SKILL.md                                ← step 4 (DATA.timeline build) + step 5 (markers)
│   └── event-init/SKILL.md                                         ← step 5 + new fields
└── references/event-config-format.md                               ← +duration, +timeline_extras, +program[].slot, +program[].when

<repo>/.claude-plugin/marketplace.json                              ← metadata.version 1.1.0 → 1.2.0; lecture-artifacts entry 0.2.0 → 0.3.0
<repo>/CHANGELOG.md                                                 ← prepend [1.2.0]
```

**File-responsibility cheatsheet:**
- `applyConditionals` — pure function, idempotent. Replaces `<!-- evt-if:KEY -->...<!-- /evt-if -->` blocks: empty/null/undefined value → block removed; non-empty value → outer markers stripped, inner content kept (inner `evt:KEY` markers handled by `replaceEvtMarkers` later).
- Each template's `evt-if:KEY` marker pairs follow ONE rule: outer `evt-if:KEY` controls visibility; inside, a regular `evt:KEY` (same KEY, no `-if`) does the actual content swap. The two markers are paired by convention — engine treats them independently.
- `event-landing-build` becomes the only skill that constructs `DATA.timeline` from `program[]` + parses dates. Handles parsing failures by treating row as "unknown day".

---

## Task 1: Extend `inject-data.mjs` with `applyConditionals` + tests (TDD)

**Files:**
- Modify: `<plugin>/scripts/inject-data.mjs`
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs` (append tests)

The function must run BEFORE `replaceEvtMarkers` so that surviving `evt:KEY` markers inside surviving `evt-if` blocks get processed by the existing pass.

- [ ] **Step 1: Append 3 failing tests to `inject-data.test.mjs`**

Read the existing file to find the location of the last test, then append at the end:

```js

// === evt-if directive (v0.3.0) ===

test('evt-if: block removed when marker missing or empty', () => {
  const tpl = `prefix <!-- evt-if:k -->KEEP <!-- evt:k -->old<!-- /evt --> END<!-- /evt-if --> suffix`;
  // marker missing
  let out = inject('<title>t</title>\n' +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};\n` + tpl, {}, {});
  assert.match(out, /prefix\s+suffix/);
  assert.doesNotMatch(out, /KEEP/);

  // marker empty string
  out = inject('<title>t</title>\n' +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};\n` + tpl, {}, { markers: { k: '' } });
  assert.doesNotMatch(out, /KEEP/);

  // marker null
  out = inject('<title>t</title>\n' +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};\n` + tpl, {}, { markers: { k: null } });
  assert.doesNotMatch(out, /KEEP/);
});

test('evt-if: block kept when marker present, evt-if delimiters stripped', () => {
  const tpl = `<!-- evt-if:k -->KEEP_THIS<!-- /evt-if -->`;
  const out = inject(`<title>t</title>\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};\n` + tpl, {}, { markers: { k: 'value' } });
  assert.match(out, /KEEP_THIS/);
  assert.doesNotMatch(out, /<!-- evt-if:/);
  assert.doesNotMatch(out, /<!-- \/evt-if/);
});

test('evt-if: nested evt:KEY inside surviving block gets replaced', () => {
  const tpl = `<!-- evt-if:k --><span><!-- evt:k -->old<!-- /evt --></span><!-- /evt-if -->`;
  const out = inject(`<title>t</title>\n` +
    `/* ════════\n   DATA — обновляется после расшифровки лекции (ТОЛЬКО этот объект).\n   ════════ */\n` +
    `const DATA = {\n};\n` + tpl, {}, { markers: { k: 'NEW' } });
  assert.match(out, /<span><!-- evt:k -->NEW<!-- \/evt --><\/span>/);
});
```

- [ ] **Step 2: Run tests — must fail (function doesn't exist yet)**

```bash
cd "<plugin>"
node --test scripts/tests/inject-data.test.mjs 2>&1 | tail -20
```

Expected: 3 failures with errors like "expected … not to match /KEEP/" or "Cannot read properties" — exact wording varies but at least 3 of the new tests should fail.

- [ ] **Step 3: Add `applyConditionals` to `inject-data.mjs`**

Read the file. Find the location after `replaceTitle` definition (or any other top-level function). Insert this new function:

```js
const EVT_IF_RE = /<!-- evt-if:([a-z-]+) -->[\s\S]*?<!-- \/evt-if -->/g;

export function applyConditionals(html, markers = {}) {
  return html.replace(EVT_IF_RE, (block, key) => {
    const val = markers && markers[key];
    if (val == null || val === '') return '';
    return block.replace(/<!-- evt-if:[a-z-]+ -->|<!-- \/evt-if -->/g, '');
  });
}
```

- [ ] **Step 4: Update the `inject` function to call `applyConditionals` first**

Find:
```js
export function inject(template, data, event = {}) {
  let out = template;
  out = replaceTitle(out, event.title);
  out = replaceEvtMarkers(out, event.markers);
  out = replaceDataBlock(out, data);
  return out;
}
```

Replace with:
```js
export function inject(template, data, event = {}) {
  let out = template;
  out = applyConditionals(out, event.markers);
  out = replaceTitle(out, event.title);
  out = replaceEvtMarkers(out, event.markers);
  out = replaceDataBlock(out, data);
  return out;
}
```

- [ ] **Step 5: Run all tests — should pass**

```bash
node --test scripts/tests/*.mjs 2>&1 | tail -10
```

Expected: 17 + 3 = 20 passing tests (existing 17 still pass; 3 new evt-if tests pass).

NOTE: Existing 8 golden tests will FAIL after Task 3 because templates change. We regenerate goldens in Task 7. Until then, the engine tests (synthetic + edge-case + 3 new evt-if) confirm the engine works correctly.

---

## Task 2: Remove `evt:lecture-title` eyebrow from per-artifact templates

**Files:**
- Modify: `<plugin>/templates/diagnostic-quiz/template.html`
- Modify: `<plugin>/templates/parameter-dashboard/template.html`
- Modify: `<plugin>/templates/case-matcher/template.html`
- Modify: `<plugin>/templates/pick-and-plan/template.html`
- Modify: `<plugin>/templates/scenario-cards/template.html`
- Modify: `<plugin>/templates/step-builder/template.html` (verify only — likely no eyebrow)
- Modify: `<plugin>/templates/manifesto/template.html` (preserve, but mark lecture-title as conditional)

After v0.2.0, per-artifact templates have an eyebrow (`<div class="hero-eye">` or `<div class="intro-eyebrow">`) wrapping `<!-- evt:lecture-title -->...<!-- /evt -->`. The user said: «описание над заголовком лекции нужно убрать» because it duplicates the lecturer line.

- [ ] **Step 1: diagnostic-quiz** — remove the entire `<div class="intro-eyebrow">` line

Use Read on `lecture-artifacts/templates/diagnostic-quiz/template.html` to confirm current state. Locate (line ~522):

```html
<div class="intro-eyebrow"><b><!-- evt:lecture-title -->Карта ИИ-фронтира 2026<!-- /evt --></b></div>
```

Use Edit to delete this entire line (including the trailing newline that becomes redundant).

- [ ] **Step 2: parameter-dashboard** — remove `<div class="hero-eye">`

Locate (line ~355):

```html
<div class="hero-eye"><!-- evt:lecture-title -->К лекции Виктора Басюка<!-- /evt --></div>
```

Delete entire line.

- [ ] **Step 3: case-matcher** — remove `<div class="hero-eye">`

Locate (line ~401):

```html
        <div class="hero-eye"><!-- evt:lecture-title -->К лекции Константина Серёгина<!-- /evt --></div>
```

Delete entire line, preserving surrounding indentation.

- [ ] **Step 4: pick-and-plan** — remove `<div class="hero-eye">`

Locate (line ~369):

```html
  <div class="hero-eye"><!-- evt:lecture-title -->7 параллельных мастер-классов<!-- /evt --></div>
```

Delete entire line.

- [ ] **Step 5: scenario-cards** — remove `<div class="hero-eye">`

Locate (line ~420):

```html
    <div class="hero-eye"><!-- evt:lecture-title -->К лекции Ивана Палитая<!-- /evt --></div>
```

Delete entire line.

- [ ] **Step 6: step-builder** — verify no eyebrow

Use Read to scan `lecture-artifacts/templates/step-builder/template.html` for `evt:lecture-title`. There should be ZERO occurrences. If any exist (unlikely from v0.2.0 audit), delete that line. If none, no change.

- [ ] **Step 7: manifesto** — wrap `evt:lecture-title` in `evt-if:lecture-title`

The manifesto's hero-eye is composite: `<!-- evt:event-name --> · <!-- evt:lecture-title -->итог<!-- /evt -->`. We do NOT delete the entire eyebrow because event-name is still useful. Instead, wrap the lecture-title segment (and the leading " · " separator) in `evt-if:lecture-title`.

Locate (line ~386):

```html
  <div class="hero-eye"><!-- evt:event-name -->Весенний педсовет<!-- /evt --> <!-- evt:event-year -->2026<!-- /evt --> · <!-- evt:lecture-title -->итог<!-- /evt --></div>
```

Replace with:

```html
  <div class="hero-eye"><!-- evt:event-name -->Весенний педсовет<!-- /evt --> <!-- evt:event-year -->2026<!-- /evt --><!-- evt-if:lecture-title --> · <!-- evt:lecture-title -->итог<!-- /evt --><!-- /evt-if --></div>
```

(The leading `<!-- evt-if:lecture-title -->` opens right after `</evt -->` of event-year and includes the leading ` · ` separator.)

- [ ] **Step 8: Sanity grep** — no remaining `<div class="hero-eye">.*evt:lecture-title` or `<div class="intro-eyebrow">.*evt:lecture-title` patterns in any template

```bash
cd "<repo>"
grep -nE 'class="(hero-eye|intro-eyebrow)"[^<]*<!-- evt:lecture-title' lecture-artifacts/templates/*/template.html | head -5
```

Expected: blank output (no matches). Manifesto's `evt:lecture-title` is now inside an `evt-if`, not directly in a hero-eye class wrapper.

---

## Task 3: Wrap conditional `hero-meta` blocks with `evt-if:lecture-when`

**Files:**
- Modify: `<plugin>/templates/diagnostic-quiz/template.html`
- Modify: `<plugin>/templates/parameter-dashboard/template.html`
- Modify: `<plugin>/templates/scenario-cards/template.html`

Each of these has one hardcoded date/time line that should disappear when `program[i].date`/`when`/`hall` are absent.

- [ ] **Step 1: diagnostic-quiz** — wrap the date `<p>` (line ~533)

Locate:
```html
      <p style="color: var(--ink-3); font-size: 14px;">Вторник 28.04, 17:00 · Большой зал</p>
```

Replace with:
```html
      <!-- evt-if:lecture-when --><p style="color: var(--ink-3); font-size: 14px;"><!-- evt:lecture-when -->Вторник 28.04, 17:00 · Большой зал<!-- /evt --></p><!-- /evt-if -->
```

- [ ] **Step 2: parameter-dashboard** — wrap the hero-meta div (line ~358)

Locate:
```html
    <div class="hero-meta" id="heroMeta">среда 29.04, 09:20–10:50 · большой зал</div>
```

Replace with:
```html
    <!-- evt-if:lecture-when --><div class="hero-meta" id="heroMeta"><!-- evt:lecture-when -->среда 29.04, 09:20–10:50 · большой зал<!-- /evt --></div><!-- /evt-if -->
```

- [ ] **Step 3: scenario-cards** — wrap the hero-meta div (line ~423)

Locate:
```html
    <div class="hero-meta">четверг 30.04, 09:20–10:40</div>
```

Replace with:
```html
    <!-- evt-if:lecture-when --><div class="hero-meta"><!-- evt:lecture-when -->четверг 30.04, 09:20–10:40<!-- /evt --></div><!-- /evt-if -->
```

- [ ] **Step 4: Sanity check that all 3 templates parse**

```bash
cd "<repo>"
for tpl in diagnostic-quiz parameter-dashboard scenario-cards; do
  echo "=== $tpl ==="
  echo '{}' > /tmp/empty.json
  node lecture-artifacts/scripts/inject-data.mjs --validate /tmp/empty.json "lecture-artifacts/templates/$tpl/template.html" || echo "FAIL"
done
rm /tmp/empty.json
```

Expected: each prints `ok`. The DATA banner+block remain untouched, validation passes.

---

## Task 4: Wrap manifesto hero-meta + signature blocks

**File:** `<plugin>/templates/manifesto/template.html`

Two zones in manifesto: hero-meta (Когда / Слот rows, lines 394-397) and signature (Где / Когда / Кто / Лекций rows, lines 409-414).

- [ ] **Step 1: Wrap hero-meta rows individually**

Read manifesto template. Locate (~lines 394-397):

```html
  <div class="hero-meta">
    <div><b>Когда</b>пт 02.05, 09:10</div>
    <div><b>Слот</b>мИИтинг + презентация</div>
  </div>
```

Replace with:

```html
  <div class="hero-meta">
    <!-- evt-if:lecture-when --><div><b>Когда</b><!-- evt:lecture-when -->пт 02.05, 09:10<!-- /evt --></div><!-- /evt-if -->
    <!-- evt-if:lecture-slot --><div><b>Слот</b><!-- evt:lecture-slot -->мИИтинг + презентация<!-- /evt --></div><!-- /evt-if -->
  </div>
```

If both `evt-if` blocks are removed at build time, the outer `<div class="hero-meta">` stays empty (acceptable — no visible artifact).

- [ ] **Step 2: Wrap signature rows individually**

Locate (~lines 409-414, the existing v0.2.0 markup):

```html
<section class="signature">
  <div class="sig-row"><b>Где</b><span><!-- evt:event-location -->Пятигорск, Центр знаний Машук<!-- /evt --></span></div>
  <div class="sig-row"><b>Когда</b><span><!-- evt:event-dates -->28 апреля — 2 мая 2026<!-- /evt --></span></div>
  <div class="sig-row"><b>Кто</b><span><!-- evt:event-participants -->~280 педагогов из всех регионов России<!-- /evt --></span></div>
  <div class="sig-row"><b>Лекций</b><span><!-- evt:event-content-summary -->11 ключевых + 7 параллельных мастер-классов<!-- /evt --></span></div>
</section>
```

Replace with:

```html
<section class="signature">
  <!-- evt-if:event-location --><div class="sig-row"><b>Где</b><span><!-- evt:event-location -->Пятигорск, Центр знаний Машук<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-dates --><div class="sig-row"><b>Когда</b><span><!-- evt:event-dates -->28 апреля — 2 мая 2026<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-participants --><div class="sig-row"><b>Кто</b><span><!-- evt:event-participants -->~280 педагогов из всех регионов России<!-- /evt --></span></div><!-- /evt-if -->
  <!-- evt-if:event-content-summary --><div class="sig-row"><b>Лекций</b><span><!-- evt:event-content-summary -->11 ключевых + 7 параллельных мастер-классов<!-- /evt --></span></div><!-- /evt-if -->
</section>
```

- [ ] **Step 3: Sanity check**

```bash
cd "<repo>"
echo '{}' > /tmp/empty.json
node lecture-artifacts/scripts/inject-data.mjs --validate /tmp/empty.json lecture-artifacts/templates/manifesto/template.html || echo FAIL
rm /tmp/empty.json
node -e '
const fs = require("fs");
const s = fs.readFileSync("lecture-artifacts/templates/manifesto/template.html", "utf8");
const evtIfCount = (s.match(/<!-- evt-if:/g) || []).length;
const evtIfClose = (s.match(/<!-- \/evt-if -->/g) || []).length;
console.log("evt-if open:", evtIfCount, "close:", evtIfClose, evtIfCount === evtIfClose ? "balanced" : "MISMATCH");
'
```

Expected: `ok` and `evt-if open: 7 close: 7 balanced` (1 in hero-eye for lecture-title from Task 2, 2 in hero-meta, 4 in signature).

---

## Task 5: Wrap event-landing topbar, hero-stats, section-eye+timeline

**File:** `<plugin>/templates/event-landing/template.html`

Three zones to wrap. Plus the artifact-card render JS gets two edits in Task 6.

- [ ] **Step 1: Wrap topbar counter (line ~350)**

Locate:
```html
  <div class="right">7 артефактов</div>
```

Replace with:
```html
  <div class="right"><!-- evt:artifact-count -->7 артефактов<!-- /evt --></div>
```

(Plain `evt:`, not `evt-if:` — the count always exists; only its value changes.)

- [ ] **Step 2: Wrap hero-stats rows individually (lines ~360-365)**

Locate:
```html
  <div class="hero-meta">
    <div><b>Где</b>Пятигорск</div>
    <div><b>Когда</b>5 дней</div>
    <div><b>Кто</b>~280 педагогов</div>
    <div><b>Что</b>11+7 лекций</div>
  </div>
```

Replace with:
```html
  <div class="hero-meta">
    <!-- evt-if:event-location --><div><b>Где</b><!-- evt:event-location -->Пятигорск<!-- /evt --></div><!-- /evt-if -->
    <!-- evt-if:event-duration --><div><b>Когда</b><!-- evt:event-duration -->5 дней<!-- /evt --></div><!-- /evt-if -->
    <!-- evt-if:event-participants --><div><b>Кто</b><!-- evt:event-participants -->~280 педагогов<!-- /evt --></div><!-- /evt-if -->
    <!-- evt-if:event-content-summary --><div><b>Что</b><!-- evt:event-content-summary -->11+7 лекций<!-- /evt --></div><!-- /evt-if -->
  </div>
```

- [ ] **Step 3: Wrap section-eye + timeline together (lines ~367-?)**

Find the `<div class="section-eye">Программа · 5 дней</div>` line and the entire `<section class="timeline">...</section>` block that follows.

Read the file with appropriate `offset`/`limit` to identify the exact closing `</section>` line. The timeline section spans approximately lines 369–401 in the v0.2.0 state.

Replace the WHOLE block:

Before (representative, exact lines vary):
```html
<div class="section-eye">Программа · 5 дней</div>

<section class="timeline">
  <div class="day">
    <div class="day-head"><div class="day-name">Вторник</div><div class="day-date">28 апреля</div></div>
    ...
  </div>
  ...
</section>
```

After:
```html
<!-- evt-if:program-has-content -->
<div class="section-eye"><!-- evt:program-section-title -->Программа · 5 дней<!-- /evt --></div>

<section class="timeline" id="timeline"></section>
<!-- /evt-if -->
```

The hardcoded 4 days disappear from HTML; the empty `<section>` is populated by JS at runtime in Task 6 from `DATA.timeline`.

- [ ] **Step 4: Sanity check**

```bash
cd "<repo>"
echo '{}' > /tmp/empty.json
node lecture-artifacts/scripts/inject-data.mjs --validate /tmp/empty.json lecture-artifacts/templates/event-landing/template.html || echo FAIL
rm /tmp/empty.json

node -e '
const fs = require("fs");
const s = fs.readFileSync("lecture-artifacts/templates/event-landing/template.html", "utf8");
const checks = {
  "topbar evt:artifact-count present": s.includes("evt:artifact-count"),
  "evt-if:event-location present": s.includes("evt-if:event-location"),
  "evt-if:program-has-content present": s.includes("evt-if:program-has-content"),
  "timeline section is empty container": /<section class="timeline" id="timeline"><\/section>/.test(s),
  "no <div class=\"day\">.*Вторник remaining": !/<div class="day">[\s\S]{0,200}Вторник/.test(s),
  "evt-if balanced": (s.match(/<!-- evt-if:/g) || []).length === (s.match(/<!-- \/evt-if -->/g) || []).length,
};
let ok = true;
for (const [k, v] of Object.entries(checks)) { console.log((v ? "ok " : "FAIL ") + k); if (!v) ok = false; }
process.exit(ok ? 0 : 1);
'
```

Expected: all 6 checks `ok`.

---

## Task 6: Refactor landing artifact-card render + DATA.timeline render

**File:** `<plugin>/templates/event-landing/template.html`

Two edits in the script block at the bottom of the file.

### 6A — Drop `art-sub` line; conditional date in card meta

- [ ] **Step 1: Read the renderCard function**

```bash
grep -n "function renderCard" lecture-artifacts/templates/event-landing/template.html
```

This locates the function start line. Read 60 lines from there.

- [ ] **Step 2: Remove the art-sub block**

Locate:
```js
  const sub = document.createElement('div');
  sub.className = 'art-sub';
  sub.textContent = 'к лекции · ' + a.lecturer;
  mid.appendChild(sub);
```

Delete those 4 lines entirely.

- [ ] **Step 3: Make date conditional in art-meta**

Locate:
```js
  const metaDate = document.createElement('span');
  const metaDateB = document.createElement('b');
  metaDateB.textContent = 'дата:';
  metaDate.appendChild(metaDateB);
  metaDate.appendChild(document.createTextNode(' ' + a.date));
  meta.appendChild(metaDate);
```

Replace with:
```js
  if (a.date) {
    const metaDate = document.createElement('span');
    const metaDateB = document.createElement('b');
    metaDateB.textContent = 'дата:';
    metaDate.appendChild(metaDateB);
    metaDate.appendChild(document.createTextNode(' ' + a.date));
    meta.appendChild(metaDate);
  }
```

### 6B — Add DATA.timeline rendering

- [ ] **Step 4: Add `timeline: []` field to the seed DATA object**

Locate the existing `DATA = {...}` block in the template. The seed currently has `event` and `artifacts` keys. Add a third key `timeline` with the existing 4-day hardcoded data converted to the DATA shape.

The seed timeline is what was in the static HTML before Task 5. Convert each day to:

```js
  timeline: [
    { name: "Вторник", date: "28 апреля", rows: [
      { time: "15:00", text: "Заезд, размещение, регистрация", artifactN: null },
      { time: "17:00", text: "Бризицкий · ИИ: современный фронтир", artifactN: 1 },
      { time: "19:30", text: "Командообразование · Осмысление дня", artifactN: null }
    ]},
    { name: "Среда", date: "29 апреля", rows: [
      { time: "09:20", text: "Басюк · Образовательное пространство", artifactN: 2 },
      { time: "14:00", text: "Серёгин · Цифра в мировом образовании", artifactN: 3 },
      { time: "15:40", text: "7 параллельных мастер-классов", artifactN: 4 },
      { time: "17:00", text: "Обсуждение лекций и МК", artifactN: null }
    ]},
    { name: "Четверг", date: "30 апреля", rows: [
      { time: "09:20", text: "Палитай · Ценности государственности", artifactN: 5 },
      { time: "11:00", text: "Сиденко · Чернова · Антонова", artifactN: 6 },
      { time: "14:10", text: "Практика практик · 9 малых аудиторий", artifactN: null }
    ]},
    { name: "Пятница", date: "2 мая", rows: [
      { time: "09:10", text: "Манифест · итог 5 дней", artifactN: 7 }
    ]}
  ]
```

Place inside the existing `DATA = { event: {...}, artifacts: [...], timeline: [...] }` literal. Read the file first to get exact existing seed DATA shape and indentation; insert as a sibling key after `artifacts:`.

- [ ] **Step 5: Add timeline render function and invocation**

After the existing `renderCard` invocation block (where `DATA.artifacts.forEach(...)` is called), append:

```js

// Timeline render — populates #timeline if DATA.timeline is non-empty.
// Built using safe DOM API only (no innerHTML).
function renderTimeline() {
  const root = document.getElementById('timeline');
  if (!root || !Array.isArray(DATA.timeline) || DATA.timeline.length === 0) return;
  const COLOR_BY_N = { 1: 'blue', 2: 'teal', 3: 'ochre', 4: 'rose', 5: 'olive', 6: 'plum', 7: 'amber' };
  const ROMAN_BY_N = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII' };
  for (const day of DATA.timeline) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    const head = document.createElement('div');
    head.className = 'day-head';
    const name = document.createElement('div');
    name.className = 'day-name';
    name.textContent = day.name;
    head.appendChild(name);
    const date = document.createElement('div');
    date.className = 'day-date';
    date.textContent = day.date;
    head.appendChild(date);
    dayDiv.appendChild(head);
    const rows = document.createElement('div');
    rows.className = 'day-rows';
    for (const r of (day.rows || [])) {
      const row = document.createElement('div');
      row.className = 'day-row' + (r.artifactN ? ' has-artifact' : '');
      const t = document.createElement('div');
      t.className = 't';
      t.textContent = r.time;
      row.appendChild(t);
      const l = document.createElement('div');
      l.className = 'l';
      if (r.artifactN) {
        const b = document.createElement('b');
        b.textContent = r.text;
        l.appendChild(b);
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.style.background = 'var(--' + (COLOR_BY_N[r.artifactN] || 'blue') + ')';
        pill.textContent = '→ ' + (ROMAN_BY_N[r.artifactN] || String(r.artifactN));
        l.appendChild(pill);
      } else {
        l.textContent = r.text;
      }
      row.appendChild(l);
      rows.appendChild(row);
    }
    dayDiv.appendChild(rows);
    root.appendChild(dayDiv);
  }
}
renderTimeline();
```

- [ ] **Step 6: Sanity check — open in browser**

Manual: open `lecture-artifacts/templates/event-landing/template.html` in a browser. The page should display the same timeline as before refactor (4 days, ~13 rows total, with pill links to artifacts I-VII). If anything looks broken (missing rows, wrong colors), inspect DevTools console for errors.

- [ ] **Step 7: Sanity check — no innerHTML**

```bash
cd "<repo>"
grep -n innerHTML lecture-artifacts/templates/event-landing/template.html
```

Expected: blank (the original render also avoided innerHTML; we kept that discipline).

---

## Task 7: Regenerate all 8 goldens

**Files:**
- Modify: `<plugin>/scripts/tests/fixtures/{diagnostic-quiz,parameter-dashboard,case-matcher,pick-and-plan,scenario-cards,step-builder,manifesto,event-landing}.expected.html`

The event.json fixtures stay as-is (the engine treats missing markers as "block hidden"). After Tasks 2-6, the templates have new evt-if wrappers; running the engine produces NEW expected.html files where most evt-if blocks are STRIPPED (because fixtures don't supply those markers). This represents the "sparse / no program" scenario.

- [ ] **Step 1: Regenerate all 8 expected files**

```bash
cd "<repo>"
for tpl in diagnostic-quiz parameter-dashboard case-matcher pick-and-plan scenario-cards step-builder manifesto event-landing; do
  node lecture-artifacts/scripts/inject-data.mjs \
    "lecture-artifacts/templates/${tpl}/template.html" \
    "lecture-artifacts/templates/${tpl}/example-data.json" \
    "lecture-artifacts/scripts/tests/fixtures/${tpl}.event.json" \
    "lecture-artifacts/scripts/tests/fixtures/${tpl}.expected.html"
done
```

Expected: 8 lines like `wrote .../X.expected.html (NNN bytes)`. None should error. The new files will be SMALLER than before because evt-if blocks (without corresponding markers in event.json) get stripped.

- [ ] **Step 2: Run all tests**

```bash
cd "<plugin>"
node --test scripts/tests/*.mjs 2>&1 | tail -10
```

Expected: 20/20 passing — 6 engine tests (synthetic + edge + 3 evt-if + CLI) + 3 parse-program + 8 golden + 3 evt-if. (Some tests have multiple assertions; subtotal varies. Confirm `pass` count matches `tests` count and `fail = 0`.)

- [ ] **Step 3: Open one regenerated golden in browser to verify visual sanity**

Open `lecture-artifacts/scripts/tests/fixtures/manifesto.expected.html` in a browser. Expected:
- No "Когда / Слот" hero-meta block (or empty `<div class="hero-meta">`).
- No signature rows (the signature `<section>` exists but empty).
- No "· итог" in hero-eye (only event-name + event-year remain).
- DATA-driven theses render correctly.

If layout is broken (e.g. hero-meta empty div leaves visual whitespace), revisit Task 4 step 1 and decide whether to wrap the outer `<div class="hero-meta">` too.

---

## Task 8: Add manifesto rich fixture + golden

**Files:**
- Create: `<plugin>/scripts/tests/fixtures/manifesto.event-rich.json`
- Create: `<plugin>/scripts/tests/fixtures/manifesto.expected-rich.html`
- Modify: `<plugin>/scripts/tests/inject-data.test.mjs` (append rich-test)

The manifesto template has the most evt-if blocks. A "rich" fixture with all markers present exercises the kept-block path.

- [ ] **Step 1: Create `manifesto.event-rich.json`**

```json
{
  "title": "07 · Манифест Весеннего педсовета 2026",
  "markers": {
    "event-name": "Весенний педсовет",
    "event-year": "2026",
    "event-location": "Пятигорск, Центр знаний Машук",
    "event-dates": "28 апреля — 2 мая 2026",
    "event-participants": "~280 педагогов из всех регионов России",
    "event-content-summary": "11 ключевых + 7 параллельных мастер-классов",
    "lecture-title": "итог",
    "lecture-when": "пт 02.05, 09:10",
    "lecture-slot": "мИИтинг + презентация",
    "page-title": "Учитель — это <span class=\"accent\">не профессия</span>.<br>Это <span class=\"em\">позиция</span> в мире.",
    "act-title": "Манифест"
  }
}
```

- [ ] **Step 2: Generate the golden**

```bash
cd "<repo>"
node lecture-artifacts/scripts/inject-data.mjs \
  lecture-artifacts/templates/manifesto/template.html \
  lecture-artifacts/templates/manifesto/example-data.json \
  lecture-artifacts/scripts/tests/fixtures/manifesto.event-rich.json \
  lecture-artifacts/scripts/tests/fixtures/manifesto.expected-rich.html
```

Open the result in a browser. Confirm: hero-eye shows "Весенний педсовет 2026 · итог"; hero-meta shows both Когда and Слот rows; signature shows all 4 stat rows; hero h1 shows the styled "не профессия / позиция" text.

- [ ] **Step 3: Append the rich golden test**

Read `inject-data.test.mjs`, find the existing `golden: manifesto template + example data` test, and append after it (or at end of file):

```js

test('golden: manifesto template + example data + rich event (all evt-if kept)', () => {
  const tpl = readFileSync(join(__dirname, '..', '..', 'templates', 'manifesto', 'template.html'), 'utf8');
  const data = JSON.parse(readFileSync(join(__dirname, '..', '..', 'templates', 'manifesto', 'example-data.json'), 'utf8'));
  const event = JSON.parse(fixture('manifesto.event-rich.json'));
  const expected = fixture('manifesto.expected-rich.html');
  const actual = inject(tpl, data, event);
  assert.equal(actual, expected);
});
```

- [ ] **Step 4: Run all tests**

```bash
cd "<plugin>"
node --test scripts/tests/*.mjs 2>&1 | tail -10
```

Expected: 21/21 passing (20 from before + 1 new rich golden).

---

## Task 9: Update SKILL.md docs + event-config-format

**Files:**
- Modify: `<plugin>/skills/lecture-artifact-build/SKILL.md`
- Modify: `<plugin>/skills/event-landing-build/SKILL.md`
- Modify: `<plugin>/skills/event-init/SKILL.md`
- Modify: `<plugin>/references/event-config-format.md`

Pure documentation. Read each, replace specified sections, save.

### 9A — `lecture-artifact-build/SKILL.md` step 8

- [ ] **Step 1: Replace step 8's marker list**

Read the file, locate the `8. **Build the event.json**` block. Replace the bullet list under it with:

```
   - `event-name` ← `event.name`
   - `event-year` ← year extracted from `event.month_year`
   - `event-location` ← `event.location` (передавать ТОЛЬКО если задано в `.local.md`; иначе omit — `evt-if` блок исчезнет)
   - `event-dates` ← `event.dates` (передавать ТОЛЬКО если задано)
   - `event-participants` ← `event.participants` (передавать ТОЛЬКО если задано)
   - `event-content-summary` ← `event.content_summary` (передавать ТОЛЬКО если задано)
   - `act-title` ← short act name for the topbar (per-template default; can be overridden in program[].title shortening)
   - `page-title` ← per the template's `schema.md` "Заголовок страницы (page-title)" section. Skip for `step-builder`.
   - `lecture-when` ← компонуется из `program[i].when` ИЛИ `program[i].date` (+ опционально `program[i].hall`). Формат: `"<день> <дата>, <время> · <зал>"`. Любая часть отсутствует — пропускается. Если ни одной — НЕ передаётся (блок `evt-if:lecture-when` исчезнет).
   - `lecture-slot` ← `program[i].slot` (e.g. "мИИтинг + презентация"). Релевантно для шаблонов где этот маркер используется (manifesto). Не передаётся если поле отсутствует.
   - `lecture-title` ← НЕ передаётся в стандартном flow. Только для manifesto, где он опционально оборачивает «итог»-тэг в hero-eye. Передавать только если шаблон явно его использует.
   - И `title` (тэг `<title>`) ← `"<n> · <program[i].title>"`.

   КОНТРАКТ: передавать маркер ТОЛЬКО если у него есть значение. Пустая строка/`null`/`undefined` означают «блок исчезает». Это поведение реализовано в движке через `evt-if:KEY` директиву (см. `references/injection-protocol.md`).
```

### 9B — `event-landing-build/SKILL.md`

- [ ] **Step 2: Replace step 4 (build data) and step 5 (build event.json)**

Read the file. Locate step 4 (`Build data`). Replace the data construction block with:

```
4. **Build `data`** matching `templates/event-landing/schema.md`. Это {event, artifacts, timeline}.

   `event` и `artifacts` — как в v0.2.0.

   `timeline` — НОВОЕ. Конструируется из `program[]`:
   - Парсить `program[i].date` в `{day_name, day_date_short, time}`. Дата может быть в форматах:
     - `"2026-04-28 17:00"` → день недели вычисляется (вторник), `date_short = "28 апреля"`, `time = "17:00"`.
     - `"28.04 17:00"` → `date_short = "28 апреля"`, `time = "17:00"`, день недели определяется из контекста или оставляется пустым.
     - `"вторник 28.04 15:00"` → парсится напрямую.
     - При невалидной дате fallback: `day_name = "?"`, `day_date_short = program[i].date`, `time = ""`.
   - Группировать по дню (по уникальному `day_date_short`).
   - Для каждой записи `program[i]`: row = `{time, text: "<lecturer-short> · <title>", artifactN: i.n}`. `lecturer-short` — фамилия (или первое слово `lecturer` если фамилия не выделяется).
   - Если в `event.timeline_extras` есть `[{day_date, time, text}]` — вмешать как row с `artifactN: null`. Сортировать по `time` внутри каждого дня.
   - Если `program[]` пустое И `timeline_extras` пустое → `timeline = []`.
```

Replace step 5's event.json block with:

```
5. **Build `event.json`**:
   ```json
   {
     "title": "<event.name> <year> · N артефактов",
     "markers": {
       "event-name": "<event.name>",
       "event-year": "<year>",
       "event-location": "<event.location, если задано>",
       "event-duration": "<event.duration, если задано>",
       "event-participants": "<event.participants, если задано>",
       "event-content-summary": "<event.content_summary, если задано>",
       "page-title": "<сгенерировано по schema.md>",
       "artifact-count": "<N прописью> <согласованное артефакт-N>",
       "program-section-title": "Программа · <data.timeline.length> дней",
       "program-has-content": "true"
     }
   }
   ```

   КОНТРАКТ: маркер передаётся только если значение непусто. `program-has-content` передаётся только если `data.timeline.length > 0`. `program-section-title` так же. `event-*` — только при наличии в `.local.md`.

   `artifact-count` пример согласования:
   - 1 → `один артефакт`
   - 2 → `два артефакта`
   - 3 → `три артефакта`
   - 4 → `четыре артефакта`
   - 5 → `пять артефактов`
   - 6 → `шесть артефактов`
   - 7 → `семь артефактов`
   (Числа прописью, форма артефакт/артефакта/артефактов по правилам русского.)
```

### 9C — `event-init/SKILL.md` step 5

- [ ] **Step 3: Replace step 5 fields list**

Find step 5 (Top up event-level fields) and step 6 (Top up program rows). Replace with:

```
5. **Top up event-level fields** via `AskUserQuestion`, **only if missing** in the merged object:
   - `event.name`
   - `event.month_year` (try to derive from `program[].date` first)
   - `event.location` — где проходит. Используется в манифесте и лендинге.
   - `event.dates` — диапазон дат (e.g. "28 апреля — 2 мая 2026"). Если есть `program[].date`, можно собрать из min/max.
   - `event.duration` — короткая форма продолжительности (e.g. "5 дней"). Можно посчитать по числу уникальных дат в `program[]` или спросить.
   - `event.participants` — кто участвует (e.g. "~280 педагогов из всех регионов России").
   - `event.content_summary` — что в программе крупными штрихами (e.g. "11+7 лекций"). Опционально.
   - `event.timeline_extras` — необязательно. Не-лекционные строки расписания (заезд, обсуждение). Список `{day_date, time, text}`. Если пользователь не вводит — оставить пустым массивом.
   - `event.output_dir` (default: транслит названия)
   
   Все поля кроме `event.name` и `event.month_year` опциональны. Если пользователь пропускает — поле остаётся `null`/отсутствует, что и нужно для `evt-if`.

6. **Top up program rows**:
   - Для каждой `program[i]` без `template` — спросить какой шаблон использовать (multi-choice).
   - НОВЫЕ опциональные поля (опросить только если пользователь явно соглашается дополнить):
     - `program[i].slot` — формат лекции ("мИИтинг + презентация", "лекция + Q&A"). Опционально.
     - `program[i].when` — готовая человекочитаемая строка времени (alternative to `date`+`hall`). Опционально.
   - Если пользователь не задаёт `slot`/`when` — поля остаются `null`, что приводит к скрытию соответствующих блоков в финальной странице.
```

### 9D — `references/event-config-format.md`

- [ ] **Step 4: Add new fields to YAML spec**

Read the file. Locate the `event:` block. Add 2 fields after `location:` (or wherever in the block):

```
  duration:             string?                # короткая форма продолжительности, e.g. "5 дней"
  timeline_extras:      array?                 # [{day_date, time, text}] не-лекционные строки timeline
```

In the `program:` block, add 2 fields after `hall:`:

```
    slot:               string?                # формат, e.g. "мИИтинг + презентация"
    when:               string?                # готовая строка времени, alternative to date+hall
```

(Adjust indentation to match the existing YAML spec format in the file.)

- [ ] **Step 5: Sanity check — frontmatter still valid**

```bash
cd "<repo>"
node -e '
const fs = require("fs");
for (const f of [
  "lecture-artifacts/skills/lecture-artifact-build/SKILL.md",
  "lecture-artifacts/skills/event-landing-build/SKILL.md",
  "lecture-artifacts/skills/event-init/SKILL.md",
]) {
  const s = fs.readFileSync(f, "utf8");
  if (!s.startsWith("---\n")) throw new Error("bad frontmatter: " + f);
}
console.log("ok");
'
```

Expected: `ok`.

---

## Task 10: Bump versions, CHANGELOGs, single commit

**Files:**
- Modify: `<plugin>/.claude-plugin/plugin.json`
- Modify: `<repo>/.claude-plugin/marketplace.json`
- Modify: `<plugin>/CHANGELOG.md`
- Modify: `<repo>/CHANGELOG.md`

This task creates the SOLE commit of the v0.3.0 release.

- [ ] **Step 1: Bump plugin version**

Edit `<plugin>/.claude-plugin/plugin.json`: change `"version": "0.2.0"` → `"version": "0.3.0"`.

- [ ] **Step 2: Bump marketplace version + plugin entry**

Edit `<repo>/.claude-plugin/marketplace.json`:
- `metadata.version: "1.1.0"` → `"1.2.0"`
- `plugins[].version` for `lecture-artifacts`: `"0.2.0"` → `"0.3.0"`

- [ ] **Step 3: Prepend entry to `<plugin>/CHANGELOG.md`**

Read the file to confirm current top entry is `## [0.2.0]`. Insert BEFORE that:

```markdown
## [0.3.0] — 2026-04-26

Conditional rendering. Breaking change в нескольких UI-аспектах шаблонов.

- Новая директива движка: `<!-- evt-if:KEY -->...<!-- /evt-if -->`. При пустом/null/undefined значении в `event.markers[KEY]` весь блок удаляется на этапе сборки. Иначе блок остаётся, внутренние `evt:KEY` подменяются как обычно.
- Удалён дублирующий eyebrow `evt:lecture-title` с per-artifact страниц (5 шаблонов: diagnostic-quiz, parameter-dashboard, case-matcher, pick-and-plan, scenario-cards). На этих страницах лектор отображается ниже через DATA.lecturer; eyebrow дублировал.
- Hardcoded даты/время в hero-meta обёрнуты в `evt-if:lecture-when` (3 шаблона). Manifesto: `evt-if:lecture-when` + `evt-if:lecture-slot` для двух своих rows.
- Manifesto signature (4 stat-rows) обёрнуты в индивидуальные `evt-if:event-*`.
- Event-landing: топбар-счётчик через `evt:artifact-count` (генерируется); hero-stats rows в `evt-if:event-*`; section-eye+timeline в `evt-if:program-has-content`; артефакт-карточки лишены дублирующего «к лекции · X»; дата показывается условно (`if (a.date)`).
- Event-landing timeline теперь DATA-driven: `DATA.timeline` массив дней с rows. Рендер safe-DOM API (createElement/textContent), без innerHTML.
- Новые опциональные поля в `.local.md`: `event.duration`, `event.timeline_extras`, `program[i].slot`, `program[i].when`.
- `lecture-artifact-build` и `event-landing-build` обновлены: пробрасывают маркеры только при наличии значения.
- `event-init` опросник расширен новыми полями (все опциональные).

```

- [ ] **Step 4: Prepend entry to `<repo>/CHANGELOG.md`**

Read; confirm top entry is `## [1.1.0]`. Insert BEFORE:

```markdown
## [1.2.0] — 2026-04-26

- `lecture-artifacts` 0.2.0 → 0.3.0: conditional rendering через директиву `evt-if`; удалён дублирующий lecture-title eyebrow; landing timeline теперь DATA-driven.

```

- [ ] **Step 5: Final sanity — all tests, manifests valid**

```bash
cd "<plugin>"
node --test scripts/tests/*.mjs 2>&1 | tail -5
cd "<repo>"
node -e '
const fs = require("fs");
JSON.parse(fs.readFileSync("lecture-artifacts/.claude-plugin/plugin.json"));
const m = JSON.parse(fs.readFileSync(".claude-plugin/marketplace.json"));
const la = m.plugins.find(p => p.name === "lecture-artifacts");
console.log("plugin", JSON.parse(fs.readFileSync("lecture-artifacts/.claude-plugin/plugin.json")).version);
console.log("marketplace", m.metadata.version);
console.log("entry", la.version);
'
```

Expected: 21/21 tests passing; output `plugin 0.3.0 / marketplace 1.2.0 / entry 0.3.0`.

- [ ] **Step 6: Single commit**

```bash
cd "<repo>"
git add lecture-artifacts/scripts/inject-data.mjs \
        lecture-artifacts/scripts/tests/inject-data.test.mjs \
        lecture-artifacts/scripts/tests/fixtures/ \
        lecture-artifacts/templates/*/template.html \
        lecture-artifacts/skills/lecture-artifact-build/SKILL.md \
        lecture-artifacts/skills/event-landing-build/SKILL.md \
        lecture-artifacts/skills/event-init/SKILL.md \
        lecture-artifacts/references/event-config-format.md \
        lecture-artifacts/.claude-plugin/plugin.json \
        lecture-artifacts/CHANGELOG.md \
        .claude-plugin/marketplace.json \
        CHANGELOG.md
git status -s
git commit -m "lecture-artifacts v0.3.0: conditional rendering (evt-if), DATA-driven timeline, removed lecture-title eyebrow (marketplace v1.2.0)"
git log -1 --stat | head -30
```

Expected: single commit including changes to engine, all 8 templates, 8 regenerated goldens + 2 new manifesto rich fixtures, 3 SKILL.md, 1 reference, 4 manifest/CHANGELOG. Roughly 25-30 files changed.

---

## Self-review

**Spec coverage:**
- §4 (engine extension): Task 1. ✓
- §5.1 (remove eyebrow): Task 2. ✓
- §5.2 (per-artifact hero-meta): Task 3. ✓
- §5.3 (manifesto hero-meta + signature): Task 4. ✓
- §6.1 (topbar counter): Task 5 step 1. ✓
- §6.2 (hero-stats): Task 5 step 2. ✓
- §6.3 (section-eye + timeline wrapping + DATA.timeline): Tasks 5 step 3 + 6. ✓
- §6.4 (artifact-card render): Task 6A. ✓
- §7.1-7.3 (skill updates): Task 9. ✓
- §8 (tests): Tasks 1 (engine tests) + 7 (regen goldens) + 8 (rich fixture). ✓
- §9 (versions + CHANGELOGs): Task 10. ✓

**Placeholder scan:** every code step shows actual code. Every command step shows the actual command. The phrase "exact lines vary; preserve indentation" appears once in Task 5 step 3 — that's because the timeline section spans 30+ lines and the engineer must read the file to identify the exact range. Acceptable trade-off (alternative would be inlining 30 lines of source as `old_string`).

**Type consistency:** marker keys used consistently — `lecture-when`, `lecture-slot`, `event-location`, `event-dates`, `event-duration`, `event-participants`, `event-content-summary`, `artifact-count`, `program-has-content`, `program-section-title`, `page-title`, `act-title`, `lecture-title`, `event-name`, `event-year`. `DATA.timeline` shape consistent across Tasks 6 and 9 (`{name, date, rows: [{time, text, artifactN}]}`).

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-04-26-conditional-rendering-plan.md`. Auto-mode is active — proceeding via `superpowers:subagent-driven-development` with single-commit discipline (only Task 10 commits). Push to remote requires explicit user confirmation as before.
