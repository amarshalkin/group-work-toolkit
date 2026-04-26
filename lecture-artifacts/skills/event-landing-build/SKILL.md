---
name: event-landing-build
description: Build the event landing page from `.claude/lecture-artifacts.local.md` and the actual contents of `<event.output_dir>/`. Idempotent — re-run after each new artefact is published. Used by /event-landing.
---

# Skill: event-landing-build

Idempotent. The command may be invoked any number of times — each run reflects current disk state, not cached `.local.md` state. If the user manually deleted an artefact, it correctly drops to `pending`.

## Process

1. **Read `.claude/lecture-artifacts.local.md`.** If missing — refuse: tell the user to run `/init` first.
2. **Scan `<event.output_dir>/`** with `Bash` (`ls`/`find`). Build a map `n → {output, qr}` from filenames matching `<n>-<template>.html` and `<n>-<template>.qr.svg`.
3. **For each `program[i]`**, derive `status`:
   - If `program[i].published_url` is set → `status: published`, `href = program[i].published_url`, `qr = program[i].qr` (URL or local path).
   - Else if `program[i].output` exists on disk → `status: local`, `href = ./<basename of program[i].output>` (relative to the landing's location), `qr = null`.
   - Else → `status: pending`, `href = null`, `qr = null`.
4. **Build `data`** matching `templates/event-landing/schema.md`. Это `{event, artifacts, timeline}`.

   `event` и `artifacts` — как в v0.2.0.

   `timeline` — НОВОЕ. Конструируется из `program[]`:
   - Парсить `program[i].date` в `{day_name, day_date_short, time}`. Дата может быть в форматах:
     - `"2026-04-28 17:00"` → день недели вычисляется (вторник), `date_short = "28 апреля"`, `time = "17:00"`.
     - `"28.04 17:00"` → `date_short = "28 апреля"`, `time = "17:00"`, день недели определяется из контекста или оставляется пустым.
     - `"вторник 28.04 15:00"` → парсится напрямую.
     - При невалидной дате fallback: `day_name = "?"`, `day_date_short = program[i].date`, `time = ""`.
   - Группировать по дню (по уникальному `day_date_short`).
   - Для каждой записи `program[i]`: row = `{time, text, artifactN}` где:
     - `time` — строка вида `"HH:MM"` (24-часовой формат).
     - `text` — СТРОГО `"<lecturer-short> · <lecture-title>"`. НЕ включать `template-id`, НЕ включать дату/время, НЕ дублировать заголовок. Например: `"Бризицкий · ИИ: современный фронтир"`. Ровно две части через ` · `. `lecturer-short` — фамилия (или первое слово `lecturer` если фамилия не выделяется).
     - `artifactN` — ЦЕЛОЕ ЧИСЛО (integer) равное `program[i].n` (1..7). Никогда не строка, никогда не template-id, никогда не Roman.
   - Если `program[i].n` не задано или не целое — пропустить запись (или поставить `artifactN: null` — она отрендерится без pill, как обычная не-артефактная строка timeline).
   - Если в `event.timeline_extras` есть `[{day_date, time, text}]` — вмешать как row с `artifactN: null`. Сортировать по `time` внутри каждого дня.
   - Если `program[]` пустое И `timeline_extras` пустое → `timeline = []`.
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

   `artifact-count` пример согласования (число прописью + правильная форма):
   - 1 → `один артефакт`
   - 2..4 → `<N> артефакта` (два / три / четыре)
   - 5..7 → `<N> артефактов` (пять / шесть / семь)
6. **Validate**: write `data` to `/tmp/event-landing-<timestamp>.json`. Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/inject-data.mjs --validate <data.json> ${CLAUDE_PLUGIN_ROOT}/templates/event-landing/template.html`. If non-zero exit, fix and retry once. If still failing, stop with error.
7. **Inject**: run `node ${CLAUDE_PLUGIN_ROOT}/scripts/inject-data.mjs <template.html> <data.json> <event.json> <output.html>` where `<output.html>` = `<cwd>/<event.output_dir>/index.html`.
8. **Patch `.local.md`**: set `event.landing_output` = absolute path to `<output.html>`. Refresh `updated_at`.
9. **Try-call publish (optional)**. Same try-call pattern as `lecture-artifact-build`:
   - Try invoking `knotta-host-html:host-html` with the output file.
   - If it returns `{url, qr}`: set `event.landing_url` and `event.landing_qr` in `.local.md`.
   - If `not found`: skip silently — landing exists locally, file path is enough.
10. **Reply** to user: a short block with
    - Path to built `index.html`.
    - URL of published landing if available.
    - QR if available.
    - Summary line: "X из Y артефактов опубликовано, Z локально, W в работе" (N = X+Z+W).

## Lecturer field convention

The `lecturer` field in `program[i]` may be either a person name ("Дмитрий Бризицкий") or a session descriptor ("7 параллельных мастер-классов", "синтез всех 5 дней"). Pass it through as-is to `artifact.lecturer` — the template renders it in the meta line. Do not normalize.

## Date field convention

`program[i].date` is free-form ("2026-04-28 17:00", "29.04 09:20", "среда 29.04"). Pass through as-is.

For `event.dates` (the landing's range): try to derive a compact range from min/max of `program[].date`. If the dates aren't parseable, fall back to the literal min/max strings joined with ` — `. If `program[]` is empty, leave `event.dates` empty string.
