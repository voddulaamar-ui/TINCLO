import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';
import useInfiniteScroll from '../hooks/useInfiniteScroll';

const slugify = (v = '') => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── Single company card ───────────────────────────────────────────────────────
const CompanyCard = ({ company, following, onToggleFollow, isLoggedIn }) => {
  const slug = company.slug || slugify(company.name);
  return (
    <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      {/* Banner */}
      <div className="h-24 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
        {company.coverBanner && (
          <img src={company.coverBanner} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-5 pb-5 -mt-8">
        {/* Logo */}
        <div className="w-16 h-16 rounded-xl bg-white border-2 border-gray-200 shadow flex items-center justify-center text-2xl font-black text-indigo-700 overflow-hidden mb-3">
          {company.logo
            ? <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
            : (company.name?.charAt(0) || '?')}
        </div>

        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <Link to={`/companies/${slug}`}
              className="text-base font-black text-gray-900 no-underline hover:text-indigo-600 block truncate">
              {company.name}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">
              {company.industry || 'Technology'} · {company.headquarters || 'Global'}
            </p>
          </div>
          {company.hiringStatus === 'Hiring' && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0">
              🟢 Hiring
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex gap-3 text-xs text-gray-500 mb-3 flex-wrap">
          <span>💼 {company.activeJobs || 0} open jobs</span>
          {company.totalEmployees && <span>👥 {company.totalEmployees}</span>}
          <span>❤️ {company.followers || 0} followers</span>
        </div>

        {/* Tech stack chips */}
        {(company.techStack || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {company.techStack.slice(0, 4).map(t => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold">{t}</span>
            ))}
            {company.techStack.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">+{company.techStack.length - 4}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={`/companies/${slug}`}
            className="flex-1 text-center py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold no-underline hover:bg-indigo-700 transition-colors">
            View Company
          </Link>
          {isLoggedIn && (
            <button
              onClick={() => onToggleFollow(company)}
              className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                following
                  ? 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}>
              {following ? '✓ Following' : '+ Follow'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CompaniesListPage() {
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  }, []);

  const [companies,  setCompanies]  = useState([]);
  const [following,  setFollowing]  = useState(new Set());
  const [search,     setSearch]     = useState('');
  const [query,      setQuery]      = useState('');   // debounced
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,    setHasMore]    = useState(true);
  const [error,      setError]      = useState('');

  const LIMIT = 12;

  // ── Initial load + search ─────────────────────────────────────────────────
  const loadCompanies = useCallback(async (q, pg, append = false) => {
    if (pg === 1) setLoading(true); else setLoadingMore(true);
    try {
      const params = { limit: LIMIT, page: pg };
      if (q) params.search = q;
      const res = await ApiService.fetchCompanies(params);
      const list = res.companies || res || [];
      setCompanies(prev => append ? [...prev, ...list] : list);
      setHasMore(list.length === LIMIT);
    } catch (e) {
      setError(e.message || 'Failed to load companies');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadCompanies(query, 1, false); }, [query, loadCompanies]);

  // Load following set
  useEffect(() => {
    if (!currentUser) return;
    ApiService.fetchFollowingCompanies()
      .then(list => setFollowing(new Set(list.map(c => c._id || c.id))))
      .catch(() => {});
  }, [currentUser]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadCompanies(query, next, true);
  };

  // Infinite scroll — auto-trigger loadMore when sentinel enters viewport
  const sentinelRef = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading: loadingMore });

  const handleToggleFollow = async (company) => {
    if (!currentUser) return;
    const slug = company.slug || slugify(company.name);
    const id   = company._id || company.id;
    try {
      if (following.has(id)) {
        await ApiService.unfollowCompany(slug);
        setFollowing(prev => { const s = new Set(prev); s.delete(id); return s; });
      } else {
        await ApiService.followCompany(slug);
        setFollowing(prev => new Set([...prev, id]));
      }
    } catch { /* ignore */ }
  };

  return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 pb-12 bg-slate-50">

        {/* Hero header */}
        <div className="px-8 py-10 text-center" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <h1 className="m-0 text-3xl font-black text-white mb-2">🏢 Explore Companies</h1>
          <p className="m-0 text-white/80 text-sm mb-6">Follow companies to get instant job alerts</p>

          {/* Search bar */}
          <div className="max-w-lg mx-auto relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search companies, industry, or tech stack…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border-0 text-sm font-medium text-gray-700 shadow-lg outline-none focus:ring-2 focus:ring-white/40"
            />
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* Following strip */}
          {following.size > 0 && (
            <div className="mb-6 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
              <p className="text-xs font-black text-indigo-600 uppercase mb-2">✓ Following ({following.size})</p>
              <div className="flex flex-wrap gap-2">
                {companies
                  .filter(c => following.has(c._id || c.id))
                  .map(c => (
                    <Link key={c._id} to={`/companies/${c.slug || slugify(c.name)}`}
                      className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 no-underline hover:bg-indigo-100">
                      {c.name}
                    </Link>
                  ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold">{error}</div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-4 gap-5 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-60 bg-white rounded-2xl animate-pulse border border-gray-100" />
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4 text-gray-400">
              <span className="text-5xl">🏢</span>
              <p className="text-lg font-semibold text-gray-600">
                {query ? `No companies found for "${query}"` : 'No companies yet.'}
              </p>
              {query && (
                <button onClick={() => setSearch('')} className="text-sm font-bold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-lg border-none cursor-pointer hover:bg-indigo-100">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 font-semibold mb-4">
                {query ? `Results for "${query}"` : `${companies.length}+ companies`}
              </p>
              <div className="grid grid-cols-4 gap-5 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                {companies.map(company => (
                  <CompanyCard
                    key={company._id || company.id}
                    company={company}
                    following={following.has(company._id || company.id)}
                    onToggleFollow={handleToggleFollow}
                    isLoggedIn={!!currentUser}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                      Loading more companies…
                    </div>
                  )}
                </div>
              )}
              {!hasMore && companies.length > 0 && (
                <p className="text-center text-xs text-gray-400 py-6">You've seen all companies.</p>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
