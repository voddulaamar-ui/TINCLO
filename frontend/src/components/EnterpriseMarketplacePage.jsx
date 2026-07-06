import React, { useState, useEffect, useCallback } from 'react';
import ApiService from '../services/ApiService';

const CatIcon = ({ category }) => {
  const map = { hr_module: '👥', industry_solution: '🏭', integration: '🔗', theme: '🎨', template: '📋', workflow_pack: '⚙️', ai_agent: '🤖', report: '📊', dashboard: '📈' };
  return <span className="text-lg">{map[category] || '📦'}</span>;
};

export default function EnterpriseMarketplacePage() {
  const [tab, setTab] = useState('browse');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [myInstalls, setMyInstalls] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([ApiService.getMarketplaceItems({}), ApiService.getMarketplaceCategories()]);
      setItems(itemsRes.items || []);
      setCategories(catsRes.categories || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadTab = (t) => {
    setTab(t);
    if (t === 'installed' && !myInstalls.length) ApiService.getMyMarketplaceInstalls().then(r => setMyInstalls(r.installs || [])).catch(console.error);
  };

  const filterByCategory = async (cat) => {
    setSelectedCategory(cat);
    try { const r = await ApiService.getMarketplaceItems({ category: cat }); setItems(r.items || []); } catch (e) { console.error(e); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <div className="w-10 h-10 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
    </div>
  );

  const tabs = ['browse', 'categories', 'installed'];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)' }}>
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/5 border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-white">🛒 Enterprise Marketplace</h1><p className="text-xs text-white/50">HR modules, AI agents, integrations & more</p></div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map(t => <button key={t} onClick={() => loadTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-4">
        {tab === 'browse' && (
          <>
            {items.length > 0 ? items.map(item => (
              <div key={item._id} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-3">
                  <CatIcon category={item.category} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div><h4 className="text-sm font-medium text-white">{item.name}</h4><p className="text-[10px] text-white/40">{item.publisherName} • v{item.version}</p></div>
                      <div className="text-right">
                        {item.pricing === 'free' ? <span className="text-[10px] text-green-300 font-bold">Free</span> : <span className="text-[10px] text-white/50">${item.price}</span>}
                        {item.isVerified && <span className="block text-[8px] text-blue-300">✓ Verified</span>}
                      </div>
                    </div>
                    {item.shortDesc && <p className="text-[11px] text-white/50 mt-1">{item.shortDesc}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] text-white/30">⬇️ {item.installs}</span>
                      <span className="text-[9px] text-yellow-300">★ {item.rating || '—'}</span>
                      {item.tags?.slice(0, 3).map(t => <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 text-white/40 text-[8px]">{t}</span>)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button onClick={async () => { await ApiService.installMarketplaceItem(item._id); alert('Installed!'); }} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium">Install</button>
                </div>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-8">No items available yet.</p>}
          </>
        )}

        {tab === 'categories' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map(cat => (
              <div key={cat.id} className={`bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition text-center ${selectedCategory === cat.id ? 'border-indigo-500/50' : ''}`}
                onClick={() => { filterByCategory(cat.id); setTab('browse'); }}>
                <span className="text-2xl block mb-2">{cat.icon}</span>
                <p className="text-xs text-white font-medium">{cat.name}</p>
                <p className="text-[10px] text-white/40">{cat.count} items</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'installed' && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">My Installed Items</h3>
            {myInstalls.length > 0 ? myInstalls.map((inst, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <CatIcon category={inst.itemId?.category} />
                  <div><p className="text-xs text-white">{inst.itemId?.name || 'Item'}</p><p className="text-[10px] text-white/40">v{inst.version} • {inst.status}</p></div>
                </div>
                <button onClick={async () => { await ApiService.uninstallMarketplaceItem(inst.itemId?._id); loadTab('installed'); }} className="px-2 py-1 rounded bg-red-500/10 text-red-300 text-[9px]">Uninstall</button>
              </div>
            )) : <p className="text-xs text-white/50 text-center py-6">No items installed.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
