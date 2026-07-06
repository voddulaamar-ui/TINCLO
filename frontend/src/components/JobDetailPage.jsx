import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';

const slugify = (v = '') => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── Share helper ──────────────────────────────────────────────────────────────
const handleShare = (title, company) => {
  const url  = window.location.href;
  const text = `${title} at ${company} — apply on TINCLO!`;
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => alert('Link copied to clipboard!'))
      .catch(() => {});
  }
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => (
  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
    status === 'open'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-red-50 text-red-600'
  }`}>
    {status === 'open' ? '🟢 Open' : '🔴 Closed'}
  </span>
);

export default function JobDetailPage() {
  const { id } = useParams();
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('tinclo_current_user') || 'null'); } catch { return null; }
  }, []);

  const [job,     setJob]     = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await ApiService.fetchJob(id);
        setJob(data);
        // Track views
        if (currentUser?.id) {
          ApiService.trackJobView({ userId: currentUser.id, jobId: id }).catch(() => {});
          ApiService.addRecentView(id).catch(() => {});
        }
        // Related jobs by domain + location, fallback to company
        const [byDomain, byCompany] = await Promise.all([
          ApiService.fetchJobs({ domain: data.domain, limit: 8 }).catch(() => ({ jobs: [] })),
          ApiService.fetchJobs({ company: data.company, limit: 4 }).catch(() => ({ jobs: [] })),
        ]);
        const seen = new Set([data._id]);
        const relatedList = [];
        for (const j of [...(byDomain.jobs || []), ...(byCompany.jobs || [])]) {
          if (!seen.has(j._id) && relatedList.length < 5) {
            seen.add(j._id);
            relatedList.push(j);
          }
        }
        setRelated(relatedList);
      } catch (err) {
        setError(err.message || 'Job not found');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, currentUser]);

  const shareJob = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: job.title, text: `${job.title} at ${job.company}`, url }).catch(() => {});
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
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-5 max-lg:grid-cols-1">
          <div className="col-span-8 space-y-4">
            {[200, 80, 120, 160].map((h, i) => (
              <div key={i} className="bg-white rounded-xl animate-pulse border border-gray-100" style={{ height: h }} />
            ))}
          </div>
          <div className="col-span-4 space-y-4">
            {[160, 200].map((h, i) => (
              <div key={i} className="bg-white rounded-xl animate-pulse border border-gray-100" style={{ height: h }} />
            ))}
          </div>
        </div>
      </main>
    </>
  );

  if (error) return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 bg-slate-50 flex items-center justify-center">
        <div className="text-center p-10">
          <div className="text-5xl mb-4">💼</div>
          <p className="text-red-600 font-bold text-lg mb-4">{error}</p>
          <Link to="/jobs" className="text-indigo-600 font-bold no-underline hover:underline">← Browse Jobs</Link>
        </div>
      </main>
    </>
  );

  // Parse responsibilities out of description if not a separate field
  // Many jobs store responsibilities inline in the description
  const responsibilities = job.responsibilities
    || (Array.isArray(job.tags) && job.tags.length > 3 ? null : null)
    || null;

  const skills = job.skillsRequired || job.requirements || [];

  return (
    <>
      <NavigationLanding />
      <main className="min-h-screen pt-16 bg-slate-50 pb-12">
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-12 gap-5 max-lg:grid-cols-1">

          {/* ── LEFT: main content ── */}
          <section className="col-span-8 max-lg:col-span-1 space-y-5">

            {/* Header card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={job.status} />
                    {job.workMode && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                        {job.workMode === 'Remote' ? '🌐' : job.workMode === 'Hybrid' ? '🔀' : '🏢'} {job.workMode}
                      </span>
                    )}
                    {job.jobType && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                        {job.jobType}
                      </span>
                    )}
                  </div>
                  <h1 className="m-0 mt-2 text-3xl font-black text-gray-900 leading-tight">{job.title}</h1>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Link to={`/companies/${slugify(job.company)}`}
                      className="text-indigo-600 font-bold no-underline hover:underline text-base">
                      {job.company}
                    </Link>
                    <span className="text-gray-400">·</span>
                    <span className="text-sm text-gray-500">📍 {job.location}</span>
                  </div>
                </div>
                {/* Company logo */}
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-black text-gray-500 overflow-hidden flex-shrink-0 border border-gray-200">
                  {job.companyLogo
                    ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                    : job.company?.charAt(0)}
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-4 gap-3 mt-5 max-sm:grid-cols-2">
                {[
                  ['💰', 'Salary',     job.salary || 'Not disclosed'],
                  ['🧑‍💼', 'Experience', job.experienceRequired || job.experience || 'Any'],
                  ['📅', 'Deadline',   job.deadline ? new Date(job.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open'],
                  ['🏷', 'Domain',     job.domain || 'General'],
                ].map(([icon, label, value]) => (
                  <div key={label} className="bg-slate-50 rounded-xl p-3">
                    <div className="text-lg mb-0.5">{icon}</div>
                    <div className="text-sm font-black text-gray-900 truncate">{value}</div>
                    <div className="text-xs font-semibold text-gray-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* CTA row */}
              <div className="flex gap-3 mt-5 flex-wrap">
                <a
                  href={job.applyUrl || '#'}
                  target={job.applyUrl ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="flex-1 min-w-[140px] text-center py-3 rounded-xl bg-indigo-600 text-white text-sm font-black no-underline hover:bg-indigo-700 transition-colors"
                >
                  Apply Now →
                </a>
                <button
                  onClick={shareJob}
                  className="px-5 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  {copied ? '✓ Copied!' : '🔗 Share'}
                </button>
                <Link
                  to={`/companies/${slugify(job.company)}`}
                  className="px-5 py-3 rounded-xl bg-white border-2 border-gray-200 text-indigo-600 text-sm font-bold no-underline hover:border-indigo-300 transition-colors"
                >
                  View Company
                </Link>
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="m-0 mb-3 text-lg font-black text-gray-900">📋 Job Description</h2>
              <p className="text-sm text-gray-600 leading-7 whitespace-pre-line">{job.description}</p>
            </div>

            {/* Responsibilities */}
            {responsibilities && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="m-0 mb-3 text-lg font-black text-gray-900">✅ Responsibilities</h2>
                {Array.isArray(responsibilities) ? (
                  <ul className="m-0 pl-5 space-y-1.5 list-disc">
                    {responsibilities.map((r, i) => (
                      <li key={i} className="text-sm text-gray-600 leading-relaxed">{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-600 leading-7 whitespace-pre-line">{responsibilities}</p>
                )}
              </div>
            )}

            {/* Requirements / Skills */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="m-0 mb-4 text-lg font-black text-gray-900">🛠 Requirements</h2>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <span key={skill} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Requirements will be shared during the process.</p>
              )}
            </div>

            {/* Benefits */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="m-0 mb-3 text-lg font-black text-gray-900">🎁 Benefits</h2>
              {job.benefits ? (
                Array.isArray(job.benefits) ? (
                  <div className="flex flex-wrap gap-2">
                    {job.benefits.map(b => (
                      <span key={b} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">{b}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 leading-7">{job.benefits}</p>
                )
              ) : (
                <p className="text-sm text-gray-400">Benefits will be shared by the recruiter during the process.</p>
              )}
            </div>

          </section>

          {/* ── RIGHT: sidebar ── */}
          <aside className="col-span-4 max-lg:col-span-1 space-y-5">

            {/* Company Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">🏢 Company Details</h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-black text-gray-500 overflow-hidden flex-shrink-0 border border-gray-200">
                  {job.companyLogo
                    ? <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
                    : job.company?.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">{job.company}</div>
                  {job.location && <div className="text-xs text-gray-500">📍 {job.location}</div>}
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-6 m-0">
                {job.companyDescription || `${job.company} is an innovative company actively hiring on TINCLO.`}
              </p>
              <Link
                to={`/companies/${slugify(job.company)}`}
                className="mt-3 inline-flex items-center text-sm font-bold text-indigo-600 no-underline hover:underline"
              >
                View full company page →
              </Link>
            </div>

            {/* Recruiter Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">👤 Posted By</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                  {job.recruiterName?.charAt(0) || job.company?.charAt(0) || 'R'}
                </div>
                <div>
                  <div className="text-sm font-black text-gray-900">
                    {job.recruiterName || `${job.company} Recruiter`}
                  </div>
                  {job.recruiterTitle && (
                    <div className="text-xs text-gray-500">{job.recruiterTitle}</div>
                  )}
                  {job.recruiterEmail && (
                    <a href={`mailto:${job.recruiterEmail}`}
                      className="text-xs text-indigo-600 font-semibold no-underline hover:underline">
                      {job.recruiterEmail}
                    </a>
                  )}
                </div>
              </div>
              {job.source && (
                <div className="mt-3 text-xs text-gray-400 font-semibold">
                  Source: {job.source} · Posted {job.postedAt
                    ? new Date(job.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
            </div>

            {/* Job Summary quick-view */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">📌 Job Summary</h2>
              <div className="space-y-2 text-sm">
                {[
                  ['Work Mode',   job.workMode || 'Flexible'],
                  ['Job Type',    job.jobType  || 'Full-time'],
                  ['Location',    job.location],
                  ['Salary',      job.salary   || 'Not disclosed'],
                  ['Experience',  job.experienceRequired || job.experience || 'Any level'],
                  ['Deadline',    job.deadline
                    ? new Date(job.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'No deadline'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <span className="text-gray-500 font-semibold flex-shrink-0">{label}</span>
                    <span className="text-gray-900 font-bold text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Jobs */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h2 className="m-0 mb-3 text-base font-black text-gray-900">🔗 Related Jobs</h2>
              {related.length === 0 ? (
                <p className="text-sm text-gray-400">No related jobs found.</p>
              ) : (
                <div className="space-y-1">
                  {related.map(item => (
                    <Link key={item._id} to={`/jobs/${item._id}`}
                      className="flex items-start gap-2.5 no-underline border-b border-gray-100 py-2.5 last:border-0 group">
                      <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500 flex-shrink-0 mt-0.5">
                        {item.company?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{item.title}</div>
                        <div className="text-xs text-gray-500 truncate">{item.company} · {item.location}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </aside>
        </div>
      </main>
    </>
  );
}
