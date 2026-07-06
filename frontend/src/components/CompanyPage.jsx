import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';

const slugify = (v = '') => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── Share helper ──────────────────────────────────────────────────────────────
const shareCompany = (name) => {
  const url  = window.location.href;
  const text = `Check out ${name} on TINCLO – they're hiring!`;
  if (navigator.share) {
    navigator.share({ title: name, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() => alert('Link copied to clipboard!')).catch(() => {});
  }
};

export default function CompanyPage() {
  const { slug } = useParams();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  }, []);
  const [company,  setCompany]  = useState(null);
  const [following, setFollowing] = useState(false);
  const [similar,  setSimilar]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await ApiService.fetchCompany(slug);
        setCompany(data);
        if (currentUser) {
          const follows = await ApiService.fetchFollowingCompanies().catch(() => []);
          setFollowing(follows.some(c => c.slug === data.slug || c._id === data._id));
        }
        // Load similar companies — same industry or tech stack
        const res = await ApiService.fetchCompanies({ search: data.industry || '', limit: 5 }).catch(() => ({ companies: [] }));
        setSimilar((res.companies || []).filter(c => c._id !== data._id).slice(0, 4));
      } catch (err) {
        setError(err.message || 'Company not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, currentUser]);

  const toggleFollow = async () => {
    if (!currentUser || !company) return;
    const s = company.slug || slugify(company.name);
    if (following) await ApiService.unfollowCompany(s);
    else await ApiService.followCompany(s);
    setFollowing(v => !v);
  };

  const handleShare = () => {
    const url  = window.location.href;
    const text = `Check out ${company.name} on TINCLO – they're hiring!`;
    if (navigator.share) {
      navigator.share({ title: company.name, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => {});
    }
  };

  if (loading) return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 bg-slate-50">
        <div className="max-w-6xl mx-auto p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse border border-gray-100" />
          ))}
        </div>
      </main>
    </>
  );

  if (error) return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 bg-slate-50 flex items-center justify-center">
        <div className="text-center p-10">
          <div className="text-5xl mb-4">🏢</div>
          <p className="text-red-600 font-bold text-lg">{error}</p>
          <Link to="/companies" className="mt-4 inline-block text-indigo-600 font-bold no-underline hover:underline">← Browse Companies</Link>
        </div>
      </main>
    </>
  );

  return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 bg-slate-50 pb-12">

        {/* ── Hero banner ── */}
        <section className="bg-white border-b border-gray-200">
          <div className="h-52 bg-gradient-to-r from-slate-900 via-indigo-700 to-emerald-600 overflow-hidden relative">
            {company.coverBanner && <img src={company.coverBanner} alt="" className="w-full h-full object-cover" />}
            {/* Hiring badge overlay */}
            {company.hiringStatus === 'Hiring' && (
              <span className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow">
                🟢 Actively Hiring
              </span>
            )}
          </div>
          <div className="max-w-6xl mx-auto px-6 pb-6 -mt-12 flex gap-5 items-end justify-between flex-wrap">
            <div className="flex gap-4 items-end">
              <div className="w-24 h-24 rounded-xl bg-white border-2 border-gray-200 shadow-lg flex items-center justify-center text-3xl font-black text-indigo-700 overflow-hidden">
                {company.logo ? <img src={company.logo} alt={company.name} className="w-full h-full object-cover" /> : company.name?.charAt(0)}
              </div>
              <div className="pb-1">
                <h1 className="m-0 text-3xl font-black text-gray-900">{company.name}</h1>
                <p className="m-0 text-sm text-gray-500 mt-0.5">
                  {company.industry || 'Technology'} · {company.headquarters || 'Global'}
                  {company.size && ` · ${company.size}`}
                </p>
                {/* Social links */}
                <div className="flex gap-2 mt-1 flex-wrap">
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 no-underline hover:underline">🌐 Website</a>
                  )}
                  {company.linkedin && (
                    <a href={company.linkedin} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 no-underline hover:underline">💼 LinkedIn</a>
                  )}
                  {company.twitter && (
                    <a href={company.twitter} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold text-sky-500 no-underline hover:underline">🐦 Twitter</a>
                  )}
                  {company.github && (
                    <a href={company.github} target="_blank" rel="noreferrer"
                      className="text-xs font-semibold text-gray-700 no-underline hover:underline">💻 GitHub</a>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {currentUser && (
                <button onClick={toggleFollow}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                    following
                      ? 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  }`}>
                  {following ? '✓ Following' : '+ Follow Company'}
                </button>
              )}
              <button onClick={handleShare}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300 transition-all cursor-pointer">
                {copied ? '✓ Copied!' : '🔗 Share'}
              </button>
              {company.website && (
                <a href={company.website} target="_blank" rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-bold no-underline hover:bg-gray-800 transition-colors">
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </section>

        {/* ── Main content ── */}
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-5 max-lg:grid-cols-1">

          {/* About */}
          <section className="col-span-8 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="m-0 mb-3 text-lg font-black text-gray-900">About {company.name}</h2>
            <p className="text-sm text-gray-600 leading-7">{company.about || 'This company is actively hiring on TINCLO.'}</p>
            {/* Stats grid */}
            <div className="grid grid-cols-5 gap-3 mt-6 max-sm:grid-cols-3">
              {[
                ['💼', 'Active Jobs',  company.activeJobs    || 0],
                ['👥', 'Employees',    company.totalEmployees || '—'],
                ['⭐', 'Rating',       company.rating         || 'New'],
                ['❤️', 'Followers',   company.followers      || 0],
                ['🟢', 'Status',      company.hiringStatus   || 'Hiring'],
              ].map(([icon, label, value]) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-lg mb-0.5">{icon}</div>
                  <div className="text-base font-black text-gray-900">{value}</div>
                  <div className="text-[11px] text-gray-500 font-bold">{label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits & Tech Stack */}
          <aside className="col-span-4 max-lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">🎁 Benefits</h2>
              {(company.benefits || []).length ? (
                <div className="flex flex-wrap gap-2">
                  {company.benefits.map(b => (
                    <span key={b} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">{b}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Not specified.</p>}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">🛠 Tech Stack</h2>
              {(company.techStack || []).length ? (
                <div className="flex flex-wrap gap-2">
                  {company.techStack.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">{t}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-gray-400">Not specified.</p>}
            </div>
          </aside>

          {/* Open Positions */}
          <section className="col-span-12 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="m-0 text-lg font-black text-gray-900">💼 Open Positions ({(company.openJobs || []).length})</h2>
            </div>
            {(company.openJobs || []).length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
                <span className="text-3xl">📭</span>
                <p className="text-sm m-0">No open positions right now. Follow to get notified when they hire.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-md:grid-cols-1">
                {company.openJobs.map(job => (
                  <Link key={job._id} to={`/jobs/${job._id}`}
                    className="no-underline border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                    <div className="font-black text-gray-900 mb-1">{job.title}</div>
                    <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                      <span>📍 {job.location}</span>
                      {job.salary && <span>💰 {job.salary}</span>}
                      {job.workMode && <span>🏠 {job.workMode}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Similar Companies */}
          {similar.length > 0 && (
            <section className="col-span-12 max-lg:col-span-1 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="m-0 mb-4 text-lg font-black text-gray-900">🏢 Similar Companies</h2>
              <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                {similar.map(c => (
                  <Link key={c._id} to={`/companies/${c.slug || slugify(c.name)}`}
                    className="no-underline border border-gray-200 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-indigo-700 text-lg flex-shrink-0 overflow-hidden">
                      {c.logo ? <img src={c.logo} alt="" className="w-full h-full object-cover" /> : c.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-900 truncate">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.activeJobs || 0} open jobs</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </>
  );
}
