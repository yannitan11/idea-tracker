// Entry point: nav, hash router, view switching, search, stats, dark mode, export.

import { subscribe, getAll } from './store.js';
import { openCapture } from './capture.js';
import { renderBoard } from './board.js';
import { renderList, setSearch, getSearch } from './list.js';
import { renderDetail } from './detail.js';
import { STAGES } from './config.js';
import { withinDays, debounce } from './util.js';
import { exportJSON, exportMarkdown, importJSONFile } from './export.js';

const view = document.querySelector('#view');
const searchInput = document.querySelector('#global-search');
const statsEl = document.querySelector('#stats');
const tabs = document.querySelectorAll('.tab');

// ---- Routing --------------------------------------------------------------

function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  if (hash.startsWith('idea/')) return { name: 'detail', id: hash.slice(5) };
  if (hash === 'list') return { name: 'list' };
  return { name: 'board' };
}

function render() {
  const route = currentRoute();
  document.body.dataset.route = route.name;

  tabs.forEach((t) => t.classList.toggle('active', t.dataset.route === route.name));

  if (route.name === 'detail') renderDetail(view, route.id);
  else if (route.name === 'list') renderList(view);
  else renderBoard(view);

  renderStats();
}

function renderStats() {
  const all = getAll();
  const week = all.filter((i) => withinDays(i.createdAt, 7)).length;
  statsEl.textContent = all.length
    ? `${all.length} idea${all.length === 1 ? '' : 's'} · ${week} this week`
    : '';
}

// ---- Wiring ---------------------------------------------------------------

// After creating, just close the modal — the new card appears in the current
// view (board/list) via the store subscription; no jump to the detail page.
document.querySelector('#new-idea').addEventListener('click', () => openCapture());

tabs.forEach((tab) => tab.addEventListener('click', () => { location.hash = `#/${tab.dataset.route}`; }));

const runSearch = debounce((q) => {
  setSearch(q);
  if (currentRoute().name !== 'list') location.hash = '#/list';
  else renderList(view);
}, 180);
searchInput.addEventListener('input', (e) => runSearch(e.target.value));
searchInput.value = getSearch();

// Dark mode -----------------------------------------------------------------
const THEME_KEY = 'design-idea-tracker:theme';
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  document.querySelector('#theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}
const savedTheme = localStorage.getItem(THEME_KEY)
  || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
document.querySelector('#theme-toggle').addEventListener('click', () =>
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

// Export / import -----------------------------------------------------------
document.querySelector('#export-json').addEventListener('click', (e) => { e.preventDefault(); exportJSON(); closeMenu(); });
document.querySelector('#export-md').addEventListener('click', (e) => { e.preventDefault(); exportMarkdown(); closeMenu(); });
document.querySelector('#import-json').addEventListener('click', (e) => {
  e.preventDefault();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    if (input.files[0]) importJSONFile(input.files[0]).catch((err) => alert('Import failed: ' + err.message));
  });
  input.click();
  closeMenu();
});
function closeMenu() { const d = document.querySelector('#menu'); if (d) d.open = false; }

// Keyboard shortcuts --------------------------------------------------------
const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
document.addEventListener('keydown', (e) => {
  if (isTyping(document.activeElement)) return;
  if (e.key === 'n') { e.preventDefault(); openCapture(); }
  else if (e.key === '/') { e.preventDefault(); searchInput.focus(); }
  else if (e.key === 'b') { location.hash = '#/board'; }
  else if (e.key === 'l') { location.hash = '#/list'; }
});

// ---- Boot -----------------------------------------------------------------

window.addEventListener('hashchange', render);
subscribe(render);
render();
