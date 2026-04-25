export function initAntiF12() {
  // 1. Disable Right Click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 2. Disable F12 and specific DevTools shortcuts
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
    }
  });

  // 3. Debugger Loop (Anti-Debugger)
  // Disabled temporarily to prevent blank pages or infinite reloads during development
}
