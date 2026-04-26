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
