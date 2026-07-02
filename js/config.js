// Pipeline stages and priorities. Tweak freely — the whole app reads from here.

export const STAGES = [
  { id: 'spark',     label: 'Spark',     hint: 'Raw, unpolished idea just captured.',        accent: '#f59e0b' },
  { id: 'exploring', label: 'Exploring', hint: 'Thinking it through, gathering references.',  accent: '#8b5cf6' },
  { id: 'designing', label: 'Designing', hint: 'Actively making / prototyping.',              accent: '#3b82f6' },
  { id: 'review',    label: 'Review',    hint: 'Done enough to evaluate — worth shipping?',   accent: '#14b8a6' },
  { id: 'shipped',   label: 'Shipped',   hint: 'Done and out in the world.',                  accent: '#22c55e' },
  { id: 'parked',    label: 'Parked',    hint: 'Set aside for now — not dead, just paused.',  accent: '#94a3b8' },
];

export const PRIORITIES = [
  { id: 'low',    label: 'Low',    accent: '#94a3b8' },
  { id: 'medium', label: 'Medium', accent: '#f59e0b' },
  { id: 'high',   label: 'High',   accent: '#ef4444' },
];

export const DEFAULT_STAGE = 'spark';
export const DEFAULT_PRIORITY = 'medium';

const _stageMap = Object.fromEntries(STAGES.map((s) => [s.id, s]));
const _prioMap = Object.fromEntries(PRIORITIES.map((p) => [p.id, p]));

export const stageById = (id) => _stageMap[id] || _stageMap[DEFAULT_STAGE];
export const priorityById = (id) => _prioMap[id] || _prioMap[DEFAULT_PRIORITY];
