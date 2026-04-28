'use client';

import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [category, setCategory] = useState('');
  const [siteName, setSiteName] = useState('');
  const [domain, setDomain] = useState('');
  const [cookiesJson, setCookiesJson] = useState('');
  const [uiConfigStr, setUiConfigStr] = useState('{"hiddenSelectors": [".premium-banner"]}');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sessions' | 'categories' | 'users'>('sessions');

  // Users State
  const [users, setUsers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loadingUser, setLoadingUser] = useState(false);

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [loadingCategory, setLoadingCategory] = useState(false);

  useEffect(() => {
    fetchSessions();
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchSessions = async () => {
    const res = await fetch('/api/admin/sessions');
    if (res.ok) {
      const { data } = await res.json();
      setSessions(data);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch('/api/admin/users');
    if (res.ok) {
      const { data } = await res.json();
      setUsers(data);
    }
  };

  const fetchCategories = async () => {
    const res = await fetch('/api/admin/categories');
    if (res.ok) {
      const { data } = await res.json();
      setCategories(data);
      if (data.length > 0) {
        // If no category is selected, or the currently selected category no longer exists
        if (!category || !data.some((c: any) => c.name === category)) {
          setCategory(data[0].name);
        }
      } else {
        setCategory('');
      }
    }
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) {
      alert('Please select or create a category first');
      return;
    }
    setLoading(true);
    let uiConfig = {};
    try {
      uiConfig = JSON.parse(uiConfigStr);
    } catch(e) {
      alert('Invalid UI Config JSON');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/admin/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, siteName, domain, cookiesJson, uiConfig }),
    });

    if (res.ok) {
      alert('Saved successfully!');
      fetchSessions();
      setSiteName('');
      setDomain('');
      setCookiesJson('');
      setUiConfigStr('{"hiddenSelectors": [".premium-banner"]}');
      if (categories.length > 0) {
        setCategory(categories[0].name);
      } else {
        setCategory('');
      }
    } else {
      alert('Error saving session');
    }
    setLoading(false);
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    const res = await fetch('/api/admin/sessions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      fetchSessions();
    } else {
      alert('Error deleting session');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCategory(true);
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName, iconUrl: newCategoryIcon }),
    });

    if (res.ok) {
      setNewCategoryName('');
      setNewCategoryIcon('');
      fetchCategories();
    } else {
      const data = await res.json();
      alert(data.error || 'Error adding category');
    }
    setLoadingCategory(false);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    const res = await fetch('/api/admin/categories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      fetchCategories();
      fetchSessions(); // Refresh sessions in case they were using this category
    } else {
      alert('Error deleting category');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingUser(true);
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail }),
    });

    if (res.ok) {
      setNewEmail('');
      fetchUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Error adding user');
    }
    setLoadingUser(false);
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    const res = await fetch('/api/admin/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      fetchUsers();
    } else {
      alert('Error deleting user');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-3xl font-bold">UniverseAI Tools Admin</h1>
            <p className="text-zinc-400 mt-1">Manage shared sessions and domain access</p>
          </div>
          <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm">
            Logout
          </button>
        </header>

        <div className="flex space-x-4 border-b border-zinc-800 pb-px">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sessions'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Manage Sessions
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Manage Categories
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-300'
            }`}
          >
            Extension Users
          </button>
        </div>

        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Add / Update Session</h2>
                <form onSubmit={handleSaveSession} className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="" disabled>Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                    {categories.length === 0 && (
                      <p className="text-xs text-red-400 mt-1">Please create a category first.</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Server Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Server 1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Target Domain</label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. https://labs.google/fx/tools/flow"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Cookies JSON (Paste from extension)</label>
                    <textarea
                      value={cookiesJson}
                      onChange={(e) => setCookiesJson(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 h-32 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                      placeholder='[{"domain": ".canva.com", "name": "session", "value": "..."}]'
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">UI Config (JSON)</label>
                    <textarea
                      value={uiConfigStr}
                      onChange={(e) => setUiConfigStr(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 h-20 font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || categories.length === 0}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                  >
                    {loading ? 'Saving...' : 'Save Session'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Active Sites & Sessions</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                        <th className="pb-3 font-medium">Category</th>
                        <th className="pb-3 font-medium">Server Name</th>
                        <th className="pb-3 font-medium">Domain</th>
                        <th className="pb-3 font-medium">Last Updated</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {sessions.map((session) => (
                        <tr key={session.id} className="text-sm">
                          <td className="py-4 text-zinc-300">{session.category || 'General'}</td>
                          <td className="py-4 text-zinc-100 font-medium">{session.siteName}</td>
                          <td className="py-4 text-zinc-400 font-mono max-w-[150px] truncate">{session.domain}</td>
                          <td className="py-4 text-zinc-400">
                            {new Date(session.updatedAt).toLocaleString()}
                          </td>
                          <td className="py-4 text-right space-x-3">
                            <button
                              onClick={() => {
                                const catExists = categories.some(c => c.name === session.category);
                                setCategory(catExists ? (session.category || '') : (categories.length > 0 ? categories[0].name : ''));
                                setSiteName(session.siteName);
                                setDomain(session.domain);
                                setUiConfigStr(JSON.stringify(session.uiConfig || {}));
                              }}
                              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            No sessions found. Add one to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Add Category</h2>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Flow, Grok"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Icon URL (Optional)</label>
                    <input
                      type="url"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/icon.png"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingCategory}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-medium transition-colors"
                  >
                    {loadingCategory ? 'Adding...' : 'Add Category'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Existing Categories</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                        <th className="pb-3 font-medium">Name</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {categories.map((cat) => (
                        <tr key={cat.id} className="text-sm">
                          <td className="py-4 text-zinc-100 font-medium flex items-center space-x-3">
                            {cat.iconUrl ? (
                              <img src={cat.iconUrl} alt={cat.name} className="w-5 h-5 object-contain" />
                            ) : (
                              <div className="w-5 h-5 bg-zinc-800 rounded" />
                            )}
                            <span>{cat.name}</span>
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={2} className="py-8 text-center text-zinc-500">
                            No categories found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Add User Email</h2>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingUser}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-medium transition-colors"
                  >
                    {loadingUser ? 'Adding...' : 'Add User'}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <h2 className="text-xl font-semibold mb-4">Registered Users</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                        <th className="pb-3 font-medium">Email</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Added On</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {users.map((user) => (
                        <tr key={user.id} className="text-sm">
                          <td className="py-4 text-zinc-100 font-medium">{user.email}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 text-zinc-400">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500">
                            No users registered. Add an email to grant access.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
