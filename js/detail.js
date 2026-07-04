// Idea detail view — all fields, inline editing, notes log, links, delete.

import { getById, updateIdea, deleteIdea, addNote, deleteNote } from './store.js';
import { STAGES, PRIORITIES, stageById, priorityById } from './config.js';
import {
  escapeHtml, renderMarkdown, formatDateTime, formatDate,
  parseTags, parseLinks, isValidUrl, attachListBehavior,
  buildFormatToolbar, withToolbar,
} from './util.js';
import { toast } from './toast.js';

export function renderDetail(root, id) {
  const idea = getById(id);
  if (!idea) {
    root.innerHTML = `<div class="empty-state">That idea doesn’t exist. <a href="#/board">Back to board</a></div>`;
    return;
  }

  const stage = stageById(idea.stage);
  const prio = priorityById(idea.priority);

  root.innerHTML = `
    <div class="detail-backdrop">
    <article class="detail">
      <a class="link-btn back" href="#/board">← Back to board</a>

      <div class="detail-headrow">
        <h1 class="detail-title editable" data-edit="title" tabindex="0" title="Click to edit">${escapeHtml(idea.title)}</h1>
        <button class="btn danger ghost" data-delete>Delete</button>
      </div>

      <div class="detail-controls">
        <label class="ctrl">
          <span>Stage</span>
          <select class="input" data-field="stage" style="--accent:${stage.accent}">
            ${STAGES.map((s) => `<option value="${s.id}"${s.id === idea.stage ? ' selected' : ''}>${s.label}</option>`).join('')}
          </select>
        </label>
        <label class="ctrl">
          <span>Priority</span>
          <select class="input" data-field="priority" style="--prio:${prio.accent}">
            ${PRIORITIES.map((p) => `<option value="${p.id}"${p.id === idea.priority ? ' selected' : ''}>${p.label}</option>`).join('')}
          </select>
        </label>
        <span class="detail-dates">
          Created ${formatDate(idea.createdAt)} · Updated ${formatDateTime(idea.updatedAt)}
        </span>
      </div>

      <section class="detail-section">
        <h2>Description</h2>
        <div class="desc editable" data-edit="description" tabindex="0" title="Click to edit">
          ${idea.description ? renderMarkdown(idea.description) : '<p class="muted">No description yet — click to add one. Markdown supported.</p>'}
        </div>
      </section>

      <section class="detail-section">
        <h2>Tags</h2>
        <div class="tags-edit editable" data-edit="tags" tabindex="0" title="Click to edit">
          ${idea.tags.length ? idea.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')
            : '<span class="muted">No tags — click to add.</span>'}
        </div>
      </section>

      <section class="detail-section">
        <h2>Links</h2>
        <ul class="links-list">
          ${idea.links.length ? idea.links.map((l, i) => linkRow(l, i)).join('')
            : '<li class="muted">No links yet.</li>'}
        </ul>
        <form class="add-link">
          <input class="input" name="url" placeholder="https://…  add a reference" autocomplete="off" />
          <button class="btn ghost" type="submit">Add link</button>
        </form>
      </section>

      <section class="detail-section">
        <h2>Notes <span class="count-inline">${idea.notes.length}</span></h2>
        <form class="add-note">
          <textarea class="input" name="note" rows="2" placeholder="Append a thought… (⌘/Ctrl+Enter)"></textarea>
          <button class="btn primary" type="submit">Add note</button>
        </form>
        <ul class="notes-log">
          ${[...idea.notes].reverse().map(noteRow).join('') || '<li class="muted">No notes yet.</li>'}
        </ul>
      </section>
    </article>
    </div>`;

  wire(root, idea.id);
}

function linkRow(url, i) {
  const safe = escapeHtml(url);
  const label = isValidUrl(url) ? new URL(url).hostname.replace(/^www\./, '') : safe;
  return `<li class="link-row">
    <a href="${safe}" target="_blank" rel="noopener noreferrer" title="${safe}">${label}</a>
    <button class="icon-btn small" data-del-link="${i}" aria-label="Remove link">✕</button>
  </li>`;
}

