// Small shared helpers — no dependencies.

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const nowISO = () => new Date().toISOString();

export function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Human-friendly relative-ish date, e.g. "Jul 3, 2026" or "2h ago" for recent.
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// Was the timestamp within the last 7 days?
export function withinDays(iso, days) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < days * 24 * 60 * 60 * 1000;
}

// Parse a comma/whitespace separated tag string into a clean, de-duped list.
export function parseTags(str = '') {
  const seen = new Set();
  return str
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t && !seen.has(t) && (seen.add(t) || true));
}

// Parse newline/comma separated URLs into a clean list.
export function parseLinks(str = '') {
  return str
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

// Tiny, safe markdown-lite renderer. Escapes first, then applies a limited
// set of inline/block formatting. Good enough for freeform idea descriptions.
export function renderMarkdown(src = '') {
  const esc = escapeHtml(src);
  const lines = esc.split('\n');
  const out = [];
  let inList = null; // 'ul' | 'ol' | null

  const closeList = () => { if (inList) { out.push(`</${inList}>`); inList = null; } };
  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s)]+)/g,
        '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*###\s+(.*)$/))) { closeList(); out.push(`<h3>${inline(m[1])}</h3>`); continue; }
    if ((m = line.match(/^\s*##\s+(.*)$/)))  { closeList(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^\s*#\s+(.*)$/)))   { closeList(); out.push(`<h2>${inline(m[1])}</h2>`); continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      if (inList !== 'ul') { closeList(); out.push('<ul>'); inList = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if ((m = line.match(/^\s*\d+\.\s+(.*)$/))) {
      if (inList !== 'ol') { closeList(); out.push('<ol>'); inList = 'ol'; }
      out.push(`<li>${inline(m[1])}</li>`); continue;
    }
    if (line.trim() === '') { closeList(); continue; }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

// Debounce for search input.
export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Make a <textarea> list-aware, so point forms are easy to type:
//  - Enter on a "- ", "* " or "1. " line continues the list (numbers increment).
//  - Enter on an empty bullet clears the marker and exits the list.
//  - "- "/"* "/"1. " at the very start of a blank line is left as-is (user typing).
// Plays nicely with ⌘/Ctrl+Enter save handlers (those keys are ignored here).
export function attachListBehavior(ta) {
  ta.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const { value, selectionStart, selectionEnd } = ta;
    if (selectionStart !== selectionEnd) return; // let default replace a selection

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    const line = value.slice(lineStart, selectionStart);
    const m = line.match(/^(\s*)([-*]|\d+\.)(\s+)(.*)$/);
    if (!m) return;

    const [, indent, marker, gap, rest] = m;
    e.preventDefault();

    // Empty item -> drop the marker, turning this into a blank line (exit list).
    if (rest.trim() === '') {
      ta.setRangeText('', lineStart, selectionStart, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    const nextMarker = /^\d+\.$/.test(marker) ? `${parseInt(marker, 10) + 1}.` : marker;
    ta.setRangeText(`\n${indent}${nextMarker}${gap}`, selectionStart, selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

// ---- Markdown formatting toolbar ----------------------------------------

const fire = (ta) => ta.dispatchEvent(new Event('input', { bubbles: true }));

// Wrap the selection (or a placeholder) in a token, e.g. ** or *.
function surround(ta, token, placeholder) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const inner = e > s ? value.slice(s, e) : placeholder;
  ta.focus();
  ta.setRangeText(token + inner + token, s, e, 'end');
  ta.selectionStart = s + token.length;
  ta.selectionEnd = s + token.length + inner.length;
  fire(ta);
}

// Toggle a per-line prefix (bullets, headings) across the selected lines.
function toggleLinePrefix(ta, strip, add) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const from = value.lastIndexOf('\n', s - 1) + 1;
  let to = value.indexOf('\n', e);
  if (to === -1) to = value.length;
  const lines = value.slice(from, to).split('\n');
  const active = lines.every((l) => l.trim() === '' || strip.test(l));
  const out = lines
    .map((l) => (l.trim() === '' ? l : active ? l.replace(strip, '') : add(l.replace(strip, ''))))
    .join('\n');
  ta.focus();
  ta.setRangeText(out, from, to, 'select');
  fire(ta);
}

// Number the selected lines 1., 2., 3.… (or strip numbering if already numbered).
function numberLines(ta) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const from = value.lastIndexOf('\n', s - 1) + 1;
  let to = value.indexOf('\n', e);
  if (to === -1) to = value.length;
  const lines = value.slice(from, to).split('\n');
  const active = lines.every((l) => l.trim() === '' || /^\s*\d+\.\s+/.test(l));
  let n = 0;
  const out = lines
    .map((l) => {
      if (l.trim() === '') return l;
      const bare = l.replace(/^\s*(?:\d+\.|[-*])\s+/, '');
      return active ? bare : `${++n}. ${bare}`;
    })
    .join('\n');
  ta.focus();
  ta.setRangeText(out, from, to, 'select');
  fire(ta);
}

// Insert a [text](url) link, leaving "url" selected for quick typing.
function insertLink(ta) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const text = e > s ? value.slice(s, e) : 'text';
  ta.focus();
  ta.setRangeText(`[${text}](url)`, s, e, 'end');
  const urlAt = s + 1 + text.length + 2;
  ta.selectionStart = urlAt;
  ta.selectionEnd = urlAt + 3;
  fire(ta);
}

// Build a formatting toolbar bound to a textarea. Buttons act on mousedown with
// preventDefault so the textarea keeps focus + selection (and inline editors,
// which commit on blur, don't close when a button is pressed).
export function buildFormatToolbar(ta) {
  const bar = document.createElement('div');
  bar.className = 'fmt-toolbar';
  const buttons = [
    ['B', 'Bold', 'fmt-b', () => surround(ta, '**', 'bold')],
    ['I', 'Italic', 'fmt-i', () => surround(ta, '*', 'italic')],
    ['H', 'Heading', '', () => toggleLinePrefix(ta, /^#{1,6}\s+/, (l) => `## ${l}`)],
    ['•', 'Bullet list', '', () => toggleLinePrefix(ta, /^(\s*)[-*]\s+/, (l) => `- ${l}`)],
    ['1.', 'Numbered list', '', () => numberLines(ta)],
    ['↗', 'Link', '', () => insertLink(ta)],
  ];
  for (const [label, title, cls, run] of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `fmt-btn ${cls}`.trim();
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('mousedown', (e) => { e.preventDefault(); run(); });
    bar.appendChild(b);
  }
  return bar;
}

// Wrap an already-in-DOM textarea with a toolbar above it.
export function withToolbar(ta) {
  const wrap = document.createElement('div');
  wrap.className = 'fmt-field';
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(buildFormatToolbar(ta));
  wrap.appendChild(ta);
  return wrap;
}
