import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationLanding from './NavigationLanding';
import ApiService from '../services/ApiService';

// ── Job Performance Panel ─────────────────────────────────────────────────────
const JobPerformancePanel = ({ dashboardStats }) => {
  const [perfData, setPerfData] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    // Try the /dashboard/recruiter endpoint which returns jobPerformance array
    ApiService.getRecruiterDashboardStats()
      .then(d => setPerfData(d?.jobPerformance || []))
      .catch(e => setError(e.message || 'Failed to load performance data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      Loading job performance…
    </div>
  );
  if (error) return <div className="py-10 text-center text-red-500 font-semibold">{error}</div>;
  if (!perfData || perfData.length === 0) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
      <span className="text-4xl">📊</span>
      <p className="text-sm font-semibold">Post jobs to see performance data here.</p>
    </div>
  );

  const COLS = [
    { key: 'views',        label: 'Views',        color: '#667eea', icon: '👁' },
    { key: 'saves',        label: 'Saves',        color: '#f6ad55', icon: '🔖' },
    { key: 'applications', label: 'Applications', color: '#48bb78', icon: '📧' },
    { key: 'shortlisted',  label: 'Shortlisted',  color: '#3182ce', icon: '⭐' },
    { key: 'interviewed',  label: 'Interviewed',  color: '#805ad5', icon: '📅' },
    { key: 'selected',     label: 'Selected',     color: '#38a169', icon: '🏆' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-black text-gray-900 m-0">Job Performance Overview</h3>
        <span className="text-xs text-gray-400 font-semibold">{perfData.length} job{perfData.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Desktop table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200" style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                <th className="text-left px-5 py-3.5 text-white font-black text-xs">Job Title</th>
                {COLS.map(c => (
                  <th key={c.key} className="text-center px-3 py-3.5 text-white font-black text-xs whitespace-nowrap">
                    {c.icon} {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfData.map((job, i) => {
                const conversion = job.applications > 0
                  ? Math.round((job.selected / job.applications) * 100) : 0;
                return (
                  <tr key={job.jobId || i}
                    className={`border-b border-gray-100 hover:bg-indigo-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-5 py-3.5">
                      <div className="font-black text-gray-900 max-w-[220px] truncate">{job.title}</div>
                      {conversion > 0 && (
                        <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">{conversion}% conversion</div>
                      )}
                    </td>
                    {COLS.map(c => (
                      <td key={c.key} className="text-center px-3 py-3.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-black"
                          style={{ background: c.color + '15', color: c.color }}>
                          {job[c.key] ?? 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-slate-50">
                <td className="px-5 py-3 font-black text-gray-700 text-xs uppercase tracking-wide">Totals</td>
                {COLS.map(c => {
                  const total = perfData.reduce((s, j) => s + (j[c.key] ?? 0), 0);
                  return (
                    <td key={c.key} className="text-center px-3 py-3">
                      <span className="text-sm font-black text-gray-900">{total}</span>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {perfData.map((job, i) => (
          <div key={job.jobId || i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <div className="font-black text-gray-900 mb-3">{job.title}</div>
            <div className="grid grid-cols-3 gap-2">
              {COLS.map(c => (
                <div key={c.key} className="text-center rounded-xl py-2 px-1" style={{ background: c.color + '10' }}>
                  <div className="text-lg font-black" style={{ color: c.color }}>{job[c.key] ?? 0}</div>
                  <div className="text-[10px] text-gray-500 font-semibold">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Inline bar chart (no external dep) ───────────────────────────────────────
const MiniBarChart = ({ data, labelKey, valueKey, color = '#667eea', height = 130 }) => {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="flex gap-1.5 items-end" style={{ height }}>
      {data.map((d, i) => {
        const pct = Math.max((d[valueKey] / max) * 100, 2);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full group relative">
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
              {d[valueKey]}
            </div>
            <div className="flex-1 w-full flex items-end bg-gray-100 rounded-t overflow-hidden">
              <div className="w-full rounded-t transition-all duration-700" style={{ height: `${pct}%`, background: color }} />
            </div>
            <div className="text-[10px] text-gray-500 font-semibold truncate w-full text-center">{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
};

// ── Recruiter analytics panel (embedded in RecruiterDashboard) ────────────────
const RecruiterAnalyticsPanel = () => {
  const [d,       setD]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    ApiService.getRecruiterAnalytics()
      .then(setD)
      .catch(e => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
      <div className="w-8 h-8 border-[3px] border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      Loading analytics…
    </div>
  );
  if (error) return <div className="py-10 text-center text-red-500 font-semibold">{error}</div>;
  if (!d)    return null;

  const t = d.totals || {};
  const STAT_CARDS = [
    { label: 'Jobs Posted',       value: t.totalJobsPosted       || 0, color: '#667eea', icon: '💼' },
    { label: 'Applications',      value: t.applicationsReceived  || 0, color: '#48bb78', icon: '📧' },
    { label: 'Shortlisted',       value: t.shortlistedCandidates || 0, color: '#f6ad55', icon: '⭐' },
    { label: 'Interviews',        value: t.interviewsScheduled   || 0, color: '#805ad5', icon: '📅' },
    { label: 'Avg Apps / Job',    value: t.averageApplicationsPerJob || 0, color: '#3182ce', icon: '📊' },
    { label: 'Hiring Rate',       value: `${t.hiringSuccessRate  || 0}%`, color: '#d69e2e', icon: '🏆' },
  ];

  const weekData  = (d.applicationsPerWeek || []).map((r, i) => ({
    label: r.date ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(r.date).getDay()] : String(i),
    count: r.count ?? 0,
  }));
  const skillData = (d.candidateSkillDistribution || []).slice(0, 8);
  const expData   = (d.candidateExperienceDistribution || []).map(e => ({ label: e.experience, count: e.count }));
  const SKILL_COLORS = ['#667eea','#764ba2','#f093fb','#48bb78','#f6ad55','#fc8181','#3182ce','#38a169'];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-6 gap-4 max-xl:grid-cols-3 max-sm:grid-cols-2">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 text-center shadow-sm border-t-4 hover:-translate-y-0.5 transition-transform"
            style={{ borderColor: s.color }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-gray-500 font-semibold mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">

        {/* Applications per week */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="m-0 mb-5 text-base font-extrabold text-gray-900">📅 Applications This Week</h3>
          {weekData.length ? (
            <MiniBarChart data={weekData} labelKey="label" valueKey="count" color="#48bb78" height={130} />
          ) : <p className="text-sm text-gray-400 text-center py-6">No application data yet.</p>}
        </div>

        {/* Candidate skill distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="m-0 mb-5 text-base font-extrabold text-gray-900">🛠 Applicant Skill Distribution</h3>
          {skillData.length ? (
            <div className="flex flex-col gap-3">
              {skillData.map((s, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-28 text-xs font-semibold text-gray-600 flex-shrink-0 truncate">{s.skill}</div>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700 min-w-[4px]"
                      style={{ width: `${(s.count / (skillData[0].count || 1)) * 100}%`, background: SKILL_COLORS[i % SKILL_COLORS.length] }} />
                  </div>
                  <div className="w-5 text-right text-xs font-black text-gray-700">{s.count}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No applicant skill data yet.</p>}
        </div>

        {/* Experience distribution */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="m-0 mb-5 text-base font-extrabold text-gray-900">🧑‍💼 Applicant Experience</h3>
          {expData.length ? (
            <MiniBarChart data={expData} labelKey="label" valueKey="count" color="#805ad5" height={120} />
          ) : <p className="text-sm text-gray-400 text-center py-6">No experience data yet.</p>}
        </div>

        {/* Top jobs */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="m-0 mb-4 text-base font-extrabold text-gray-900">🏆 Top Performing Jobs</h3>
          <div className="space-y-3">
            {[
              { label: 'Most Applied', job: d.mostAppliedJob, icon: '📧', color: '#48bb78' },
              { label: 'Most Viewed',  job: d.mostViewedJob,  icon: '👁',  color: '#667eea' },
            ].filter(x => x.job).map(({ label, job, icon, color }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: color + '20', color }}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-black text-gray-400 uppercase">{label}</div>
                  <div className="text-sm font-black text-gray-900 truncate">{job.title}</div>
                  <div className="text-xs text-gray-500">{job.applications} applications</div>
                </div>
              </div>
            ))}
            {!d.mostAppliedJob && !d.mostViewedJob && (
              <p className="text-sm text-gray-400 text-center py-4">Post jobs to see performance data.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const STATUS_CONFIG = {
  saved:                { label: 'Saved',              color: '#667eea', bg: '#ebf4ff' },
  applied:              { label: 'Applied',            color: '#f6ad55', bg: '#fffaf0' },
  under_review:         { label: 'Under Review',       color: '#3182ce', bg: '#ebf8ff' },
  interview_scheduled:  { label: 'Interview Scheduled',color: '#805ad5', bg: '#faf5ff' },
  offer:                { label: 'Offer',              color: '#38a169', bg: '#f0fff4' },
  rejected:             { label: 'Rejected',           color: '#e53e3e', bg: '#fff5f5' },
};

const inputCls = 'w-full px-3.5 py-[11px] border-2 border-gray-200 rounded-[10px] text-sm text-gray-700 bg-gray-50 font-[inherit] outline-none transition-all focus:border-indigo-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)]';

const WORK_MODES = ['Remote', 'Hybrid', 'Onsite'];
const JOB_TYPES  = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'];
const DOMAINS    = ['Full Stack', 'Frontend', 'Backend', 'Data Science', 'Machine Learning', 'DevOps', 'Cloud', 'Mobile', 'UI/UX Design', 'Product Management', 'Cybersecurity', 'Blockchain', 'QA / Testing', 'Other'];

const emptyJobForm = {
  title: '', company: '', description: '', salary: '', location: '', domain: '',
  skillsRequired: '', workMode: 'Onsite', jobType: 'Full-time', experienceRequired: '',
  deadline: '', companyDescription: '',
  responsibilities: '', // newline-separated list
  recruiterName: '', recruiterTitle: '', recruiterEmail: '',
};

// ── Tag chip ─────────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.applied;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState('jobs');
  const [jobs, setJobs]                 = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [applicants, setApplicants]     = useState([]);
  const [selectedJob, setSelectedJob]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [appLoading, setAppLoading]     = useState(false);
  const [toast, setToast]               = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [editingJob, setEditingJob]     = useState(null);
  const [jobForm, setJobForm]           = useState(emptyJobForm);
  const [formLoading, setFormLoading]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('tinclo_current_user') || 'null');

  useEffect(() => {
    if (!currentUser) { navigate('/login'); return; }
    if (currentUser.role !== 'recruiter' && currentUser.role !== 'admin') { navigate('/jobs'); return; }
    loadJobs();
  }, []); // eslint-disable-line

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadJobs = async () => {
    setLoading(true);
    try {
      const [data, dashboard] = await Promise.all([
        ApiService.getRecruiterJobs(),
        ApiService.getRecruiterDashboardStats().catch(() => null),
      ]);
      setJobs(data);
      setDashboardStats(dashboard?.stats || null);
    } catch (err) {
      showToast('⚠️ ' + (err.message || 'Failed to load jobs'));
    } finally {
      setLoading(false);
    }
  };

  const loadApplicants = useCallback(async (jobId) => {
    setAppLoading(true);
    try {
      const data = await ApiService.getJobApplicants(jobId);
      setApplicants(data);
    } catch (err) {
      showToast('⚠️ ' + (err.message || 'Failed to load applicants'));
    } finally {
      setAppLoading(false);
    }
  }, []);

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    setActiveTab('applicants');
    loadApplicants(job._id);
  };

  const openCreate = () => { setEditingJob(null); setJobForm(emptyJobForm); setShowForm(true); };
  const openEdit   = (job) => {
    setEditingJob(job);
    setJobForm({
      title:              job.title,
      company:            job.company,
      description:        job.description,
      salary:             job.salary,
      location:           job.location,
      domain:             job.domain || '',
      skillsRequired:     (job.skillsRequired || job.requirements || []).join(', '),
      workMode:           job.workMode || 'Onsite',
      jobType:            job.jobType  || 'Full-time',
      experienceRequired: job.experienceRequired || job.experience || '',
      deadline:           job.deadline ? job.deadline.split('T')[0] : '',
      companyDescription: job.companyDescription || '',
      // Phase 2 fields
      responsibilities:   (job.responsibilities || []).join('\n'),
      recruiterName:      job.recruiterName  || '',
      recruiterTitle:     job.recruiterTitle || '',
      recruiterEmail:     job.recruiterEmail || '',
    });
    setShowForm(true);
  };

  const handleSubmitJob = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...jobForm,
        skillsRequired: jobForm.skillsRequired.split(',').map(s => s.trim()).filter(Boolean),
        responsibilities: jobForm.responsibilities
          ? jobForm.responsibilities.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
        deadline: jobForm.deadline || null,
      };
      if (editingJob) {
        await ApiService.updateRecruiterJob(editingJob._id, payload);
        showToast('✅ Job updated!');
      } else {
        await ApiService.createRecruiterJob(payload);
        showToast('✅ Job posted!');
      }
      setShowForm(false);
      loadJobs();
    } catch (err) {
      showToast('⚠️ ' + (err.message || 'Failed to save job'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleStatus = async (job) => {
    try {
      const newStatus = job.status === 'open' ? 'closed' : 'open';
      await ApiService.updateRecruiterJobStatus(job._id, newStatus);
      showToast(`✅ Job ${newStatus === 'open' ? 'reopened' : 'closed'}.`);
      loadJobs();
    } catch (err) {
      showToast('⚠️ ' + err.message);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      await ApiService.deleteRecruiterJob(jobId);
      showToast('✅ Job deleted.');
      setConfirmDelete(null);
      loadJobs();
    } catch (err) {
      showToast('⚠️ ' + err.message);
    }
  };

  const handleUpdateStatus = async (matchId, status) => {
    try {
      await ApiService.updateApplicationStatus(matchId, status);
      showToast('✅ Status updated.');
      loadApplicants(selectedJob._id);
    } catch (err) {
      showToast('⚠️ ' + err.message);
    }
  };

  const stats = {
    total: jobs.length,
    open:  jobs.filter(j => j.status === 'open').length,
    closed: jobs.filter(j => j.status === 'closed').length,
    applicants: jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0),
  };

  if (!currentUser) return null;

  return (
    <>
      <NavigationLanding />
      <div className="min-h-screen pt-16 pb-10" style={{ background: 'linear-gradient(135deg,#f0f4ff 0%,#faf0ff 50%,#f0fff4 100%)' }}>

        {/* Header */}
        <div className="px-6 py-5 flex justify-between items-center flex-wrap gap-3 shadow-[0_4px_20px_rgba(102,126,234,0.3)]"
          style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
          <div>
            <h1 className="text-white text-2xl font-black m-0">🏢 Recruiter Dashboard</h1>
            <p className="text-white/70 text-sm m-0">Welcome, <strong>{currentUser.name}</strong></p>
          </div>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white text-indigo-600 text-sm font-bold rounded-xl border-none cursor-pointer transition-all hover:-translate-y-0.5 shadow-md"
              onClick={openCreate}>+ Post a Job</button>
            <button className="px-5 py-2.5 bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/30 cursor-pointer transition-all hover:bg-white/30"
              onClick={() => navigate('/jobs')}>← Back to App</button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-6 mt-4 px-5 py-3 rounded-xl text-sm font-semibold bg-white border border-gray-200 shadow-md text-gray-700">
            {toast}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-6 gap-4 px-6 pt-5 max-xl:grid-cols-3 max-sm:grid-cols-1">
          {[
            { label: 'Active Jobs', value: dashboardStats?.activeJobs ?? stats.open, color: '#38a169', icon: '🟢' },
            { label: 'Closed Jobs', value: dashboardStats?.closedJobs ?? stats.closed, color: '#e53e3e', icon: '🔒' },
            { label: 'Applications', value: dashboardStats?.totalApplications ?? stats.applicants, color: '#f6ad55', icon: '👥' },
            { label: 'Shortlisted', value: dashboardStats?.shortlistedCandidates ?? 0, color: '#3182ce', icon: '⭐' },
            { label: 'Interviews', value: dashboardStats?.interviewsScheduled ?? 0, color: '#805ad5', icon: '📅' },
            { label: 'Total Views', value: dashboardStats?.totalViews ?? 0, color: '#667eea', icon: '👁' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-[0_4px_15px_rgba(0,0,0,0.06)] text-center border-t-4" style={{ borderColor: s.color }}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-3xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-5 flex-wrap">
          {[
            { id: 'jobs',        label: '💼 My Jobs' },
            { id: 'applicants',  label: `👥 Applicants${selectedJob ? ` — ${selectedJob.title}` : ''}` },
            { id: 'performance', label: '📈 Job Performance' },
            { id: 'analytics',   label: '📊 Analytics' },
          ].map(t => (
            <button key={t.id}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold border-2 cursor-pointer transition-all ${activeTab === t.id ? 'text-white border-transparent shadow-[0_4px_12px_rgba(102,126,234,0.4)]' : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'}`}
              style={activeTab === t.id ? { background: 'linear-gradient(135deg,#667eea,#764ba2)' } : {}}
              onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="px-6 py-5">

          {/* ── Jobs list ── */}
          {activeTab === 'jobs' && (
            loading ? (
              <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                Loading your jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-4">
                <div className="text-5xl">💼</div>
                <p className="text-lg font-semibold text-gray-600">No jobs posted yet.</p>
                <button className="px-6 py-3 text-white text-sm font-bold rounded-xl border-none cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }} onClick={openCreate}>+ Post Your First Job</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {jobs.map(job => (
                  <div key={job._id} className="bg-white rounded-2xl px-5 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-200 flex gap-4 items-start flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 m-0">{job.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${job.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>{job.status}</span>
                        {job.workMode && <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600">{job.workMode}</span>}
                      </div>
                      <p className="text-sm text-gray-500 m-0 mb-1">{job.company} · {job.location}</p>
                      <div className="flex gap-3 text-xs text-gray-500 flex-wrap">
                        <span>💰 {job.salary}</span>
                        {job.experienceRequired && <span>🧑‍💼 {job.experienceRequired}</span>}
                        <span>👥 {job.applicantCount || 0} applicants</span>
                        <span>🕐 {new Date(job.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap flex-shrink-0">
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border-none cursor-pointer hover:bg-blue-100 transition-colors"
                        onClick={() => handleSelectJob(job)}>👥 Applicants</button>
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border-none cursor-pointer hover:bg-indigo-100 transition-colors"
                        onClick={() => openEdit(job)}>✏️ Edit</button>
                      <button className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-none cursor-pointer transition-colors ${job.status === 'open' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
                        onClick={() => handleToggleStatus(job)}>{job.status === 'open' ? '🔒 Close' : '🔓 Reopen'}</button>
                      <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-700 border-none cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => setConfirmDelete(job._id)}>🗑 Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Applicants ── */}
          {activeTab === 'applicants' && (
            !selectedJob ? (
              <div className="text-center py-16 text-gray-400">
                <p>Select a job from the Jobs tab to view its applicants.</p>
                <button className="mt-4 px-5 py-2.5 text-sm font-semibold text-indigo-600 border-2 border-indigo-200 rounded-xl bg-white cursor-pointer hover:bg-indigo-50"
                  onClick={() => setActiveTab('jobs')}>Go to My Jobs →</button>
              </div>
            ) : appLoading ? (
              <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                Loading applicants...
              </div>
            ) : applicants.length === 0 ? (
              <div className="text-center py-16 text-gray-400">No applicants yet for this job.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {applicants.map(a => (
                  <div key={a.matchId} className="bg-white rounded-2xl px-5 py-4 shadow-[0_4px_15px_rgba(0,0,0,0.06)] border border-gray-200 flex items-center gap-4 flex-wrap">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                      {(a.user?.name || a.userId || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 m-0 mb-0.5">{a.user?.name || a.userId}</h3>
                      <p className="text-xs text-gray-500 m-0 mb-1">{a.user?.email || '—'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {a.matchScore > 0 && <span className="font-bold text-indigo-600">🎯 {a.matchScore}% match</span>}
                        {a.user?.experienceYears > 0 && <span>🧑‍💼 {a.user.experienceYears} yrs exp</span>}
                        {a.user?.skills?.length > 0 && <span>🛠 {a.user.skills.slice(0, 3).join(', ')}{a.user.skills.length > 3 ? '...' : ''}</span>}
                        {a.user?.location && <span>📍 {a.user.location}</span>}
                        <span>📅 {new Date(a.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <StatusBadge status={a.applicationStatus} />
                      <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 cursor-pointer outline-none"
                        value={a.applicationStatus}
                        onChange={e => handleUpdateStatus(a.matchId, e.target.value)}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {a.user?.linkedin && (
                          <a href={a.user.linkedin} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline no-underline">🔗 LinkedIn</a>
                        )}
                        {a.user?.github && (
                          <a href={a.user.github} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 hover:underline no-underline">💻 GitHub</a>
                        )}
                        {a.user?.resumeUrl && (
                          <a href={a.user.resumeUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-2.5 py-0.5 rounded-lg no-underline transition-colors">
                            📄 Resume
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ── Job Performance ── */}
          {activeTab === 'performance' && (
            <JobPerformancePanel dashboardStats={dashboardStats} />
          )}

          {/* ── Analytics ── */}
          {activeTab === 'analytics' && <RecruiterAnalyticsPanel />}

        </div>
      </div>

      {/* ── Job Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-5 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-[680px] max-h-[90vh] overflow-y-auto shadow-[0_30px_80px_rgba(0,0,0,0.3)] p-7 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 bg-gray-100 border-none text-2xl text-gray-500 w-9 h-9 rounded-full cursor-pointer flex items-center justify-center hover:bg-gray-200"
              onClick={() => setShowForm(false)}>×</button>
            <h2 className="text-xl font-extrabold text-gray-900 m-0 mb-6">{editingJob ? '✏️ Edit Job' : '📝 Post a New Job'}</h2>
            <form onSubmit={handleSubmitJob} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Job Title *</label><input value={jobForm.title} onChange={e => setJobForm(p => ({...p, title: e.target.value}))} required className={inputCls} placeholder="e.g. Senior React Developer" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Company *</label><input value={jobForm.company} onChange={e => setJobForm(p => ({...p, company: e.target.value}))} required className={inputCls} placeholder="Company name" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Location *</label><input value={jobForm.location} onChange={e => setJobForm(p => ({...p, location: e.target.value}))} required className={inputCls} placeholder="e.g. Bengaluru, India" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Salary</label><input value={jobForm.salary} onChange={e => setJobForm(p => ({...p, salary: e.target.value}))} className={inputCls} placeholder="e.g. ₹10L - ₹20L" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-700">Domain</label>
                  <select value={jobForm.domain} onChange={e => setJobForm(p => ({...p, domain: e.target.value}))} className={inputCls}>
                    <option value="">Select...</option>
                    {DOMAINS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-700">Work Mode</label>
                  <select value={jobForm.workMode} onChange={e => setJobForm(p => ({...p, workMode: e.target.value}))} className={inputCls}>
                    {WORK_MODES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-bold text-gray-700">Job Type</label>
                  <select value={jobForm.jobType} onChange={e => setJobForm(p => ({...p, jobType: e.target.value}))} className={inputCls}>
                    {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Experience Required</label><input value={jobForm.experienceRequired} onChange={e => setJobForm(p => ({...p, experienceRequired: e.target.value}))} className={inputCls} placeholder="e.g. 2-4 years" /></div>
                <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Application Deadline</label><input type="date" value={jobForm.deadline} onChange={e => setJobForm(p => ({...p, deadline: e.target.value}))} className={inputCls} /></div>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Required Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label><input value={jobForm.skillsRequired} onChange={e => setJobForm(p => ({...p, skillsRequired: e.target.value}))} className={inputCls} placeholder="e.g. React, Node.js, MongoDB" /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Job Description *</label><textarea rows={4} value={jobForm.description} onChange={e => setJobForm(p => ({...p, description: e.target.value}))} required className={`${inputCls} resize-y min-h-[100px]`} placeholder="Describe the role, responsibilities..." /></div>
              <div className="flex flex-col gap-1.5"><label className="text-[13px] font-bold text-gray-700">Company Description</label><textarea rows={2} value={jobForm.companyDescription} onChange={e => setJobForm(p => ({...p, companyDescription: e.target.value}))} className={`${inputCls} resize-y`} placeholder="Brief company overview..." /></div>

              {/* ── Phase 2: Responsibilities ── */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-gray-700">
                  Responsibilities <span className="text-gray-400 font-normal">(one per line)</span>
                </label>
                <textarea
                  rows={4}
                  value={jobForm.responsibilities}
                  onChange={e => setJobForm(p => ({...p, responsibilities: e.target.value}))}
                  className={`${inputCls} resize-y min-h-[90px]`}
                  placeholder={"• Lead and mentor the engineering team\n• Build scalable backend services\n• Review code and architecture"}
                />
              </div>

              {/* ── Phase 2: Recruiter Info ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[13px] font-black text-gray-700 mb-3">👤 Recruiter Information <span className="font-normal text-gray-400">(optional — shown on job detail page)</span></p>
                <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Recruiter Name</label>
                    <input value={jobForm.recruiterName} onChange={e => setJobForm(p => ({...p, recruiterName: e.target.value}))} className={inputCls} placeholder="e.g. Priya Sharma" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Recruiter Title</label>
                    <input value={jobForm.recruiterTitle} onChange={e => setJobForm(p => ({...p, recruiterTitle: e.target.value}))} className={inputCls} placeholder="e.g. HR Manager" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-bold text-gray-700">Recruiter Email</label>
                    <input type="email" value={jobForm.recruiterEmail} onChange={e => setJobForm(p => ({...p, recruiterEmail: e.target.value}))} className={inputCls} placeholder="recruiter@company.com" />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={formLoading}
                className="w-full py-3 text-white text-sm font-bold border-none rounded-xl cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)' }}>
                {formLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : editingJob ? '💾 Save Changes' : '🚀 Post Job'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm delete ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000]" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-8 w-[360px] shadow-[0_20px_60px_rgba(0,0,0,0.2)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-gray-900 m-0 mb-3">⚠️ Delete Job?</h3>
            <p className="text-sm text-gray-500 m-0 mb-6">This will permanently delete the job and cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button className="px-5 py-2.5 bg-gray-100 text-gray-700 border-none rounded-[10px] text-sm font-semibold cursor-pointer hover:bg-gray-200"
                onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="px-5 py-2.5 bg-red-500 text-white border-none rounded-[10px] text-sm font-bold cursor-pointer hover:bg-red-600"
                onClick={() => handleDelete(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
