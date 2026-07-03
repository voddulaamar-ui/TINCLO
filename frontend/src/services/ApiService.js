/**
 * ApiService.js — All backend API calls
 * JWT token is automatically attached to every request from localStorage.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

async function apiFetch(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('tinclo_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders, ...options.headers },
      ...options,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(err.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Network error: Unable to connect to server');
    throw error;
  }
}

const ApiService = {
  getBaseUrl: () => API_BASE_URL,

  // ── Auth ──────────────────────────────────────────────────────────────────
  async registerUser({ name, email, password, role }) {
    return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) });
  },
  async loginUser({ email, password }) {
    return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  async changePassword({ email, currentPassword, newPassword }) {
    return apiFetch('/auth/change-password', { method: 'POST', body: JSON.stringify({ email, currentPassword, newPassword }) });
  },
  async updateProfile({ email, name, phone, location, bio }) {
    return apiFetch('/auth/update-profile', { method: 'PUT', body: JSON.stringify({ email, name, phone, location, bio }) });
  },
  async updateCandidateProfile(data) {
    return apiFetch('/auth/update-candidate-profile', { method: 'PUT', body: JSON.stringify(data) });
  },
  async getMe() {
    return apiFetch('/auth/me');
  },

  // ── Jobs (public browse) ──────────────────────────────────────────────────
  async fetchJobs({ search, domain, workMode, jobType, location, company, salary, sort, page = 1 } = {}) {
    const p = new URLSearchParams();
    if (search)   p.set('search',   search);
    if (domain)   p.set('domain',   domain);
    if (workMode) p.set('workMode', workMode);
    if (jobType)  p.set('jobType',  jobType);
    if (location) p.set('location', location);
    if (company)  p.set('company',  company);
    if (salary)   p.set('salary',   salary);
    if (sort)     p.set('sort',     sort);
    p.set('page', page);
    return apiFetch(`/jobs?${p}`);
  },
  async fetchJob(jobId) {
    return apiFetch(`/jobs/${jobId}`);
  },
  async fetchExternalJobs({ query = 'software developer', location = 'India', page = 1 } = {}) {
    const p = new URLSearchParams({ query, location, page });
    return apiFetch(`/external-jobs?${p}`);
  },

  // ── Matches ───────────────────────────────────────────────────────────────
  async fetchUserMatches(userId) {
    return apiFetch(`/matches/user/${userId}`);
  },
  async createMatch(userId, jobId) {
    await this.ensureUserExists(userId);
    return apiFetch('/matches', { method: 'POST', body: JSON.stringify({ userId, jobId }) });
  },
  async markMatchApplied(matchId) {
    return apiFetch(`/matches/${matchId}/apply`, { method: 'PUT' });
  },
  async updateMatchStatus(matchId, status) {
    return apiFetch(`/matches/${matchId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  async deleteMatch(matchId) {
    return apiFetch(`/matches/${matchId}`, { method: 'DELETE' });
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async fetchUser(userId) {
    return apiFetch(`/users/${userId}`);
  },
  async ensureUserExists(userId) {
    return this.fetchUser(userId);
  },
  async createUser(userId) {
    return apiFetch('/users', { method: 'POST', body: JSON.stringify({ userId }) });
  },

  // ── Recruiter routes ──────────────────────────────────────────────────────
  async getRecruiterJobs() {
    return apiFetch('/recruiter/jobs');
  },
  async createRecruiterJob(data) {
    return apiFetch('/recruiter/jobs', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateRecruiterJob(jobId, data) {
    return apiFetch(`/recruiter/jobs/${jobId}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async updateRecruiterJobStatus(jobId, status) {
    return apiFetch(`/recruiter/jobs/${jobId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  async deleteRecruiterJob(jobId) {
    return apiFetch(`/recruiter/jobs/${jobId}`, { method: 'DELETE' });
  },
  async getJobApplicants(jobId) {
    return apiFetch(`/recruiter/jobs/${jobId}/applicants`);
  },
  async updateApplicationStatus(matchId, status) {
    return apiFetch(`/recruiter/applications/${matchId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },

  // ── Apply & email ─────────────────────────────────────────────────────────
  async applyToJob({ name, email, phone, experience, coverLetter, jobTitle, company, location, salary, jobId }) {
    return apiFetch('/apply', { method: 'POST', body: JSON.stringify({ name, email, phone, experience, coverLetter, jobTitle, company, location, salary, jobId }) });
  },
  async validateEmail(email) {
    return apiFetch('/apply/validate-email', { method: 'POST', body: JSON.stringify({ email }) });
  },

  // ── Job views ─────────────────────────────────────────────────────────────
  async trackJobView({ userId, jobId }) {
    return apiFetch('/job-views', { method: 'POST', body: JSON.stringify({ userId, jobId }) });
  },

  // ── Health ────────────────────────────────────────────────────────────────
  async checkHealth() {
    return apiFetch('/health');
  },
};

export default ApiService;
