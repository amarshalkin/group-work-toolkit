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