function noteRow(note) {
  return `<li class="note">
    <div class="note-head">
      <time>${formatDateTime(note.createdAt)}</time>
      <button class="icon-btn small" data-del-note="${note.id}" aria-label="Delete note">✕</button>
    </div>
    <div class="note-body">${renderMarkdown(note.text)}</div>
  </li>`;
}

function wire(root, id) {
  // Click the empty area around the card to dismiss back to the board.
  const backdrop = root.querySelector('.detail-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (!e.target.closest('.detail')) location.hash = '#/board';
  });

  // Stage / priority selects.
  root.querySelectorAll('[data-field]').forEach((sel) => {
    sel.addEventListener('change', () => updateIdea(id, { [sel.dataset.field]: sel.value }));
  });

  // Delete idea.
  root.querySelector('[data-delete]').addEventListener('click', () => {
    if (confirm('Delete this idea? This cannot be undone.')) {
      deleteIdea(id);
      location.hash = '#/board';
      toast('Idea deleted');
    }
  });

  // Inline-editable fields.
  root.querySelectorAll('.editable').forEach((el) => {
    const start = () => beginEdit(el, id);
    el.addEventListener('click', start);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !el.classList.contains('editing')) { e.preventDefault(); start(); }
    });
  });

  // Add link.
  const addLink = root.querySelector('.add-link');
  addLink.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = addLink.querySelector('[name="url"]');
    const url = input.value.trim();
    if (!url) return;
    const idea = getById(id);
    updateIdea(id, { links: [...idea.links, url] });
  });
  root.querySelectorAll('[data-del-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idea = getById(id);
      const links = idea.links.filter((_, i) => i !== Number(btn.dataset.delLink));
      updateIdea(id, { links });
    });
  });

  // Notes.
  const addNoteForm = root.querySelector('.add-note');
  const noteInput = addNoteForm.querySelector('[name="note"]');
  attachListBehavior(noteInput);
  withToolbar(noteInput);
  const submitNote = () => {
    if (noteInput.value.trim()) addNote(id, noteInput.value);
  };
  addNoteForm.addEventListener('submit', (e) => { e.preventDefault(); submitNote(); });
  noteInput.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submitNote(); }
  });
  root.querySelectorAll('[data-del-note]').forEach((btn) => {
    btn.addEventListener('click', () => deleteNote(id, btn.dataset.delNote));
  });
}

// Swap a display element into an editor. Commit on blur / Enter (Esc cancels).
function beginEdit(el, id) {
  if (el.classList.contains('editing')) return;
  const field = el.dataset.edit;
  const idea = getById(id);
  el.classList.add('editing');

  const multiline = field === 'description';
  const editor = document.createElement(multiline ? 'textarea' : 'input');
  editor.className = 'input inline-editor';
  if (multiline) {
    editor.rows = Math.max(4, (idea.description.match(/\n/g) || []).length + 2);
    attachListBehavior(editor);
  }

  editor.value =
    field === 'tags' ? idea.tags.join(', ') :
    field === 'description' ? idea.description :
    idea[field] || '';

  if (multiline) {
    const wrap = document.createElement('div');
    wrap.className = 'fmt-field';
    wrap.appendChild(buildFormatToolbar(editor));
    wrap.appendChild(editor);
    el.replaceChildren(wrap);
  } else {
    el.replaceChildren(editor);
  }
  editor.focus();
  if (!multiline) editor.select();

  let done = false;
  const commit = (save) => {
    if (done) return;
    done = true;
    editor.removeEventListener('blur', onBlur);
    if (save) {
      const v = editor.value;
      if (field === 'tags') updateIdea(id, { tags: parseTags(v) });
      else if (field === 'title') updateIdea(id, { title: v.trim() || idea.title });
      else updateIdea(id, { [field]: v });
    }
    // Re-render happens via store subscription on save; on cancel, redraw locally.
    if (!save) renderDetail(document.querySelector('#view'), id);
  };
  const onBlur = () => commit(true);
  editor.addEventListener('blur', onBlur);
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commit(false); }
    if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(true); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(true); }
  });
}
