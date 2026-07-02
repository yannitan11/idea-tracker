// Export all ideas to JSON or Markdown; import from a JSON file. You own your data.

import { getAll, replaceAll } from './store.js';
import { stageById, priorityById } from './config.js';

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportJSON() {
  download(`design-ideas-${stamp()}.json`, JSON.stringify(getAll(), null, 2), 'application/json');
}

export function exportMarkdown() {
  const ideas = getAll();
  const lines = ['# Design Ideas', '', `_Exported ${new Date().toLocaleString()} · ${ideas.length} ideas_`, ''];
  for (const i of ideas) {
    lines.push(`## ${i.title}`);
    lines.push('');
    lines.push(`- **Stage:** ${stageById(i.stage).label}`);
    lines.push(`- **Priority:** ${priorityById(i.priority).label}`);
    if (i.tags.length) lines.push(`- **Tags:** ${i.tags.join(', ')}`);
    lines.push(`- **Created:** ${new Date(i.createdAt).toLocaleDateString()}`);
    lines.push('');
    if (i.description) { lines.push(i.description, ''); }
    if (i.links.length) {
      lines.push('**Links**', '');
      for (const l of i.links) lines.push(`- ${l}`);
      lines.push('');
    }
    if (i.notes.length) {
      lines.push('**Notes**', '');
      for (const n of i.notes) lines.push(`- _${new Date(n.createdAt).toLocaleString()}_ — ${n.text}`);
      lines.push('');
    }
    lines.push('---', '');
  }
  download(`design-ideas-${stamp()}.md`, lines.join('\n'), 'text/markdown');
}

export function importJSONFile(file) {
  return file.text().then((text) => {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error('Expected a JSON array of ideas.');
    if (!confirm(`Import ${data.length} ideas? This replaces everything currently stored.`)) return;
    replaceAll(data);
  });
}
