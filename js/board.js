// Kanban board — one column per stage, drag cards between columns to restage.
// Uses the native HTML5 drag-and-drop API (no library needed).

import { getAll, setStage } from './store.js';
import { STAGES, stageById, priorityById } from './config.js';
import { escapeHtml } from './util.js';

let dragId = null;

export function renderBoard(root) {
  const ideas = getAll();
  const byStage = Object.fromEntries(STAGES.map((s) => [s.id, []]));
  for (const idea of ideas) (byStage[idea.stage] || byStage.spark).push(idea);

  root.innerHTML = `
    <div class="board">
      ${STAGES.map((stage) => columnHtml(stage, byStage[stage.id])).join('')}
    </div>`;

  wireDnd(root);
}

function columnHtml(stage, items) {
  return `
    <section class="column" data-stage="${stage.id}" style="--accent:${stage.accent}">
      <header class="column-head" title="${escapeHtml(stage.hint)}">
        <span class="col-dot"></span>
        <h2>${stage.label}</h2>
        <span class="count">${items.length}</span>
      </header>
      <div class="column-body" data-dropzone="${stage.id}">
        ${items.length ? items.map(cardHtml).join('') : `<p class="col-empty">${escapeHtml(stage.hint)}</p>`}
      </div>
    </section>`;
}

// Stable per-idea hash so a card's rotation + "held down by" decoration stay
// put across re-renders (an id never changes) instead of jittering each render.
function seed(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const CLIP_SVG = `<svg class="clip-svg" viewBox="0 0 26 54" width="16" height="33" aria-hidden="true">
  <path d="M18 14 V40 a6.5 6.5 0 0 1 -13 0 V11 a9.5 9.5 0 0 1 19 0 V38 a4.5 4.5 0 0 1 -9 0 V16"
    fill="none" stroke="var(--clip)" stroke-width="2.6" stroke-linecap="round"/></svg>`;

function decoHtml(kind) {
  if (kind === 'clip') return `<span class="deco clip">${CLIP_SVG}</span>`;
  if (kind === 'pin') return `<span class="deco pin"></span>`;
  return `<span class="deco tape"></span>`;
}

export function cardHtml(idea) {
  const prio = priorityById(idea.priority);
  const stage = stageById(idea.stage);
  const s = seed(idea.id);
  const rot = (((s % 7) - 3) * 0.55).toFixed(2);   // ~ -1.65°..1.65°
  const drot = ((((s >> 3) % 9) - 4) * 1.4).toFixed(2);
  const deco = ['tape', 'tape', 'clip', 'tape', 'pin'][s % 5];

  const tags = idea.tags.slice(0, 4).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const more = idea.tags.length > 4 ? `<span class="tag muted">+${idea.tags.length - 4}</span>` : '';
  const noteCount = idea.notes.length
    ? `<span class="card-meta" title="${idea.notes.length} note(s)">✎ ${idea.notes.length}</span>` : '';
  const linkCount = idea.links.length
    ? `<span class="card-meta" title="${idea.links.length} link(s)">↗ ${idea.links.length}</span>` : '';
  const star = idea.priority === 'high' ? '<span class="prio-star">★</span>' : '';

  return `
    <article class="card deco-${deco}" draggable="true" data-id="${idea.id}"
      style="--prio:${prio.accent}; --accent:${stage.accent}; --rot:${rot}deg; --drot:${drot}deg">
      ${decoHtml(deco)}
      <h3 class="card-title">${escapeHtml(idea.title)}</h3>
      ${tags || more ? `<div class="tags">${tags}${more}</div>` : ''}
      <div class="card-foot">
        <span class="prio-chip" style="--prio:${prio.accent}">${prio.label}${star}</span>
        ${noteCount}${linkCount}
      </div>
    </article>`;
}

function wireDnd(root) {
  root.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('click', () => {
      location.hash = `#/idea/${card.dataset.id}`;
    });
    card.addEventListener('dragstart', (e) => {
      dragId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragId);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dragId = null;
      root.querySelectorAll('.column-body.over').forEach((z) => z.classList.remove('over'));
    });
  });

  root.querySelectorAll('.column-body').forEach((zone) => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zone.classList.add('over');
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('over');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('over');
      const id = dragId || e.dataTransfer.getData('text/plain');
      const stage = zone.dataset.dropzone;
      if (id && stage) setStage(id, stage); // store change triggers re-render
    });
  });
}
