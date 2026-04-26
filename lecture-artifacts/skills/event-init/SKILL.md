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
