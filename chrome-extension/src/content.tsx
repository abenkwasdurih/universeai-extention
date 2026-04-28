import { initAntiF12 } from './anti-f12';

// 1. Initialize Anti-F12 protections immediately on page load
initAntiF12();

// ============================================================
// FLOATING SHORTCUT DOCK (Injected into managed web pages)
// Dark pill-shaped dock with category icons.
// Tap a category → sub-menu shows available servers.
// Max 4 icons + 1 "more" icon if categories > 4.
// ============================================================
function injectFloatingDock() {
  const hostname = window.location.hostname;
  const isManagedSite =
    hostname.includes('grok.com') ||
    hostname.includes('labs.google');

  if (!isManagedSite) return;

  chrome.storage.local.get(['uai_user_email', 'uai_user_token'], (result) => {
    if (!result.uai_user_email || !result.uai_user_token) return;

    chrome.runtime.sendMessage({ type: 'GET_SESSIONS_LIST' }, (response: any) => {
      if (!response || !response.success || !response.data) return;

      const sessions = response.data.sessions || response.data || [];
      const categories = response.data.categories || [];
      if (sessions.length === 0 && categories.length === 0) return;

      buildDock(sessions, categories);
    });
  });
}

function buildDock(
  sessions: { id: number; category: string; siteName: string; domain: string }[],
  categories: { id: number; name: string; iconUrl: string | null }[]
) {
  if (document.getElementById('uai-dock-host')) return;

  const host = document.createElement('div');
  host.id = 'uai-dock-host';
  host.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:100%!important;height:0!important;z-index:2147483647!important;pointer-events:none!important;';

  const shadow = host.attachShadow({ mode: 'closed' });

  // Group sessions by category
  const grouped: Record<string, typeof sessions> = {};
  sessions.forEach((s) => {
    const cat = s.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });

  // Determine visible categories (max 4) and overflow
  const allCatNames = categories.length > 0
    ? categories.map(c => c.name)
    : Object.keys(grouped);

  const visibleCats = allCatNames.slice(0, 4);
  const overflowCats = allCatNames.slice(4);
  const hasOverflow = overflowCats.length > 0;

  // Helpers
  const getCatIcon = (name: string) => {
    const cat = categories.find(c => c.name === name);
    return cat?.iconUrl || null;
  };

  const currentDomain = window.location.hostname;
  const isSessionActive = (s: { domain: string }) => {
    const d = s.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    return currentDomain.includes(d) || d.includes(currentDomain);
  };

  // Build category icon HTML
  const buildCatIconHtml = (name: string, index: number) => {
    const iconUrl = getCatIcon(name);
    const catSessions = grouped[name] || [];
    const isActive = catSessions.some(isSessionActive);

    if (iconUrl) {
      return `
        <button class="dock-btn${isActive ? ' active' : ''}" data-cat="${name}" data-idx="${index}" title="${name}">
          <img src="${iconUrl}" class="dock-icon-img" alt="${name}" />
          ${isActive ? '<span class="active-dot"></span>' : ''}
          <span class="dock-label">${name}</span>
        </button>`;
    }
    // Fallback: letter icon
    return `
      <button class="dock-btn${isActive ? ' active' : ''}" data-cat="${name}" data-idx="${index}" title="${name}">
        <span class="dock-icon-letter">${name.charAt(0).toUpperCase()}</span>
        ${isActive ? '<span class="active-dot"></span>' : ''}
        <span class="dock-label">${name}</span>
      </button>`;
  };

  let dockIconsHtml = visibleCats.map((c, i) => buildCatIconHtml(c, i)).join('');

  // "More" button if overflow
  if (hasOverflow) {
    dockIconsHtml += `
      <button class="dock-btn" data-cat="__more__" title="More">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:rgba(255,255,255,0.85);">
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>`;
  }

  // Build submenu HTML for each category (simple grid: icon + name)
  const buildSubmenuHtml = (catName: string) => {
    const catSessions = grouped[catName] || [];
    if (catSessions.length === 0) {
      return `<div class="submenu-empty">No servers</div>`;
    }
    const cards = catSessions.map(s => {
      const active = isSessionActive(s);
      return `
        <button class="sg-card${active ? ' sg-active' : ''}" data-sid="${s.id}" data-domain="${s.domain}" ${active ? 'disabled' : ''}>
          <div class="sg-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
          </div>
          <span class="sg-name">${s.siteName}</span>
          ${active ? '<span class="sg-dot"></span>' : ''}
        </button>`;
    }).join('');
    return `<div class="sg-grid">${cards}</div>`;
  };

  // Build "More" submenu (overflow categories list)
  const buildMoreSubmenuHtml = () => {
    return overflowCats.map(catName => {
      const iconUrl = getCatIcon(catName);
      const iconHtml = iconUrl
        ? `<img src="${iconUrl}" style="width:20px;height:20px;border-radius:4px;object-fit:contain;" />`
        : `<span class="more-letter">${catName.charAt(0).toUpperCase()}</span>`;
      return `
        <button class="submenu-item more-cat-btn" data-expand-cat="${catName}">
          ${iconHtml}
          <span class="submenu-name" style="flex:1;">${catName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="submenu-arrow"><path d="M9 18l6-6-6-6"/></svg>
        </button>`;
    }).join('');
  };

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; margin: 0; padding: 0; }

      .dock {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 6px 5px 6px;
        background: linear-gradient(145deg, #1e1b3a, #2d2854);
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow:
          0 4px 20px rgba(0,0,0,0.3),
          0 1px 4px rgba(0,0,0,0.15),
          inset 0 1px 0 rgba(255,255,255,0.06);
        pointer-events: auto;
        animation: dock-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        cursor: grab;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .dock.dragging {
        cursor: grabbing;
        opacity: 0.92;
        transition: none !important;
      }
      @keyframes dock-in {
        from { opacity: 0; transform: translateX(-50%) translateY(-40px) scale(0.95); }
        to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
      }

      .dock-brand {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        object-fit: contain;
        flex-shrink: 0;
        pointer-events: none;
        filter: drop-shadow(0 1px 3px rgba(0,0,0,0.3));
      }

      .dock-divider {
        width: 1px;
        height: 22px;
        background: rgba(255,255,255,0.12);
        flex-shrink: 0;
        margin: 0 3px;
      }

      .dock-btn {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        border: none;
        background: rgba(255,255,255,0.06);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        transition: background 0.2s, transform 0.15s;
        pointer-events: auto;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        flex-direction: column;
        gap: 1px;
      }
      .dock-btn:active {
        transform: scale(0.88);
        background: rgba(255,255,255,0.12);
      }
      .dock-btn.active {
        background: rgba(99, 102, 241, 0.9);
        box-shadow: 0 1px 8px rgba(99,102,241,0.35);
      }
      .dock-btn.selected {
        background: rgba(255,255,255,0.15);
        transform: scale(1.06);
      }

      .dock-icon-img {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        object-fit: contain;
        pointer-events: none;
      }
      .dock-icon-letter {
        font-size: 12px;
        font-weight: 800;
        color: rgba(255,255,255,0.85);
        pointer-events: none;
      }
      .dock-label {
        font-size: 7px;
        font-weight: 600;
        color: rgba(255,255,255,0.5);
        pointer-events: none;
        max-width: 34px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1;
      }
      .dock-btn.active .dock-label {
        color: rgba(255,255,255,0.9);
      }

      .active-dot {
        position: absolute;
        bottom: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #67e8f9;
        box-shadow: 0 0 4px #67e8f9;
      }

      /* ===== SUBMENU ===== */
      .submenu-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        pointer-events: auto;
      }
      .submenu-backdrop.open {
        display: block;
      }

      .submenu {
        display: none;
        position: fixed;
        top: 56px;
        left: 50%;
        transform: translateX(-50%) translateY(-8px);
        opacity: 0;
        width: auto;
        min-width: 120px;
        max-width: 280px;
        background: rgba(30, 27, 58, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.15);
        padding: 10px;
        z-index: 2147483647;
        pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        transition: opacity 0.2s, transform 0.2s;
      }
      .submenu.open {
        display: block;
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      .submenu-header {
        padding: 2px 4px 8px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: rgba(255,255,255,0.35);
        text-align: center;
      }

      /* Server Grid */
      .sg-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
      }

      .sg-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 10px 6px;
        border-radius: 10px;
        border: none;
        background: rgba(255,255,255,0.05);
        color: #fff;
        cursor: pointer;
        transition: background 0.15s, transform 0.1s;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        font-family: inherit;
        position: relative;
        min-width: 70px;
      }
      .sg-card:active {
        transform: scale(0.92);
        background: rgba(255,255,255,0.12);
      }
      .sg-card.sg-active {
        background: rgba(99, 102, 241, 0.2);
        cursor: default;
      }
      .sg-card[disabled] {
        cursor: default;
      }

      .sg-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255,255,255,0.55);
      }
      .sg-active .sg-icon {
        background: rgba(99,102,241,0.3);
        color: #a5b4fc;
      }

      .sg-name {
        font-size: 10px;
        font-weight: 600;
        color: rgba(255,255,255,0.8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 64px;
        text-align: center;
      }

      .sg-dot {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #67e8f9;
        box-shadow: 0 0 4px #67e8f9;
      }

      .submenu-empty {
        padding: 16px;
        text-align: center;
        color: rgba(255,255,255,0.3);
        font-size: 12px;
      }

      /* More menu items (list style) */
      .submenu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px;
        border-radius: 10px;
        border: none;
        background: transparent;
        color: #fff;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
        -webkit-tap-highlight-color: transparent;
        outline: none;
        font-family: inherit;
      }
      .submenu-item:active {
        background: rgba(255,255,255,0.08);
      }
      .submenu-name {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
      }
      .submenu-arrow {
        color: rgba(255,255,255,0.3);
        flex-shrink: 0;
      }

      .more-letter {
        width: 20px;
        height: 20px;
        border-radius: 5px;
        background: rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: rgba(255,255,255,0.7);
      }

      .submenu-back {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 8px 10px;
        border: none;
        background: transparent;
        color: rgba(255,255,255,0.5);
        cursor: pointer;
        font-size: 11px;
        font-weight: 600;
        border-radius: 8px;
        font-family: inherit;
        -webkit-tap-highlight-color: transparent;
      }
      .submenu-back:active {
        background: rgba(255,255,255,0.05);
      }

      .submenu-divider {
        height: 1px;
        background: rgba(255,255,255,0.06);
        margin: 4px 6px;
      }
    </style>

    <!-- Backdrop to close submenu when tapping outside -->
    <div class="submenu-backdrop" id="backdrop"></div>

    <!-- Submenu panel -->
    <div class="submenu" id="submenu">
      <div id="submenu-content"></div>
    </div>

    <!-- The Dock -->
    <div class="dock" id="dock">
      <img class="dock-brand" src="${chrome.runtime.getURL('icon.png')}" alt="UAI" />
      <div class="dock-divider"></div>
      ${dockIconsHtml}
    </div>
  `;

  document.documentElement.appendChild(host);

  // ===== INTERACTION LOGIC =====
  const dock = shadow.getElementById('dock')!;
  const submenu = shadow.getElementById('submenu')!;
  const submenuContent = shadow.getElementById('submenu-content')!;
  const backdrop = shadow.getElementById('backdrop')!;

  let openCat: string | null = null;

  const closeSubmenu = () => {
    submenu.classList.remove('open');
    backdrop.classList.remove('open');
    // Deselect all
    dock.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('selected'));
    openCat = null;
  };

  const openSubmenuFor = (catName: string, btn: HTMLElement) => {
    if (openCat === catName) { closeSubmenu(); return; }

    // Highlight selected btn
    dock.querySelectorAll('.dock-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');

    openCat = catName;

    if (catName === '__more__') {
      submenuContent.innerHTML = `
        <div class="submenu-header">All Categories</div>
        ${buildMoreSubmenuHtml()}
      `;
    } else {
      submenuContent.innerHTML = `
        <div class="submenu-header">${catName}</div>
        ${buildSubmenuHtml(catName)}
      `;
    }

    submenu.classList.add('open');
    backdrop.classList.add('open');
  };

  // Helper: sync and navigate to a session
  const syncAndNavigate = (sessionId: number, domain: string) => {
    chrome.runtime.sendMessage({ type: 'SYNC_SESSION', id: sessionId }, (response: any) => {
      if (response && response.success) {
        let url = response.targetDomain || domain;
        if (!url.startsWith('http')) {
          url = `https://${url.startsWith('.') ? url.substring(1) : url}`;
        }
        window.location.href = url;
      } else {
        alert('Failed to switch: ' + (response?.error || 'Unknown error'));
      }
    });
  };

  // Dock button clicks
  dock.addEventListener('click', (e: Event) => {
    const btn = (e.target as HTMLElement).closest('.dock-btn') as HTMLElement | null;
    if (!btn) return;
    const cat = btn.getAttribute('data-cat');
    if (!cat) return;

    // If category has only 1 server → navigate directly
    if (cat !== '__more__') {
      const catSessions = grouped[cat] || [];
      if (catSessions.length === 1) {
        const s = catSessions[0];
        if (!isSessionActive(s)) {
          btn.style.opacity = '0.5';
          syncAndNavigate(s.id, s.domain);
        }
        return;
      }
    }

    // Otherwise open submenu
    openSubmenuFor(cat, btn);
  });

  // Submenu clicks (server cards & more-cat-btn)
  submenuContent.addEventListener('click', (e: Event) => {
    // Handle "expand category" in More menu
    const moreCatBtn = (e.target as HTMLElement).closest('.more-cat-btn') as HTMLElement | null;
    if (moreCatBtn) {
      const catName = moreCatBtn.getAttribute('data-expand-cat')!;
      // If this overflow category has 1 server, navigate directly
      const catSessions = grouped[catName] || [];
      if (catSessions.length === 1 && !isSessionActive(catSessions[0])) {
        closeSubmenu();
        syncAndNavigate(catSessions[0].id, catSessions[0].domain);
        return;
      }
      submenuContent.innerHTML = `
        <button class="submenu-back" id="back-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back
        </button>
        <div class="submenu-divider"></div>
        <div class="submenu-header">${catName}</div>
        ${buildSubmenuHtml(catName)}
      `;
      const backBtn = submenuContent.querySelector('#back-btn');
      if (backBtn) {
        backBtn.addEventListener('click', () => {
          submenuContent.innerHTML = `
            <div class="submenu-header">All Categories</div>
            ${buildMoreSubmenuHtml()}
          `;
        });
      }
      return;
    }

    // Handle server card click
    const serverBtn = (e.target as HTMLElement).closest('.sg-card[data-sid]') as HTMLElement | null;
    if (!serverBtn || serverBtn.hasAttribute('disabled')) return;

    const sessionId = parseInt(serverBtn.getAttribute('data-sid') || '0');
    const domain = serverBtn.getAttribute('data-domain') || '';

    serverBtn.style.opacity = '0.5';
    serverBtn.style.pointerEvents = 'none';
    syncAndNavigate(sessionId, domain);
  });

  // Close on backdrop tap
  backdrop.addEventListener('click', closeSubmenu);

  // ===== DRAG / MOVE LOGIC =====
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  const startDrag = (clientX: number, clientY: number) => {
    isDragging = true;
    hasMoved = false;
    const rect = dock.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;
    startX = clientX;
    startY = clientY;
    dock.classList.add('dragging');
    // Remove initial centering transform
    dock.style.transform = 'none';
    dock.style.left = rect.left + 'px';
    dock.style.top = rect.top + 'px';
    closeSubmenu();
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = Math.abs(clientX - startX);
    const dy = Math.abs(clientY - startY);
    if (dx > 4 || dy > 4) hasMoved = true;
    if (!hasMoved) return;

    let newX = clientX - offsetX;
    let newY = clientY - offsetY;

    // Clamp within viewport
    const dw = dock.offsetWidth;
    const dh = dock.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    newX = Math.max(0, Math.min(newX, vw - dw));
    newY = Math.max(0, Math.min(newY, vh - dh));

    dock.style.left = newX + 'px';
    dock.style.top = newY + 'px';
  };

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    dock.classList.remove('dragging');
    // Save position
    try {
      chrome.storage.local.set({
        uai_dock_x: dock.style.left,
        uai_dock_y: dock.style.top,
      });
    } catch (e) {}
  };

  // Mouse events
  dock.addEventListener('mousedown', (e: Event) => {
    const me = e as MouseEvent;
    // Don't start drag on button clicks
    if ((me.target as HTMLElement).closest('.dock-btn')) return;
    me.preventDefault();
    startDrag(me.clientX, me.clientY);
  });
  document.addEventListener('mousemove', (e: MouseEvent) => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', () => endDrag());

  // Touch events
  dock.addEventListener('touchstart', (e: Event) => {
    const te = e as TouchEvent;
    if ((te.target as HTMLElement).closest('.dock-btn')) return;
    const touch = te.touches[0];
    startDrag(touch.clientX, touch.clientY);
  }, { passive: true });
  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (isDragging && hasMoved) e.preventDefault();
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  }, { passive: false });
  document.addEventListener('touchend', () => endDrag());

  // Restore saved position
  try {
    chrome.storage.local.get(['uai_dock_x', 'uai_dock_y'], (result) => {
      if (result.uai_dock_x && result.uai_dock_y) {
        dock.style.transform = 'none';
        dock.style.left = result.uai_dock_x as string;
        dock.style.top = result.uai_dock_y as string;
        dock.style.animation = 'none';
      }
    });
  } catch (e) {}
}

