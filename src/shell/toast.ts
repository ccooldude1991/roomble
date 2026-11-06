/*
 * Minimal toast notifications. Render <Toast /> once per page to create the root,
 * then call toast('message') from anywhere. Toasts auto-dismiss and stack.
 */
export interface ToastOptions {
  /** Milliseconds before auto-dismiss. */
  duration?: number;
  tone?: 'default' | 'good' | 'warn';
}

const ROOT_ID = 'toast-root';

function ensureRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.className = 'toast-root';
    root.setAttribute('aria-live', 'polite');
    document.body.appendChild(root);
  }
  return root;
}

export function toast(message: string, opts: ToastOptions = {}): void {
  const root = ensureRoot();
  if (!root) return;
  const { duration = 2600, tone = 'default' } = opts;

  const el = document.createElement('div');
  el.className = `toast toast--${tone}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  root.appendChild(el);

  // Trigger the enter transition on the next frame.
  requestAnimationFrame(() => el.classList.add('is-in'));

  const remove = () => {
    el.classList.remove('is-in');
    el.addEventListener('transitionend', () => el.remove(), { once: true });
    // Fallback if transitions are disabled (reduced motion).
    setTimeout(() => el.remove(), 400);
  };
  setTimeout(remove, duration);
}
