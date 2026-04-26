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
4. **Build `data`** matching `templates/event-landing/schema.md`:
   ```json
   {
     "event": {
       "name":     "<event.name>",
       "year":     "<year extracted from event.month_year>",
       "dates":    "<date range derived from program[].date>",
       "location": "<event.location or omit>"
     },
     "artifacts": [
       { "n": <i.n>, "template": <i.template>, "title": <i.title>, "lecturer": <i.lecturer>, "date": <i.date>, "href": <as derived above>, "qr": <as derived above>, "status": <as derived above> }
     ]
   }
   ```
5. **Build `event.json`**:
   ```json
   {
     "title": "<event.name> <year> · N артефактов",
     "markers": {
       "event-name": "<event.name>",
       "event-year": "<year>",
       "event-dates": "<event.dates>",
       "event-location": "<event.location>",
       "event-participants": "<event.participants>",
       "event-content-summary": "<event.content_summary>",
       "page-title": "<generated per templates/event-landing/schema.md 'Заголовок страницы' style>"
     }
   }
   ```
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
