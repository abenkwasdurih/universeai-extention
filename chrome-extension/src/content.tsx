import { initAntiF12 } from './anti-f12';

// 1. Initialize Anti-F12 protections immediately on page load
initAntiF12();

// 2. Custom Overlay for Google Labs (Flow)
if (window.location.hostname.includes('labs.google')) {
  // Inject a custom header to cover the native header
  // Native header height is typically around 64px
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '64px'; // Sesuaikan tinggi header jika perlu
  overlay.style.backgroundColor = '#000000'; // Warna gelap menyesuaikan tema Google Flow
  overlay.style.zIndex = '9999999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.borderBottom = '1px solid #333';
  overlay.style.color = '#ffffff';
  overlay.style.fontFamily = 'system-ui, sans-serif';
  overlay.style.fontSize = '16px';
  overlay.style.fontWeight = '600';
  overlay.style.letterSpacing = '1px';
  
  overlay.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
        <line x1="6" y1="6" x2="6.01" y2="6"></line>
        <line x1="6" y1="18" x2="6.01" y2="18"></line>
      </svg>
      <span>UniverseAI Secure Workspace</span>
    </div>
  `;
  
  document.documentElement.appendChild(overlay);
}
