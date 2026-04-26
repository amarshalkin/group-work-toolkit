# Format: `.claude/lecture-artifacts.local.md`

```yaml
event:
  name:           string                    # required
  short:          string?                   # optional, used in compact contexts
  month_year:     string                    # required, e.g. "Апрель 2026"
  location:       string?                   # optional, used in manifesto/landing signature
  duration:             string?                # короткая форма продолжительности, e.g. "5 дней"
  timeline_extras:      array?                 # [{day_date, time, text}] не-лекционные строки timeline
  dates:                string?                # e.g. "28 апреля — 2 мая 2026"
  participants:         string?                # e.g. "~280 педагогов из всех регионов России"
  content_summary:      string?                # e.g. "11 ключевых + 7 параллельных мастер-классов"
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
    slot:               string?                # формат, e.g. "мИИтинг + презентация"
    when:               string?                # готовая строка времени, alternative to date+hall
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
