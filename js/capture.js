// Quick-add capture modal. Title + description at minimum; everything else
// tucked behind a "More options" toggle so a dump takes < 10 seconds.

import { createIdea } from './store.js';
import { STAGES, PRIORITIES, DEFAULT_STAGE, DEFAULT_PRIORITY } from './config.js';
import { parseTags, parseLinks, attachListBehavior, withToolbar } from './util.js';

let overlay = null;

export function openCapture(onCreated) {
  if (overlay) return;

  overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal capture" role="dialog" aria-modal="true" aria-label="New idea">
      <header class="modal-head">
        <h2>New idea</h2>
        <button class="icon-btn" data-close aria-label="Close">✕</button>
      </header>
      <form class="capture-form">
        <input name="title" class="input title-input" placeholder="Idea title…" autocomplete="off" required />
        <textarea name="description" class="input" rows="4"
          placeholder="Describe it — start a line with “- ” or “1. ” for a list. Markdown supported. (⌘/Ctrl+Enter to save)"></textarea>

        <button type="button" class="link-btn" data-toggle-more>+ More options</button>

        <div class="more-options" hidden>
          <label class="field">
            <span>Tags <em>(comma separated)</em></span>
            <input name="tags" class="input" placeholder="mobile, branding, experiment" autocomplete="off" />
          </label>
          <div class="field-row">
            <label class="field">
              <span>Stage</span>
              <select name="stage" class="input">
                ${STAGES.map((s) => `<option value="${s.id}"${s.id === DEFAULT_STAGE ? ' selected' : ''}>${s.label}</option>`).join('')}
              </select>
            </label>
            <label class="field">
              <span>Priority</span>
              <select name="priority" class="input">
                ${PRIORITIES.map((p) => `<option value="${p.id}"${p.id === DEFAULT_PRIORITY ? ' selected' : ''}>${p.label}</option>`).join('')}
              </select>
            </label>
          </div>
          <label class="field">
            <span>Links <em>(one per line)</em></span>
            <textarea name="links" class="input" rows="2" placeholder="https://…"></textarea>
          </label>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn ghost" data-close>Cancel</button>
          <button type="submit" class="btn primary">Add idea</button>
        </footer>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  document.body.classList.add('modal-open');

  const form = overlay.querySelector('.capture-form');
  const titleInput = form.querySelector('[name="title"]');
  const descInput = form.querySelector('[name="description"]');
  attachListBehavior(descInput);
  withToolbar(descInput);
  titleInput.focus();

  const close = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
  };
  document.addEventListener('keydown', onKey);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target.closest('[data-close]')) close();
  });

  overlay.querySelector('[data-toggle-more]').addEventListener('click', (e) => {
    const box = overlay.querySelector('.more-options');
    box.hidden = !box.hidden;
    e.target.textContent = box.hidden ? '+ More options' : '− Fewer options';
  });

  const submit = () => {
    const data = new FormData(form);
    const title = (data.get('title') || '').trim();
    if (!title) { titleInput.focus(); return; }
    const idea = createIdea({
      title,
      description: (data.get('description') || '').trim(),
      stage: data.get('stage') || DEFAULT_STAGE,
      priority: data.get('priority') || DEFAULT_PRIORITY,
      tags: parseTags(data.get('tags') || ''),
      links: parseLinks(data.get('links') || ''),
    });
    close();
    onCreated?.(idea);
  };

  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
}
