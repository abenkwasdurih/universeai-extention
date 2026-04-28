import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const colors = {
  bg: '#f8f9fa',
  white: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  accent: '#6366f1',
  accentDark: '#4f46e5',
  accentLight: '#eef2ff',
  accentGlow: 'rgba(99, 102, 241, 0.15)',
  danger: '#ef4444',
  dangerBg: '#fef2f2',
};

function Popup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [availableSites, setAvailableSites] = useState<{id: number, category: string, siteName: string, domain: string}[]>([]);
  const [categoriesData, setCategoriesData] = useState<{id: number, name: string, iconUrl: string | null}[]>([]);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => {
    chrome.storage.local.get(['uai_user_email'], (result) => {
      if (result.uai_user_email) {
        setUser({ email: result.uai_user_email as string });
        fetchSites();
      }
    });
  }, []);

  const fetchSites = () => {
    chrome.runtime.sendMessage({ type: 'GET_SESSIONS_LIST' }, (response: any) => {
      if (response && response.success && response.data) {
        if (response.data.sessions && response.data.categories) {
          setAvailableSites(response.data.sessions);
          setCategoriesData(response.data.categories);
        } else if (Array.isArray(response.data)) {
          setAvailableSites(response.data);
          setCategoriesData([]);
        }
      }
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://universeai-extention.vercel.app/api/extension/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await chrome.storage.local.set({ uai_user_token: data.token, uai_user_email: data.email });
        setUser({ email: data.email });
        fetchSites();
      } else {
        setError(data.error || 'Failed to login');
      }
    } catch (err) {
      setError('Connection error. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (availableSites.length > 0) {
      chrome.runtime.sendMessage({ type: 'CLEAR_COOKIES', sites: availableSites });
    }
    await chrome.storage.local.remove(['uai_user_token', 'uai_user_email']);
    setUser(null);
    setEmail('');
    setAvailableSites([]);
    setCategoriesData([]);
  };

  const handleSiteClick = (id: number, fallbackDomain: string) => {
    setSyncingId(id);
    chrome.runtime.sendMessage({ type: 'SYNC_SESSION', id }, (response: any) => {
      setSyncingId(null);
      if (response && response.success) {
        let url = response.targetDomain || fallbackDomain;
        if (!url.startsWith('http')) {
          const cleanDomain = url.startsWith('.') ? url.substring(1) : url;
          url = `https://${cleanDomain}`;
        }
        chrome.tabs.create({ url });
      } else {
        alert('Failed to sync session: ' + (response?.error || 'Unknown error'));
      }
    });
  };

  const groupedSites = availableSites.reduce((acc, site) => {
    const cat = site.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(site);
    return acc;
  }, {} as Record<string, typeof availableSites>);

  const getCategoryIcon = (categoryName: string) => {
    const cat = categoriesData.find(c => c.name === categoryName);
    return cat?.iconUrl || null;
  };

  // ========================
  // LOGGED IN VIEW
  // ========================
  if (user) {
    return (
      <div style={{
        width: '100%',
        minWidth: '300px',
        maxWidth: '480px',
        margin: '0 auto',
        minHeight: '100vh',
        backgroundColor: colors.bg,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: colors.text,
        position: 'relative',
      }}>
        {/* ===== FLOATING NAVIGATION BAR ===== */}
        <div style={{
          position: 'fixed',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 24px)',
          maxWidth: '456px',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 16px',
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${colors.accentGlow}`,
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: colors.text, lineHeight: 1.2 }}>
                UniverseAI
              </div>
              <div style={{
                fontSize: '11px',
                color: colors.textMuted,
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.email}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 14px',
              borderRadius: '10px',
              border: `1px solid ${colors.border}`,
              background: colors.white,
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            Logout
          </button>
        </div>

        {/* ===== CONTENT AREA ===== */}
        <div style={{ padding: '80px 16px 32px 16px' }}>
          {Object.entries(groupedSites).map(([category, sites]) => {
            const iconUrl = getCategoryIcon(category);
            return (
              <div key={category} style={{ marginBottom: '28px' }}>
                {/* Category Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  paddingLeft: '4px',
                }}>
                  {iconUrl ? (
                    <img src={iconUrl} alt={category} style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '4px' }} />
                  ) : (
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px',
                      background: colors.accentLight, color: colors.accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 800,
                    }}>
                      {category.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 700, color: colors.text, letterSpacing: '-0.3px' }}>
                    {category}
                  </span>
                </div>

                {/* Server Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sites.map((site) => {
                    const isActive = syncingId === site.id;
                    return (
                      <button
                        key={site.id}
                        onClick={() => handleSiteClick(site.id, site.domain)}
                        disabled={isActive}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '14px 16px', borderRadius: '14px',
                          border: `1px solid ${isActive ? colors.accent : colors.border}`,
                          background: isActive ? colors.accentLight : colors.white,
                          color: colors.text,
                          cursor: isActive ? 'wait' : 'pointer',
                          width: '100%', textAlign: 'left' as const,
                          boxShadow: isActive ? `0 0 0 3px ${colors.accentGlow}` : '0 1px 3px rgba(0, 0, 0, 0.04)',
                          outline: 'none',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                      >
                        <div style={{
                          padding: '10px', borderRadius: '10px',
                          background: isActive ? 'rgba(99, 102, 241, 0.15)' : colors.borderLight,
                          color: isActive ? colors.accent : colors.textSecondary,
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                          </svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: colors.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {site.siteName}
                          </div>
                          <div style={{ fontSize: '12px', color: colors.textMuted, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {site.domain.replace(/^https?:\/\//, '')}
                          </div>
                        </div>
                        {isActive ? (
                          <div style={{
                            width: '20px', height: '20px',
                            border: `2px solid ${colors.accentGlow}`, borderTopColor: colors.accent,
                            borderRadius: '50%', animation: 'uai-spin 0.6s linear infinite', flexShrink: 0,
                          }} />
                        ) : (
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: colors.borderLight, display: 'flex',
                            alignItems: 'center', justifyContent: 'center', color: colors.textMuted, flexShrink: 0,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {availableSites.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: colors.borderLight, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={colors.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: colors.textSecondary }}>No servers available</div>
              <div style={{ fontSize: '13px', color: colors.textMuted, marginTop: '4px' }}>Ask admin to add servers</div>
            </div>
          )}
        </div>

        {/* Keyframes */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes uai-spin { to { transform: rotate(360deg); } }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { margin: 0 !important; padding: 0 !important; background: ${colors.bg} !important; }
        `}} />
      </div>
    );
  }

  // ========================
  // LOGIN VIEW
  // ========================
  return (
    <div style={{
      width: '100%', minWidth: '300px', maxWidth: '480px', margin: '0 auto',
      minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
      backgroundColor: colors.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '60px 24px 80px 24px', boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: '360px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '18px',
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
            margin: '0 auto 20px auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${colors.accentGlow}, 0 2px 8px rgba(0,0,0,0.06)`,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h2 style={{ margin: '0 0 6px 0', fontWeight: 800, fontSize: '26px', color: colors.text, letterSpacing: '-0.5px' }}>
            UniverseAI
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: colors.textMuted, fontWeight: 500 }}>
            Sign in to access premium tools
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '20px', padding: '12px 16px', background: colors.dangerBg, border: '1px solid #fecaca', borderRadius: '12px', color: colors.danger, fontSize: '13px', textAlign: 'center', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: colors.textSecondary, marginLeft: '2px' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '14px 16px', borderRadius: '12px',
                border: `1.5px solid ${colors.border}`, background: colors.white,
                color: colors.text, outline: 'none', fontSize: '15px',
                boxSizing: 'border-box', WebkitAppearance: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = colors.accent; e.target.style.boxShadow = `0 0 0 3px ${colors.accentGlow}`; }}
              onBlur={(e) => { e.target.style.borderColor = colors.border; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: loading ? colors.textMuted : `linear-gradient(135deg, ${colors.accent}, ${colors.accentDark})`,
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: '15px', marginTop: '4px',
              boxShadow: loading ? 'none' : `0 4px 14px ${colors.accentGlow}`,
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  borderRadius: '50%', animation: 'uai-spin 0.6s linear infinite',
                }} />
                Authenticating...
              </>
            ) : 'Sign In'}
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes uai-spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0 !important; padding: 0 !important; background: ${colors.bg} !important; }
      `}} />
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
