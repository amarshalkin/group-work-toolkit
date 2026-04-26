# Adding a new template

To add a 9th template (or beyond):

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
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML` in any new render code — use only `createElement`, `textContent`, `setAttribute`, `appendChild`. The repo's security hook blocks writes containing untrusted-content innerHTML assignment.

## Schema discipline

- The schema must reflect the SHAPE OBSERVED in `example-data.json`, not a guessed shape. Extract the example first, inspect its top-level keys and nested shapes, then write the schema.
- Extend enums to cover all values that appear in seed data.
- Encode strict cardinality where the page logic depends on it (e.g. "exactly 12 questions × 4 options" in `diagnostic-quiz`).
