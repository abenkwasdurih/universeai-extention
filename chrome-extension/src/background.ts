import { decryptCookieData } from './crypto';

// Note: Ensure the Vercel backend URL is correct
const API_URL = 'http://localhost:3000/api/get-session';

chrome.runtime.onMessage.addListener((message: any, _sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
  if (message.type === 'SYNC_SESSION') {
    handleSessionSync(message.id)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    
    return true; // Keep the message channel open for async response
  }
  
  if (message.type === 'GET_SESSIONS_LIST') {
    chrome.storage.local.get(['uai_user_token'], (result) => {
      const token = result.uai_user_token;
      if (!token) {
        sendResponse({ success: false, error: 'Unauthorized', status: 401 });
        return;
      }

      fetch('http://localhost:3000/api/get-sessions-list', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(async (res) => {
          if (res.status === 401) {
            sendResponse({ success: false, error: 'Unauthorized', status: 401 });
            return;
          }
          const data = await res.json();
          sendResponse(data);
        })
        .catch((err) => sendResponse({ success: false, error: err.message }));
    });
      
    return true;
  }

  if (message.type === 'CLEAR_COOKIES') {
    const sites = message.sites || [];
    for (const site of sites) {
      let fallbackDomain = site.domain;
      if (fallbackDomain.startsWith('http')) {
        try { fallbackDomain = new URL(fallbackDomain).hostname; } catch(e) {}
      }
      
      // Clean leading dot for getAll filter
      const searchDomain = fallbackDomain.startsWith('.') ? fallbackDomain.substring(1) : fallbackDomain;

      chrome.cookies.getAll({ domain: searchDomain }, (cookies) => {
        for (const cookie of cookies) {
          const protocol = cookie.secure ? 'https:' : 'http:';
          const url = `${protocol}//${cookie.domain}${cookie.path}`;
          chrome.cookies.remove({ url, name: cookie.name });
        }
      });
    }
    sendResponse({ success: true });
    return true;
  }
});

async function handleSessionSync(id: number) {
  try {
    const storage = await chrome.storage.local.get(['uai_user_token']);
    const token = storage.uai_user_token;
    if (!token) throw new Error('Unauthorized');

    const res = await fetch(`${API_URL}?id=${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Session not found or API error');
    
    const { data } = await res.json();
    const { encryptedCookies, uiConfig, domain } = data;

    const decryptedStr = decryptCookieData(encryptedCookies);
    const cookies = JSON.parse(decryptedStr);

    // Set cookies in the browser
    for (const cookie of cookies) {
      // 1. Clean up user's domain input if they pasted a full URL
      let fallbackDomain = domain;
      if (fallbackDomain.startsWith('http')) {
        try {
          fallbackDomain = new URL(fallbackDomain).hostname;
        } catch(e) {}
      }

      // 2. Determine target domain and URL
      let cookieDomain = cookie.domain || fallbackDomain;
      let urlDomain = cookieDomain.startsWith('.') ? cookieDomain.substring(1) : cookieDomain;
      
      const cookieParams: any = {
        url: `https://${urlDomain}${cookie.path || '/'}`,
        name: cookie.name,
        value: cookie.value,
        domain: cookieDomain,
        path: cookie.path || '/',
        secure: cookie.secure !== undefined ? cookie.secure : true,
        httpOnly: cookie.httpOnly,
      };

      if (cookie.sameSite && ['no_restriction', 'lax', 'strict', 'unspecified'].includes(cookie.sameSite)) {
        cookieParams.sameSite = cookie.sameSite;
      }
      if (cookie.expirationDate) {
        cookieParams.expirationDate = cookie.expirationDate;
      }

      // Chrome enforces strict rules for __Host- and __Secure- prefixed cookies
      if (cookie.name.startsWith('__Host-')) {
        delete cookieParams.domain;
        cookieParams.secure = true;
        cookieParams.path = '/';
      } else if (cookie.name.startsWith('__Secure-')) {
        cookieParams.secure = true;
      }

      const result = await chrome.cookies.set(cookieParams);
      if (!result) {
        console.error('Failed to set cookie:', cookie.name, chrome.runtime.lastError);
      }
    }

    return { success: true, uiConfig, targetDomain: domain };
  } catch (err) {
    console.error('Session sync failed:', err);
    throw err;
  }
}
