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

**КОНТРАКТ числовых маркеров:** все числовые слова («шесть», «семь», «два») в маркерах (особенно `page-title`, `lecture-title`, `act-title`, `artifact-count`) должны соответствовать длине реального массива в DATA. Не выдумывайте числа из памяти лекции. Сначала генерируйте DATA, посчитайте `data.parameters.length` (или другой релевантный массив), затем подставляйте именно это число в page-title прописью. Программная проверка `scripts/validate-counts.mjs` ловит расхождения постфактум.

1. **Read event config.** Open `.claude/lecture-artifacts.local.md` from the user's CWD. Parse the YAML frontmatter into `event` and `program[]`. If the file is missing, follow §Fallback below.
2. **Pick the lecture.** Filter `program[]` where `template == <input template>`. If exactly one — use it. If many — ask the user which one via `AskUserQuestion`. If none — ask the user to pick a lecture number from the program; bind that lecture to this template.
3. **Read the transcript** with the `Read` tool. Verify it is non-empty.
4. **Read the template artefacts**: `templates/<template>/template.html`, `templates/<template>/schema.md`, `templates/<template>/example-data.json`.
5. **Generate DATA JSON.** Read the schema thoroughly. Use the example as a shape reference. Extract content from the transcript that satisfies the schema. Pin general fields (`lecturer`, `lectureTitle`, `date`) from `program[i]` — never invent. For arrays with strict cardinality (e.g. "exactly 12 questions"), match exactly; if the transcript doesn't cover all entries, fill remaining ones with conservative typical content and add a note in the user-facing summary.
6. **Special case for `manifesto`.** Build `links[]` from `.local.md`: every `program[i]` (excluding the manifesto's own entry) with non-null `published_url` becomes one link `{num: roman(i.n), title: defaultTitleFor(i.template), desc: defaultDescFor(i.template), href: i.published_url}`. The mapping `(template) → (default title, default desc)` is defined in `${CLAUDE_PLUGIN_ROOT}/references/template-mapping.md`. If a sister artefact has no `published_url` yet, omit it from `links[]`.
7. **Validate.** Write the generated JSON to a temp file (`/tmp/lecture-artifact-<template>-<timestamp>.json`). Run two checks:

   (a) **Schema/inject validation:** `node ${CLAUDE_PLUGIN_ROOT}/scripts/inject-data.mjs --validate <data.json> ${CLAUDE_PLUGIN_ROOT}/templates/<template>/template.html`. If exit code ≠ 0, fix the JSON (one retry) and re-validate. If still failing, report the error to the user and stop.

   (b) **Count-consistency validation** (после построения event.json в шаге 8): сверяет числительные в маркерах с длинами массивов в DATA — `node ${CLAUDE_PLUGIN_ROOT}/scripts/validate-counts.mjs <data.json> <event.json>`. Если возвращает WARN — пересмотреть `page-title` (и другие маркеры) и привести числа в соответствие с фактическими длинами массивов. Это soft check (warning), не блокирующая ошибка, но игнорировать нельзя — пользователь видит расхождение «Шесть переключателей» при `parameters.length === 4` как баг.
8. **Build the event.json.** Compute marker values from `event` and `program[i]`:
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
   - `lecture-title` ← НЕ передаётся в стандартном flow (eyebrow удалён в v0.3.0). Только для manifesto, где он опционально оборачивает «итог»-тэг в hero-eye. Передавать только если шаблон явно его использует.
   - И `title` (тэг `<title>`) ← `"<n> · <program[i].title>"`.

   КОНТРАКТ: передавать маркер ТОЛЬКО если у него есть значение. Пустая строка/`null`/`undefined` означают «блок исчезает». Это поведение реализовано в движке через `evt-if:KEY` директиву (см. `references/injection-protocol.md`).
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
