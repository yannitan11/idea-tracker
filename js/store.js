// Data model + localStorage persistence + a tiny pub/sub so views re-render.

import { uid, nowISO } from './util.js';
import { DEFAULT_STAGE, DEFAULT_PRIORITY, STAGES } from './config.js';

const KEY = 'design-idea-tracker:v1';

let ideas = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalize) : [];
  } catch (e) {
    console.warn('Could not load ideas from localStorage:', e);
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(ideas));
  } catch (e) {
    console.error('Could not save ideas:', e);
  }
}

// Guarantee every idea has all fields, even ones loaded from an older shape.
function normalize(raw = {}) {
  return {
    id: raw.id || uid(),
    title: raw.title || 'Untitled idea',
    description: raw.description || '',
    stage: STAGES.some((s) => s.id === raw.stage) ? raw.stage : DEFAULT_STAGE,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    priority: raw.priority || DEFAULT_PRIORITY,
    links: Array.isArray(raw.links) ? raw.links : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    createdAt: raw.createdAt || nowISO(),
    updatedAt: raw.updatedAt || raw.createdAt || nowISO(),
  };
}

function emit() {
  persist();
  for (const fn of listeners) fn(ideas);
}

// ---- Public API ----------------------------------------------------------

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAll() {
  return ideas.slice();
}

export function getById(id) {
  return ideas.find((i) => i.id === id) || null;
}

export function createIdea(data = {}) {
  const idea = normalize({ ...data, id: uid(), createdAt: nowISO(), updatedAt: nowISO() });
  ideas.unshift(idea);
  emit();
  return idea;
}

export function updateIdea(id, patch = {}) {
  const idx = ideas.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  ideas[idx] = { ...ideas[idx], ...patch, id, updatedAt: nowISO() };
  emit();
  return ideas[idx];
}

export function deleteIdea(id) {
  const before = ideas.length;
  ideas = ideas.filter((i) => i.id !== id);
  if (ideas.length !== before) emit();
}

export function addNote(id, text) {
  const idea = getById(id);
  if (!idea || !text.trim()) return null;
  const note = { id: uid(), text: text.trim(), createdAt: nowISO() };
  return updateIdea(id, { notes: [...idea.notes, note] });
}

export function deleteNote(id, noteId) {
  const idea = getById(id);
  if (!idea) return null;
  return updateIdea(id, { notes: idea.notes.filter((n) => n.id !== noteId) });
}

export function setStage(id, stage) {
  return updateIdea(id, { stage });
}

// Replace the whole dataset (used by import). Returns count.
export function replaceAll(list) {
  ideas = Array.isArray(list) ? list.map(normalize) : [];
  emit();
  return ideas.length;
}
