// Tiny transient toasts — quiet, on-brand feedback that replaces window.alert().

let host = null;

export function toast(message, kind = 'success') {
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const dismiss = () => {
    el.classList.remove('show');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  };
  const timer = setTimeout(dismiss, 2600);
  el.addEventListener('click', () => { clearTimeout(timer); dismiss(); });
}
