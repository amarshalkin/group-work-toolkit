# Transcript → Data extraction

When generating a JSON for a template's schema:

- **Quote, don't paraphrase.** Quote-fields must be near-verbatim. If the transcript is too vague to quote, mark the source as "по мотивам ..." and keep the quote short.
- **Pin general fields from the program**, never from the transcript: `lecturer`, `title`/`lectureTitle`, `date`. The transcript is sometimes recorded under another speaker's lecture by mistake.
- **For arrays with strict cardinality** (e.g. "exactly 12 questions"): if the transcript covers fewer items, generate the rest as conservative typical content. In the user-facing summary, state how many slots were filled from transcript vs. typical.
- **Round numeric fields** sensibly. Don't write `42.7` if surrounding values are integers.
- **Cyrillic stays cyrillic.** Don't transliterate names.
- **HTML in fields:** only where the schema explicitly allows it (e.g. inline `<b>...</b>` in some explain-fields). When in doubt, output plain text.
