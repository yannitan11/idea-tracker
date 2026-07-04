// List / filter / search view. Filter by stage, tag, priority; sort; text search.

import { getAll } from './store.js';
import { STAGES, PRIORITIES, stageById, priorityById } from './config.js';
import { escapeHtml, formatDate } from './util.js';

// Filter state is module-local so it survives re-renders while on this view.
const filters = { stage: '', tag: '', priority: '', sort: 'recent', q: '' };

export function setSearch(q) { filters.q = q; }
export function getSearch() { return filters.q; }

export function renderList(root) {
  const all = getAll();
  const allTags = [...new Set(all.flatMap((i) => i.tags))].sort();

  const filtered = applyFilters(all);

  root.innerHTML = `
    <div class="list-view">
      <div class="filters">
        <select class="input" data-filter="stage">
          <option value="">All stages</option>
          ${STAGES.map((s) => opt(s.id, s.label, filters.stage)).join('')}
        </select>
        <select class="input" data-filter="priority">
          <option value="">All priorities</option>
          ${PRIORITIES.map((p) => opt(p.id, p.label, filters.priority)).join('')}
        </select>
        <select class="input" data-filter="tag">
          <option value="">All tags</option>
          ${allTags.map((t) => opt(t, t, filters.tag)).join('')}
        </select>
        <select class="input" data-filter="sort">
          ${opt('recent', 'Most recent', filters.sort)}
          ${opt('created', 'Newest created', filters.sort)}
          ${opt('priority', 'Priority', filters.sort)}
          ${opt('alpha', 'A–Z', filters.sort)}
        </select>
        ${hasActiveFilters() ? '<button class="link-btn" data-clear>Clear</button>' : ''}
        <span class="list-count">${filtered.length} of ${all.length}</span>
      </div>

      ${filtered.length ? `<ul class="idea-list">${filtered.map(rowHtml).join('')}</ul>`
        : `<div class="empty-state">${all.length ? 'No ideas match these filters.' : 'No ideas yet — hit <kbd>n</kbd> or “+ New idea” to capture your first.'}</div>`}
    </div>`;

  wire(root);
}

function opt(value, label, current) {
  return `<option value="${escapeHtml(value)}"${value === current ? ' selected' : ''}>${escapeHtml(label)}</option>`;
}

function hasActiveFilters() {
  return filters.stage || filters.tag || filters.priority || filters.q;
}

function applyFilters(list) {
  let out = list.filter((i) => {
    if (filters.stage && i.stage !== filters.stage) return false;
    if (filters.priority && i.priority !== filters.priority) return false;
    if (filters.tag && !i.tags.includes(filters.tag)) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      if (!i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const prioRank = { high: 0, medium: 1, low: 2 };
  const sorters = {
    recent: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    priority: (a, b) => (prioRank[a.priority] - prioRank[b.priority]) || b.updatedAt.localeCompare(a.updatedAt),
    alpha: (a, b) => a.title.localeCompare(b.title),
  };
  return out.sort(sorters[filters.sort] || sorters.recent);
}

function rowHtml(idea) {
  const stage = stageById(idea.stage);
  const prio = priorityById(idea.priority);
  const tags = idea.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const snippet = idea.description
    ? escapeHtml(idea.description.replace(/[#*`>-]/g, '').slice(0, 120))
    : '';
  return `
    <li class="idea-row" data-id="${idea.id}" tabindex="0" role="button" aria-label="Open idea: ${escapeHtml(idea.title)}">
      <span class="row-stage" style="--accent:${stage.accent}" title="${escapeHtml(stage.label)}"></span>
      <div class="row-main">
        <div class="row-top">
          <h3>${escapeHtml(idea.title)}</h3>
          <span class="prio-chip" style="--prio:${prio.accent}">${prio.label}</span>
        </div>
        ${snippet ? `<p class="row-snippet">${snippet}${idea.description.length > 120 ? '…' : ''}</p>` : ''}
        <div class="row-meta">
          <span class="stage-chip" style="--accent:${stage.accent}">${stage.label}</span>
          ${tags}
          <span class="row-date">Updated ${formatDate(idea.updatedAt)}</span>
        </div>
      </div>
    </li>`;
}

function wire(root) {
  root.querySelectorAll('[data-filter]').forEach((sel) => {
    sel.addEventListener('change', () => {
      filters[sel.dataset.filter] = sel.value;
      renderList(root);
    });
  });
  const clear = root.querySelector('[data-clear]');
  if (clear) clear.addEventListener('click', () => {
    filters.stage = filters.tag = filters.priority = filters.q = '';
    const search = document.querySelector('#global-search');
    if (search) search.value = '';
    renderList(root);
  });
  root.querySelectorAll('.idea-row').forEach((row) => {
    const open = () => { location.hash = `#/idea/${row.dataset.id}`; };
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}
