# Injection Protocol

The engine `scripts/inject-data.mjs` performs three replacements on the template HTML.

## 1. DATA block

Regex: `/(\/\* ═+\s*\n\s*DATA — обновляется[\s\S]*?═+ \*\/\s*\n)const DATA = \{[\s\S]*?\n\};/m`

Banner comment lines (the `═` rules and the «DATA — обновляется…» phrase) are preserved. The `const DATA = { … };` line is replaced with `const DATA = ${JSON.stringify(data, null, 2)};`.

**Contract for templates:** keep the banner exactly as in the source. Do not put another `};` line at column 0 inside the block.

## 2. evt-marker spans

Regex per key: `/(<!-- evt:KEY -->)[\s\S]*?(<!-- \/evt -->)/g`

The content between matched marker pairs is replaced by the value from `event.markers[KEY]`. Keys present in the template but missing from the markers map are left untouched.

**Contract for templates:** every dynamic event-bound text is wrapped in a marker pair. The marker can wrap inline text or block text; do not nest markers.

## 3. <title>

Regex: `/<title>[\s\S]*?<\/title>/`. Replaced if `event.title` is provided.

**Contract for templates:** exactly one `<title>` tag in the head. Always.
