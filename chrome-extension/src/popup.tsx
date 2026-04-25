import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

function Popup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<{ email: string } | null>(null);

  // updated site interface to include id and category
  const [availableSites, setAvailableSites] = useState<{id: number, category: string, siteName: string, domain: string}[]>([]);
  const [categoriesData, setCategoriesData] = useState<{id: number, name: string, iconUrl: string | null}[]>([]);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  useEffect(() => {
    // Check if already logged in
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
        // Now response.data has { sessions, categories }
        if (response.data.sessions && response.data.categories) {
          setAvailableSites(response.data.sessions);
          setCategoriesData(response.data.categories);
        } else if (Array.isArray(response.data)) {
          // Fallback for old API format
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
      const res = await fetch('http://localhost:3000/api/extension/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await chrome.storage.local.set({
          uai_user_token: data.token,
          uai_user_email: data.email,
        });
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

  // Group sites by category
  const groupedSites = availableSites.reduce((acc, site) => {
    const cat = site.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(site);
    return acc;
  }, {} as Record<string, typeof availableSites>);

  // Helper to get category icon
  const getCategoryIcon = (categoryName: string) => {
    const cat = categoriesData.find(c => c.name === categoryName);
    return cat?.iconUrl || null;
  };

  if (user) {
    return (
      <div style={{ width: '320px', padding: '24px', backgroundColor: '#ffffff', color: '#09090b', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e4e4e7', paddingBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: '18px', color: '#09090b' }}>UniverseAI</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#71717a' }}>{user.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '6px 12px', borderRadius: '6px', border: '1px solid #e4e4e7', background: '#fff', 
              color: '#09090b', cursor: 'pointer', fontSize: '12px', fontWeight: 500, transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#f4f4f5'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            Logout
          </button>
        </div>

        <div style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
          {Object.entries(groupedSites).map(([category, sites]) => {
            const iconUrl = getCategoryIcon(category);
            return (
              <div key={category} style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  {iconUrl && (
                    <img src={iconUrl} alt={category} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                  )}
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#09090b' }}>
                    {category}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sites.map((site) => (
                    <button
                      key={site.id}
                      onClick={() => handleSiteClick(site.id, site.domain)}
                      disabled={syncingId === site.id}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 14px', borderRadius: '8px', border: '1px solid #e4e4e7', 
                        background: '#fff', color: '#09090b', cursor: syncingId === site.id ? 'wait' : 'pointer', 
                        width: '100%', textAlign: 'left', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }}
                      onMouseOver={(e) => { if(syncingId !== site.id) e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#d4d4d8'; }}
                      onMouseOut={(e) => { if(syncingId !== site.id) e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e4e4e7'; }}
                    >
                      {/* SVG Icon Server */}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: '#71717a'}}>
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                      </svg>
                      
                      <span style={{ fontWeight: 500, fontSize: '13px', flex: 1 }}>{site.siteName}</span>
                      
                      {syncingId === site.id ? (
                        <span style={{ fontSize: '11px', color: '#71717a' }}>Opening...</span>
                      ) : (
                        <span style={{ fontSize: '14px', color: '#a1a1aa' }}>&rarr;</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {availableSites.length === 0 && (
            <p style={{ textAlign: 'center', color: '#71717a', fontSize: '13px', marginTop: '20px' }}>No servers available.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '300px', padding: '32px 24px', backgroundColor: '#ffffff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontWeight: 800, fontSize: '24px', color: '#09090b' }}>
          UniverseAI
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#71717a' }}>Sign in to access tools</p>
      </div>

      {error && (
        <div style={{ marginBottom: '16px', padding: '10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', color: '#ef4444', fontSize: '13px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 600, color: '#09090b' }}>Email Address</label>
          <input
            type="email"
            placeholder="admin@universeai.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #e4e4e7', background: '#fff', color: '#09090b', outline: 'none', fontSize: '14px' }}
            onFocus={(e) => e.target.style.borderColor = '#09090b'}
            onBlur={(e) => e.target.style.borderColor = '#e4e4e7'}
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#09090b', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px', transition: 'background 0.2s', marginTop: '4px' }}
          onMouseOver={(e) => { if(!loading) e.currentTarget.style.background = '#27272a'; }}
          onMouseOut={(e) => { if(!loading) e.currentTarget.style.background = '#09090b'; }}
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
}
