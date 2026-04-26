// Lightweight parser for «программа мероприятия» files. Supports md (numbered list)
// and yaml (event/program structure). JSON support comes for free via JSON.parse.
// On unrecognised content, returns { event: null, program: [] } and lets the
// init skill ask the user.

export function parseProgram(text, format = 'md') {
  if (format === 'json') {
    try {
      const j = JSON.parse(text);
      return normalize(j);
    } catch {
      return { event: null, program: [] };
    }
  }
  if (format === 'yaml') {
    return parseYaml(text);
  }
  return parseMarkdown(text);
}

function normalize(obj) {
  return {
    event: obj.event ?? null,
    program: Array.isArray(obj.program) ? obj.program : [],
  };
}

// Minimal YAML parser sufficient for our shape (no anchors, no flow collections).
function parseYaml(text) {
  const lines = text.split(/\r?\n/);
  const out = { event: null, program: [] };
  let mode = null; // 'event' | 'program'
  let curItem = null;
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trim().startsWith('#')) continue;
    if (/^event:\s*$/.test(line)) { mode = 'event'; out.event = {}; continue; }
    if (/^program:\s*$/.test(line)) { mode = 'program'; continue; }
    if (mode === 'event' && /^\s{2}(\w+):\s*(.*)$/.test(line)) {
      const [, k, v] = line.match(/^\s{2}(\w+):\s*(.*)$/);
      out.event[k] = v.trim();
      continue;
    }
    if (mode === 'program' && /^\s{2}-\s+(\w+):\s*(.*)$/.test(line)) {
      curItem = {};
      out.program.push(curItem);
      const [, k, v] = line.match(/^\s{2}-\s+(\w+):\s*(.*)$/);
      curItem[k] = coerce(v.trim());
      continue;
    }
    if (mode === 'program' && /^\s{4}(\w+):\s*(.*)$/.test(line) && curItem) {
      const [, k, v] = line.match(/^\s{4}(\w+):\s*(.*)$/);
      curItem[k] = coerce(v.trim());
    }
  }
  return out;
}

function coerce(v) {
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

// Markdown: numbered list items shaped «N. lecturer — «title» — date hall».
const MD_ITEM_RE = /^\s*(\d+)[.)\]]\s+(.+)$/;
function parseMarkdown(text) {
  const out = { event: null, program: [] };
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(MD_ITEM_RE);
    if (!m) continue;
    const n = Number(m[1]);
    const rest = m[2];
    const item = { n };
    const parts = rest.split(/\s+[—-]\s+/);
    if (parts.length >= 1) item.lecturer = stripQuotes(parts[0]);
    if (parts.length >= 2) item.title = stripQuotes(parts[1]);
    if (parts.length >= 3) {
      const datePart = parts[2];
      const hallMatch = datePart.match(/\(([^)]+)\)\s*$/);
      if (hallMatch) {
        item.hall = hallMatch[1].trim();
        item.date = datePart.replace(/\(([^)]+)\)\s*$/, '').trim();
      } else {
        item.date = datePart.trim();
      }
    }
    if (parts.length >= 4) item.hall = stripQuotes(parts[3]);
    out.program.push(item);
  }
  return out;
}

function stripQuotes(s) {
  return s.replace(/^[«"']+|[«»"']+$/g, '').trim();
}