// Inject after page settles
setTimeout(injectFloatingDock, 1000);


// ============================================================
// 2. Custom Overlay for Google Labs (Flow)
// ============================================================
if (window.location.hostname.includes('labs.google')) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '64px';
  overlay.style.backgroundColor = '#000000';
  overlay.style.zIndex = '9999998';
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

  setInterval(() => {
    const url = window.location.href.toLowerCase();
    if (url.includes('logout') || url.includes('signout')) {
      window.location.replace('https://labs.google/fx/tools/flow');
    }
  }, 500);
}

// ============================================================
// 3. Protections for Grok.com
// ============================================================
if (window.location.hostname.includes('grok.com')) {
  const style = document.createElement('style');
  style.innerHTML = `
    a[href*="/settings"], 
    a[href*="/profile"], 
    a[href*="logout"],
    [data-testid*="profile" i],
    [data-testid*="settings" i],
    [data-testid*="logout" i],
    [aria-label*="Profile" i],
    [aria-label*="Account" i],
    [aria-label*="Settings" i],
    [class*="avatar" i],
    [class*="profile-menu" i] {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
    div.flex.items-center.gap-3.p-2,
    button:has(img[alt*="profile" i]),
    button:has(img[alt*="avatar" i]),
    button:has(img[src*="profile_images"]),
    button:has(img[src*="twimg.com"]),
    button:has(img[class*="rounded-full"]),
    div:has(> img[src*="profile_images"]),
    div:has(> img[src*="twimg.com"]),
    div[role="button"]:has(img[alt*="profile" i]),
    img[src*="twimg.com"],
    img[alt*="profile" i],
    img[alt*="avatar" i] {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      opacity: 0 !important;
    }
  `;
  document.head.appendChild(style);

  const destroyProfile = () => {
    try {
      document.querySelectorAll('[style*="url("]').forEach((el: any) => {
        const bg = el.style.backgroundImage || el.style.background || '';
        if (bg.includes('twimg.com') || bg.includes('profile') || bg.includes('avatar')) {
          el.style.display = 'none';
          const p = el.closest('button, a, [role="button"], [role="link"], [role="menuitem"], .flex');
          if (p) (p as HTMLElement).style.display = 'none';
        }
      });
      document.querySelectorAll('img[src*="twimg"], img[src*="profile"], img[src*="avatar"]').forEach((el: any) => {
        el.style.display = 'none';
        const p = el.closest('button, a, [role="button"], [role="link"], [role="menuitem"], .flex');
        if (p) (p as HTMLElement).style.display = 'none';
      });
      document.querySelectorAll('a, button, [role="button"], [role="menuitem"]').forEach((el: any) => {
        const text = (el.textContent || '').trim().toLowerCase();
        if (['settings','pengaturan','setelan','logout','keluar','sign out','profile','profil','account','akun'].includes(text)) {
          el.style.display = 'none';
        }
      });
    } catch (e) {}
  };

  destroyProfile();
  const observer = new MutationObserver(() => destroyProfile());
  observer.observe(document.body, { childList: true, subtree: true });

  setInterval(() => {
    const url = window.location.href.toLowerCase();
    if (url.includes('/logout') || url.includes('/settings') || url.includes('/profile') || url.includes('/account')) {
      window.location.replace('https://grok.com/');
    }
  }, 500);
}
