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
  async fetchTrendingJobs(limit = 12) {
    return apiFetch(`/trending/jobs?limit=${limit}`);
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
  // Record a swipe-left (skip) for analytics tracking
  async skipJob(jobId) {
    return apiFetch('/matches/skip', { method: 'POST', body: JSON.stringify({ jobId }) });
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
  async addRecentView(jobId) {
    return apiFetch('/recent-views', { method: 'POST', body: JSON.stringify({ jobId }) });
  },
  async getRecentViews() {
    return apiFetch('/recent-views');
  },

  // Phase 2 dashboards
  async getCandidateDashboard() {
    return apiFetch('/dashboard/candidate');
  },
  async getRecruiterDashboardStats() {
    return apiFetch('/dashboard/recruiter');
  },

  // Notifications
  async getNotifications(params = {}) {
    const p = new URLSearchParams(params);
    return apiFetch(`/notifications?${p}`);
  },
  async markNotificationRead(notificationId) {
    return apiFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  },
  async markAllNotificationsRead() {
    return apiFetch('/notifications/read-all', { method: 'PATCH' });
  },
  async deleteNotification(notificationId) {
    return apiFetch(`/notifications/${notificationId}`, { method: 'DELETE' });
  },

  // Company pages
  async fetchCompanies(params = {}) {
    const p = new URLSearchParams(params);
    return apiFetch(`/companies?${p}`);
  },
  async fetchCompany(slug) {
    return apiFetch(`/companies/${slug}`);
  },
  async fetchFollowingCompanies() {
    return apiFetch('/companies/following/me');
  },
  async followCompany(slug) {
    return apiFetch(`/companies/${slug}/follow`, { method: 'POST' });
  },
  async unfollowCompany(slug) {
    return apiFetch(`/companies/${slug}/follow`, { method: 'DELETE' });
  },

  // Analytics and history
  async getCandidateAnalytics() {
    return apiFetch('/analytics/candidate');
  },
  async getRecruiterAnalytics() {
    return apiFetch('/analytics/recruiter');
  },
  async getSearchHistory() {
    return apiFetch('/search-history');
  },
  async saveSearchHistory(data) {
    return apiFetch('/search-history', { method: 'POST', body: JSON.stringify(data) });
  },
  async deleteSearchHistory(id) {
    return apiFetch(`/search-history/${id}`, { method: 'DELETE' });
  },
  async clearSearchHistory() {
    return apiFetch('/search-history', { method: 'DELETE' });
  },

  // ── Health ────────────────────────────────────────────────────────────────
  async checkHealth() {
    return apiFetch('/health');
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 4: Advanced Features
  // ══════════════════════════════════════════════════════════════════════════

  // ── Resume Parsing ────────────────────────────────────────────────────────
  async parseResume(formData) {
    const token = localStorage.getItem('tinclo_token');
    const res = await fetch(`${API_BASE_URL}/resume/parse`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData, // FormData (multipart)
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || 'Upload failed'); }
    return res.json();
  },
  async getProfileStrength() {
    return apiFetch('/resume/strength');
  },
  async getResumeVersions() {
    return apiFetch('/resume/versions');
  },
  async activateResume(index) {
    return apiFetch(`/resume/versions/${index}/activate`, { method: 'PATCH' });
  },
  async deleteResumeVersion(index) {
    return apiFetch(`/resume/versions/${index}`, { method: 'DELETE' });
  },

  // ── Interviews ────────────────────────────────────────────────────────────
  async scheduleInterview(data) {
    return apiFetch('/interviews', { method: 'POST', body: JSON.stringify(data) });
  },
  async getMyInterviews() {
    return apiFetch('/interviews/my');
  },
  async getRecruiterInterviews() {
    return apiFetch('/interviews/recruiter');
  },
  async acceptInterview(id) {
    return apiFetch(`/interviews/${id}/accept`, { method: 'PATCH' });
  },
  async rescheduleInterview(id, data) {
    return apiFetch(`/interviews/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  async cancelInterview(id) {
    return apiFetch(`/interviews/${id}/cancel`, { method: 'PATCH' });
  },
  async completeInterview(id, outcome) {
    return apiFetch(`/interviews/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ outcome }) });
  },
  async getInterviewTimeline(id) {
    return apiFetch(`/interviews/${id}/timeline`);
  },
  getInterviewIcsUrl(id) {
    return `${API_BASE_URL}/interviews/${id}/ics`;
  },

  // ── Offers ────────────────────────────────────────────────────────────────
  async createOffer(data) {
    return apiFetch('/offers', { method: 'POST', body: JSON.stringify(data) });
  },
  async getMyOffers() {
    return apiFetch('/offers/my');
  },
  async getRecruiterOffers() {
    return apiFetch('/offers/recruiter');
  },
  async getOffer(id) {
    return apiFetch(`/offers/${id}`);
  },
  async acceptOffer(id, response) {
    return apiFetch(`/offers/${id}/accept`, { method: 'PATCH', body: JSON.stringify({ response }) });
  },
  async rejectOffer(id, reason) {
    return apiFetch(`/offers/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) });
  },
  async withdrawOffer(id) {
    return apiFetch(`/offers/${id}/withdraw`, { method: 'PATCH' });
  },
  async updateOffer(id, data) {
    return apiFetch(`/offers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  // ── Saved Searches ────────────────────────────────────────────────────────
  async getSavedSearches() {
    return apiFetch('/saved-searches');
  },
  async createSavedSearch(data) {
    return apiFetch('/saved-searches', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateSavedSearch(id, data) {
    return apiFetch(`/saved-searches/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteSavedSearch(id) {
    return apiFetch(`/saved-searches/${id}`, { method: 'DELETE' });
  },
  async runSavedSearch(id) {
    return apiFetch(`/saved-searches/${id}/run`);
  },

  // ── Bookmark Collections ──────────────────────────────────────────────────
  async getBookmarkCollections() {
    return apiFetch('/bookmarks');
  },
  async createBookmarkCollection(data) {
    return apiFetch('/bookmarks', { method: 'POST', body: JSON.stringify(data) });
  },
  async updateBookmarkCollection(id, data) {
    return apiFetch(`/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async deleteBookmarkCollection(id) {
    return apiFetch(`/bookmarks/${id}`, { method: 'DELETE' });
  },
  async addJobToCollection(collectionId, jobId) {
    return apiFetch(`/bookmarks/${collectionId}/jobs`, { method: 'POST', body: JSON.stringify({ jobId }) });
  },
  async removeJobFromCollection(collectionId, jobId) {
    return apiFetch(`/bookmarks/${collectionId}/jobs/${jobId}`, { method: 'DELETE' });
  },
  async getCollectionJobs(collectionId) {
    return apiFetch(`/bookmarks/${collectionId}/jobs`);
  },

  // ── Career Insights ───────────────────────────────────────────────────────
  async getCareerInsights() {
    return apiFetch('/career-insights/overview');
  },
  async getSkillGap() {
    return apiFetch('/career-insights/skill-gap');
  },
  async getPersonalizedRecommendations() {
    return apiFetch('/career-insights/recommendations');
  },

  // ── Referrals ─────────────────────────────────────────────────────────────
  async createReferral(data) {
    return apiFetch('/referrals', { method: 'POST', body: JSON.stringify(data) });
  },
  async getMyReferrals() {
    return apiFetch('/referrals/my');
  },
  async getReferralsForMe() {
    return apiFetch('/referrals/for-me');
  },
  async updateReferralStatus(id, status) {
    return apiFetch(`/referrals/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  async validateReferralCode(code) {
    return apiFetch(`/referrals/validate/${code}`);
  },

  // ── Interview Feedback ────────────────────────────────────────────────────
  async submitInterviewFeedback(data) {
    return apiFetch('/interview-feedback', { method: 'POST', body: JSON.stringify(data) });
  },
  async getInterviewFeedback(interviewId) {
    return apiFetch(`/interview-feedback/interview/${interviewId}`);
  },
  async getCandidateFeedbacks(candidateId) {
    return apiFetch(`/interview-feedback/candidate/${candidateId}`);
  },
  async toggleFeedbackVisibility(id) {
    return apiFetch(`/interview-feedback/${id}/visibility`, { method: 'PATCH' });
  },

  // ── Portfolio ─────────────────────────────────────────────────────────────
  async getPortfolio(userId) {
    return apiFetch(`/portfolio/${userId || 'me'}`);
  },
  async updatePortfolio(data) {
    return apiFetch('/portfolio', { method: 'PUT', body: JSON.stringify(data) });
  },

  // ── Admin Advanced ────────────────────────────────────────────────────────
  async getAdminStats() {
    return apiFetch('/admin/advanced/stats');
  },
  async getAdminUsers(params = {}) {
    const p = new URLSearchParams(params);
    return apiFetch(`/admin/advanced/users?${p}`);
  },
  async suspendUser(userId) {
    return apiFetch(`/admin/advanced/users/${userId}/suspend`, { method: 'PATCH' });
  },
  async activateUser(userId) {
    return apiFetch(`/admin/advanced/users/${userId}/activate`, { method: 'PATCH' });
  },
  async verifyUser(userId) {
    return apiFetch(`/admin/advanced/users/${userId}/verify`, { method: 'PATCH' });
  },
  async changeUserRole(userId, role) {
    return apiFetch(`/admin/advanced/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
  },
  async adminDeleteJob(jobId) {
    return apiFetch(`/admin/advanced/jobs/${jobId}`, { method: 'DELETE' });
  },
  async sendAnnouncement(data) {
    return apiFetch('/admin/advanced/announcements', { method: 'POST', body: JSON.stringify(data) });
  },
  async approveCompany(companyId) {
    return apiFetch(`/admin/advanced/companies/${companyId}/approve`, { method: 'PATCH' });
  },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 5: Organization APIs
  // ══════════════════════════════════════════════════════════════════════════

  async createOrganization(data) { return apiFetch('/org', { method: 'POST', body: JSON.stringify(data) }); },
  async getMyOrganizations() { return apiFetch('/org/my'); },
  async getOrganization(orgId) { return apiFetch(`/org/${orgId}`); },
  async updateOrganization(orgId, data) { return apiFetch(`/org/${orgId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async getOrgMembers(orgId) { return apiFetch(`/org/${orgId}/members`); },
  async inviteOrgMember(orgId, data) { return apiFetch(`/org/${orgId}/members/invite`, { method: 'POST', body: JSON.stringify(data) }); },
  async changeOrgMemberRole(orgId, userId, role) { return apiFetch(`/org/${orgId}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); },
  async deactivateOrgMember(orgId, userId) { return apiFetch(`/org/${orgId}/members/${userId}/deactivate`, { method: 'PATCH' }); },
  async removeOrgMember(orgId, userId) { return apiFetch(`/org/${orgId}/members/${userId}`, { method: 'DELETE' }); },
  async getOrgDepartments(orgId) { return apiFetch(`/org/${orgId}/departments`); },
  async createDepartment(orgId, data) { return apiFetch(`/org/${orgId}/departments`, { method: 'POST', body: JSON.stringify(data) }); },
  async getOrgOffices(orgId) { return apiFetch(`/org/${orgId}/offices`); },
  async createOffice(orgId, data) { return apiFetch(`/org/${orgId}/offices`, { method: 'POST', body: JSON.stringify(data) }); },
  async getOrgPipeline(orgId, jobId) { return apiFetch(`/org/${orgId}/pipeline/${jobId}`); },
  async movePipelineCandidate(orgId, id, data) { return apiFetch(`/org/${orgId}/pipeline/${id}/move`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async assignPipelineCandidate(orgId, id, assignedTo) { return apiFetch(`/org/${orgId}/pipeline/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assignedTo }) }); },
  async addToPipeline(orgId, data) { return apiFetch(`/org/${orgId}/pipeline`, { method: 'POST', body: JSON.stringify(data) }); },
  async getCandidateNotes(orgId, candidateId) { return apiFetch(`/org/${orgId}/notes/${candidateId}`); },
  async addCandidateNote(orgId, data) { return apiFetch(`/org/${orgId}/notes`, { method: 'POST', body: JSON.stringify(data) }); },
  async setCandidateTags(orgId, candidateId, tags) { return apiFetch(`/org/${orgId}/tags/${candidateId}`, { method: 'PUT', body: JSON.stringify({ tags }) }); },
  async bulkMovePipeline(orgId, pipelineIds, stage) { return apiFetch(`/org/${orgId}/bulk/move`, { method: 'POST', body: JSON.stringify({ pipelineIds, stage }) }); },
  async bulkAssignPipeline(orgId, pipelineIds, assignedTo) { return apiFetch(`/org/${orgId}/bulk/assign`, { method: 'POST', body: JSON.stringify({ pipelineIds, assignedTo }) }); },
  async bulkRejectPipeline(orgId, pipelineIds, reason) { return apiFetch(`/org/${orgId}/bulk/reject`, { method: 'POST', body: JSON.stringify({ pipelineIds, reason }) }); },
  async getOrgAnalytics(orgId) { return apiFetch(`/org/${orgId}/analytics`); },
  async getOrgWorkload(orgId) { return apiFetch(`/org/${orgId}/workload`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 6: Messaging APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getConversations(filter) { return apiFetch(`/messaging/conversations${filter ? `?filter=${filter}` : ''}`); },
  async createConversation(data) { return apiFetch('/messaging/conversations', { method: 'POST', body: JSON.stringify(data) }); },
  async getConversation(id) { return apiFetch(`/messaging/conversations/${id}`); },
  async pinConversation(id) { return apiFetch(`/messaging/conversations/${id}/pin`, { method: 'PATCH' }); },
  async archiveConversation(id) { return apiFetch(`/messaging/conversations/${id}/archive`, { method: 'PATCH' }); },
  async setConversationLabels(id, labels) { return apiFetch(`/messaging/conversations/${id}/labels`, { method: 'PATCH', body: JSON.stringify({ labels }) }); },
  async addConversationMembers(id, userIds) { return apiFetch(`/messaging/conversations/${id}/members`, { method: 'POST', body: JSON.stringify({ userIds }) }); },
  async getMessages(conversationId, page = 1) { return apiFetch(`/messaging/messages/${conversationId}?page=${page}`); },
  async sendMessage(data) { return apiFetch('/messaging/messages', { method: 'POST', body: JSON.stringify(data) }); },
  async editMessage(id, content) { return apiFetch(`/messaging/messages/${id}/edit`, { method: 'PATCH', body: JSON.stringify({ content }) }); },
  async deleteMessage(id, forAll = false) { return apiFetch(`/messaging/messages/${id}?forAll=${forAll}`, { method: 'DELETE' }); },
  async addReaction(messageId, emoji) { return apiFetch(`/messaging/messages/${messageId}/reactions`, { method: 'POST', body: JSON.stringify({ emoji }) }); },
  async markMessageRead(messageId) { return apiFetch(`/messaging/messages/${messageId}/read`, { method: 'PATCH' }); },
  async searchMessages(q, conversationId) { return apiFetch(`/messaging/search?q=${encodeURIComponent(q)}${conversationId ? `&conversationId=${conversationId}` : ''}`); },
  async getChatAnalytics() { return apiFetch('/messaging/analytics'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 8: AI & Automation APIs
  // ══════════════════════════════════════════════════════════════════════════

  async aiChat(message, conversationId, context) { return apiFetch('/ai/chat', { method: 'POST', body: JSON.stringify({ message, conversationId, context }) }); },
  async getAiConversations() { return apiFetch('/ai/conversations'); },
  async getAiConversation(id) { return apiFetch(`/ai/conversations/${id}`); },
  async deleteAiConversation(id) { return apiFetch(`/ai/conversations/${id}`, { method: 'DELETE' }); },
  async aiGenerateJobDescription(data) { return apiFetch('/ai/generate-job-description', { method: 'POST', body: JSON.stringify(data) }); },
  async aiOptimizeJobDescription(description) { return apiFetch('/ai/optimize-job-description', { method: 'POST', body: JSON.stringify({ description }) }); },
  async aiInterviewQuestions(data) { return apiFetch('/ai/interview-questions', { method: 'POST', body: JSON.stringify(data) }); },
  async aiScoreResume(data) { return apiFetch('/ai/score-resume', { method: 'POST', body: JSON.stringify(data) }); },
  async aiCoverLetter(data) { return apiFetch('/ai/cover-letter', { method: 'POST', body: JSON.stringify(data) }); },
  async aiGenerateEmail(data) { return apiFetch('/ai/generate-email', { method: 'POST', body: JSON.stringify(data) }); },
  async aiSalaryPrediction(data) { return apiFetch('/ai/salary-prediction', { method: 'POST', body: JSON.stringify(data) }); },
  async aiCareerAdvice(data) { return apiFetch('/ai/career-advice', { method: 'POST', body: JSON.stringify(data) }); },
  async aiSkillGap(data) { return apiFetch('/ai/skill-gap', { method: 'POST', body: JSON.stringify(data) }); },
  async aiRankCandidates(data) { return apiFetch('/ai/rank-candidates', { method: 'POST', body: JSON.stringify(data) }); },
  async aiSummarizeJob(description) { return apiFetch('/ai/summarize-job', { method: 'POST', body: JSON.stringify({ description }) }); },
  async aiCompanyInsights(company) { return apiFetch(`/ai/company-insights/${encodeURIComponent(company)}`); },
  async aiParseSearch(query) { return apiFetch('/ai/parse-search', { method: 'POST', body: JSON.stringify({ query }) }); },
  async getAiConfig() { return apiFetch('/ai/config'); },
  async getAiUsage() { return apiFetch('/ai/usage'); },
  async getAutomationLogs() { return apiFetch('/ai/automation/logs'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 9: Learning Platform APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getLearningDashboard() { return apiFetch('/learning/dashboard'); },
  async getCourses(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/learning/courses?${p}`); },
  async getCourse(id) { return apiFetch(`/learning/courses/${id}`); },
  async createCourse(data) { return apiFetch('/learning/courses', { method: 'POST', body: JSON.stringify(data) }); },
  async enrollCourse(id) { return apiFetch(`/learning/courses/${id}/enroll`, { method: 'POST' }); },
  async completeLesson(id) { return apiFetch(`/learning/lessons/${id}/complete`, { method: 'POST' }); },
  async getLearningProgress() { return apiFetch('/learning/progress'); },
  async getQuiz(id) { return apiFetch(`/learning/quizzes/${id}`); },
  async submitQuiz(id, answers) { return apiFetch(`/learning/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }); },
  async getChallenges(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/learning/challenges?${p}`); },
  async getChallenge(id) { return apiFetch(`/learning/challenges/${id}`); },
  async submitChallenge(id, code, language) { return apiFetch(`/learning/challenges/${id}/submit`, { method: 'POST', body: JSON.stringify({ code, language }) }); },
  async getCertificates() { return apiFetch('/learning/certificates'); },
  async generateCertificate(data) { return apiFetch('/learning/certificates/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async getLeaderboard(type) { return apiFetch(`/learning/leaderboards/${type}`); },
  async getCommunityPosts(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/learning/community?${p}`); },
  async createCommunityPost(data) { return apiFetch('/learning/community', { method: 'POST', body: JSON.stringify(data) }); },
  async voteCommunityPost(id, vote) { return apiFetch(`/learning/community/${id}/vote`, { method: 'POST', body: JSON.stringify({ vote }) }); },
  async getPostComments(id) { return apiFetch(`/learning/community/${id}/comments`); },
  async addPostComment(id, content, parentId) { return apiFetch(`/learning/community/${id}/comments`, { method: 'POST', body: JSON.stringify({ content, parentId }) }); },
  async getEvents(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/learning/events?${p}`); },
  async createEvent(data) { return apiFetch('/learning/events', { method: 'POST', body: JSON.stringify(data) }); },
  async registerForEvent(id) { return apiFetch(`/learning/events/${id}/register`, { method: 'POST' }); },
  async getMentors(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/learning/mentors?${p}`); },
  async registerAsMentor(data) { return apiFetch('/learning/mentors/register', { method: 'POST', body: JSON.stringify(data) }); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 10: Gamification APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getGamificationProfile() { return apiFetch('/gamification/profile'); },
  async getXpHistory() { return apiFetch('/gamification/xp-history'); },
  async checkinStreak(type) { return apiFetch('/gamification/streaks/checkin', { method: 'POST', body: JSON.stringify({ type }) }); },
  async getStreaks() { return apiFetch('/gamification/streaks'); },
  async getGamificationChallenges(type) { return apiFetch(`/gamification/challenges${type ? `?type=${type}` : ''}`); },
  async getAchievements() { return apiFetch('/gamification/achievements'); },
  async getBadges() { return apiFetch('/gamification/badges'); },
  async getGoals() { return apiFetch('/gamification/goals'); },
  async createGoal(data) { return apiFetch('/gamification/goals', { method: 'POST', body: JSON.stringify(data) }); },
  async deleteGoal(id) { return apiFetch(`/gamification/goals/${id}`, { method: 'DELETE' }); },
  async getGamificationLeaderboard() { return apiFetch('/gamification/leaderboard'); },
  async getXpConfig() { return apiFetch('/gamification/xp-config'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 11: SaaS & Billing APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getSubscriptionPlans() { return apiFetch('/billing/plans'); },
  async getSubscription(orgId) { return apiFetch(`/billing/subscription/${orgId}`); },
  async subscribe(orgId, data) { return apiFetch(`/billing/subscription/${orgId}/subscribe`, { method: 'POST', body: JSON.stringify(data) }); },
  async cancelSubscription(orgId) { return apiFetch(`/billing/subscription/${orgId}/cancel`, { method: 'POST' }); },
  async getInvoices(orgId) { return apiFetch(`/billing/invoices/${orgId}`); },
  async getPayments(orgId) { return apiFetch(`/billing/payments/${orgId}`); },
  async recordPayment(orgId, data) { return apiFetch(`/billing/payments/${orgId}/record`, { method: 'POST', body: JSON.stringify(data) }); },
  async getUsage(orgId) { return apiFetch(`/billing/usage/${orgId}`); },
  async validateCoupon(code) { return apiFetch('/billing/coupons/validate', { method: 'POST', body: JSON.stringify({ code }) }); },
  async getApiKeys(orgId) { return apiFetch(`/billing/api-keys/${orgId}`); },
  async createApiKey(orgId, data) { return apiFetch(`/billing/api-keys/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async deleteApiKey(orgId, keyId) { return apiFetch(`/billing/api-keys/${orgId}/${keyId}`, { method: 'DELETE' }); },
  async getWebhooks(orgId) { return apiFetch(`/billing/webhooks/${orgId}`); },
  async createWebhook(orgId, data) { return apiFetch(`/billing/webhooks/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async deleteWebhook(orgId, whId) { return apiFetch(`/billing/webhooks/${orgId}/${whId}`, { method: 'DELETE' }); },
  async getSupportTickets() { return apiFetch('/billing/support'); },
  async createSupportTicket(data) { return apiFetch('/billing/support', { method: 'POST', body: JSON.stringify(data) }); },
  async replySupportTicket(id, content) { return apiFetch(`/billing/support/${id}/reply`, { method: 'POST', body: JSON.stringify({ content }) }); },
  async getRevenueAnalytics() { return apiFetch('/billing/revenue'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 12: Integration APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getIntegrationMarketplace(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/integrations/marketplace?${p}`); },
  async getIntegrationProvider(key) { return apiFetch(`/integrations/marketplace/${key}`); },
  async getConnections() { return apiFetch('/integrations/connections'); },
  async connectIntegration(data) { return apiFetch('/integrations/connections', { method: 'POST', body: JSON.stringify(data) }); },
  async disconnectIntegration(providerKey) { return apiFetch(`/integrations/connections/${providerKey}`, { method: 'DELETE' }); },
  async updateIntegrationSettings(providerKey, settings) { return apiFetch(`/integrations/connections/${providerKey}/settings`, { method: 'PATCH', body: JSON.stringify(settings) }); },
  async getOAuthUrl(providerKey) { return apiFetch(`/integrations/oauth/${providerKey}/url`); },
  async triggerSync(providerKey) { return apiFetch(`/integrations/sync/${providerKey}`, { method: 'POST' }); },
  async createCalendarEvent(data) { return apiFetch('/integrations/calendar/create-event', { method: 'POST', body: JSON.stringify(data) }); },
  async createMeeting(data) { return apiFetch('/integrations/meetings/create', { method: 'POST', body: JSON.stringify(data) }); },
  async getIntegrationLogs(providerKey) { return apiFetch(`/integrations/logs${providerKey ? `?providerKey=${providerKey}` : ''}`); },
  async getIntegrationAdminStats() { return apiFetch('/integrations/admin/stats'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 13: Super Admin Console APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getSuperAdminDashboard() { return apiFetch('/super-admin/dashboard'); },
  async getSystemSettings() { return apiFetch('/super-admin/settings'); },
  async updateSystemSettings(data) { return apiFetch('/super-admin/settings', { method: 'PUT', body: JSON.stringify(data) }); },
  async getFeatureFlags() { return apiFetch('/super-admin/feature-flags'); },
  async updateFeatureFlag(key, data) { return apiFetch(`/super-admin/feature-flags/${key}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async getContentPages(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/content?${p}`); },
  async createContentPage(data) { return apiFetch('/super-admin/content', { method: 'POST', body: JSON.stringify(data) }); },
  async updateContentPage(id, data) { return apiFetch(`/super-admin/content/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteContentPage(id) { return apiFetch(`/super-admin/content/${id}`, { method: 'DELETE' }); },
  async getVerificationRequests(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/verifications?${p}`); },
  async reviewVerification(id, data) { return apiFetch(`/super-admin/verifications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getReports(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/reports?${p}`); },
  async updateReport(id, data) { return apiFetch(`/super-admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getSecurityEvents(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/security?${p}`); },
  async resolveSecurityEvent(id) { return apiFetch(`/super-admin/security/${id}/resolve`, { method: 'PATCH' }); },
  async getAuditLogs(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/audit-logs?${p}`); },
  async getSystemHealth() { return apiFetch('/super-admin/health'); },
  async getAdminJobs(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/super-admin/jobs?${p}`); },
  async moderateJob(id, action) { return apiFetch(`/super-admin/jobs/${id}/moderate`, { method: 'PATCH', body: JSON.stringify({ action }) }); },
  async exportData(collection) { return apiFetch(`/super-admin/export/${collection}`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 15: Globalization & Enterprise APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getRegions() { return apiFetch('/global/regions'); },
  async getLanguages() { return apiFetch('/global/languages'); },
  async getCurrencies() { return apiFetch('/global/currencies'); },
  async getCompliancePolicies() { return apiFetch('/global/compliance'); },
  async submitPrivacyRequest(data) { return apiFetch('/global/privacy/request', { method: 'POST', body: JSON.stringify(data) }); },
  async getPrivacyRequests() { return apiFetch('/global/privacy/requests'); },
  async processPrivacyRequest(id, data) { return apiFetch(`/global/privacy/requests/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getWorkflows(orgId) { return apiFetch(`/global/workflows/${orgId}`); },
  async createWorkflow(orgId, data) { return apiFetch(`/global/workflows/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async updateWorkflow(orgId, id, data) { return apiFetch(`/global/workflows/${orgId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteWorkflow(orgId, id) { return apiFetch(`/global/workflows/${orgId}/${id}`, { method: 'DELETE' }); },
  async getGlobalMarketplace(category) { return apiFetch(`/global/marketplace${category ? `?category=${category}` : ''}`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 16: Business Intelligence APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getBiExecutive() { return apiFetch('/bi/executive'); },
  async getBiKpis(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bi/kpis?${p}`); },
  async getBiFunnel() { return apiFetch('/bi/funnel'); },
  async getBiSkillsDemand() { return apiFetch('/bi/skills-demand'); },
  async getBiSalary(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bi/salary?${p}`); },
  async getBiGeographic() { return apiFetch('/bi/geographic'); },
  async getBiTrends() { return apiFetch('/bi/trends'); },
  async getBiForecasts(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bi/forecasts?${p}`); },
  async generateForecast(data) { return apiFetch('/bi/forecasts/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async getBiDashboards() { return apiFetch('/bi/dashboards'); },
  async createBiDashboard(data) { return apiFetch('/bi/dashboards', { method: 'POST', body: JSON.stringify(data) }); },
  async updateBiDashboard(id, data) { return apiFetch(`/bi/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteBiDashboard(id) { return apiFetch(`/bi/dashboards/${id}`, { method: 'DELETE' }); },
  async getBiScheduledReports() { return apiFetch('/bi/reports/scheduled'); },
  async createBiScheduledReport(data) { return apiFetch('/bi/reports/scheduled', { method: 'POST', body: JSON.stringify(data) }); },
  async deleteBiScheduledReport(id) { return apiFetch(`/bi/reports/scheduled/${id}`, { method: 'DELETE' }); },
  async getBiSources() { return apiFetch('/bi/sources'); },
  async getBiDiversity() { return apiFetch('/bi/diversity'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 17: Talent Marketplace APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getFreelancers(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/marketplace/freelancers?${p}`); },
  async getMyFreelancerProfile() { return apiFetch('/marketplace/freelancers/me'); },
  async updateFreelancerProfile(data) { return apiFetch('/marketplace/freelancers/me', { method: 'PUT', body: JSON.stringify(data) }); },
  async getMarketplaceProjects(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/marketplace/projects?${p}`); },
  async createMarketplaceProject(data) { return apiFetch('/marketplace/projects', { method: 'POST', body: JSON.stringify(data) }); },
  async getMarketplaceProject(id) { return apiFetch(`/marketplace/projects/${id}`); },
  async awardProject(id, freelancerId) { return apiFetch(`/marketplace/projects/${id}/award`, { method: 'PATCH', body: JSON.stringify({ freelancerId }) }); },
  async completeProject(id) { return apiFetch(`/marketplace/projects/${id}/complete`, { method: 'PATCH' }); },
  async getProjectProposals(projectId) { return apiFetch(`/marketplace/projects/${projectId}/proposals`); },
  async submitProposal(projectId, data) { return apiFetch(`/marketplace/projects/${projectId}/proposals`, { method: 'POST', body: JSON.stringify(data) }); },
  async getContracts() { return apiFetch('/marketplace/contracts'); },
  async createContract(data) { return apiFetch('/marketplace/contracts', { method: 'POST', body: JSON.stringify(data) }); },
  async signContract(id) { return apiFetch(`/marketplace/contracts/${id}/sign`, { method: 'PATCH' }); },
  async getWallet() { return apiFetch('/marketplace/wallet'); },
  async depositWallet(amount) { return apiFetch('/marketplace/wallet/deposit', { method: 'POST', body: JSON.stringify({ amount }) }); },
  async withdrawWallet(amount) { return apiFetch('/marketplace/wallet/withdraw', { method: 'POST', body: JSON.stringify({ amount }) }); },
  async submitMarketplaceReview(data) { return apiFetch('/marketplace/reviews', { method: 'POST', body: JSON.stringify(data) }); },
  async getUserReviews(userId) { return apiFetch(`/marketplace/reviews/${userId}`); },
  async getMyMarketplaceProjects() { return apiFetch('/marketplace/my-projects'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 18: HRMS APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getEmployees(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/employees?${p}`); },
  async createEmployee(orgId, data) { return apiFetch(`/hrms/${orgId}/employees`, { method: 'POST', body: JSON.stringify(data) }); },
  async getEmployee(orgId, empId) { return apiFetch(`/hrms/${orgId}/employees/${empId}`); },
  async updateEmployee(orgId, empId, data) { return apiFetch(`/hrms/${orgId}/employees/${empId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async checkIn(orgId, method) { return apiFetch(`/hrms/${orgId}/attendance/checkin`, { method: 'POST', body: JSON.stringify({ method }) }); },
  async checkOut(orgId) { return apiFetch(`/hrms/${orgId}/attendance/checkout`, { method: 'POST' }); },
  async getAttendance(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/attendance?${p}`); },
  async applyLeave(orgId, data) { return apiFetch(`/hrms/${orgId}/leaves`, { method: 'POST', body: JSON.stringify(data) }); },
  async getLeaves(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/leaves?${p}`); },
  async approveLeave(orgId, id) { return apiFetch(`/hrms/${orgId}/leaves/${id}/approve`, { method: 'PATCH' }); },
  async rejectLeave(orgId, id, reason) { return apiFetch(`/hrms/${orgId}/leaves/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }); },
  async getPayroll(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/payroll?${p}`); },
  async createPayroll(orgId, data) { return apiFetch(`/hrms/${orgId}/payroll`, { method: 'POST', body: JSON.stringify(data) }); },
  async getPerformanceReviews(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/performance?${p}`); },
  async submitPerformanceReview(orgId, data) { return apiFetch(`/hrms/${orgId}/performance`, { method: 'POST', body: JSON.stringify(data) }); },
  async getOkrs(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/okrs?${p}`); },
  async createOkr(orgId, data) { return apiFetch(`/hrms/${orgId}/okrs`, { method: 'POST', body: JSON.stringify(data) }); },
  async updateOkrProgress(orgId, id, data) { return apiFetch(`/hrms/${orgId}/okrs/${id}/progress`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getAssets(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/hrms/${orgId}/assets?${p}`); },
  async assignAsset(orgId, data) { return apiFetch(`/hrms/${orgId}/assets`, { method: 'POST', body: JSON.stringify(data) }); },
  async returnAsset(orgId, id, condition) { return apiFetch(`/hrms/${orgId}/assets/${id}/return`, { method: 'PATCH', body: JSON.stringify({ condition }) }); },
  async getHrAnalytics(orgId) { return apiFetch(`/hrms/${orgId}/analytics`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 19: Assessment Platform APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getAssessments(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/assessments?${p}`); },
  async createAssessment(data) { return apiFetch('/assessments', { method: 'POST', body: JSON.stringify(data) }); },
  async getAssessment(id) { return apiFetch(`/assessments/${id}`); },
  async updateAssessment(id, data) { return apiFetch(`/assessments/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteAssessment(id) { return apiFetch(`/assessments/${id}`, { method: 'DELETE' }); },
  async getQuestionBank(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/assessments/questions/bank?${p}`); },
  async createQuestion(data) { return apiFetch('/assessments/questions', { method: 'POST', body: JSON.stringify(data) }); },
  async startAssessment(id) { return apiFetch(`/assessments/${id}/start`, { method: 'POST' }); },
  async submitAssessment(id, data) { return apiFetch(`/assessments/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }); },
  async getAssessmentResults(id) { return apiFetch(`/assessments/${id}/results`); },
  async getMyAssessmentResult(id) { return apiFetch(`/assessments/${id}/my-result`); },
  async reportViolation(id, data) { return apiFetch(`/assessments/${id}/violation`, { method: 'POST', body: JSON.stringify(data) }); },
  async getLiveMonitoring(id) { return apiFetch(`/assessments/${id}/live`); },
  async getAssessmentAnalytics(id) { return apiFetch(`/assessments/${id}/analytics`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 20: AI Copilot APIs
  // ══════════════════════════════════════════════════════════════════════════

  async copilotBuildResume(data) { return apiFetch('/copilot/resume/build', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotOptimizeResume(data) { return apiFetch('/copilot/resume/optimize', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotTailorResume(data) { return apiFetch('/copilot/resume/tailor', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotCareerPlan(data) { return apiFetch('/copilot/career-plan', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotGetCareerPlans() { return apiFetch('/copilot/career-plan'); },
  async copilotSkillRoadmap(data) { return apiFetch('/copilot/skill-roadmap', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotInterviewPractice(data) { return apiFetch('/copilot/interview/practice', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotEvaluateAnswer(data) { return apiFetch('/copilot/interview/evaluate', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotSalaryAdvice(data) { return apiFetch('/copilot/salary-advice', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotCoverLetter(data) { return apiFetch('/copilot/cover-letter', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotPortfolioReview(data) { return apiFetch('/copilot/portfolio/review', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotRankCandidates(data) { return apiFetch('/copilot/rank-candidates', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotGetRankings(jobId) { return apiFetch(`/copilot/rankings/${jobId}`); },
  async copilotCompareCandidates(data) { return apiFetch('/copilot/compare-candidates', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotGenerateJD(data) { return apiFetch('/copilot/job-description/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotOptimizeJD(description) { return apiFetch('/copilot/job-description/optimize', { method: 'POST', body: JSON.stringify({ description }) }); },
  async copilotInterviewSummary(data) { return apiFetch('/copilot/interview/summarize', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotGenerateEmail(data) { return apiFetch('/copilot/email/generate', { method: 'POST', body: JSON.stringify(data) }); },
  async copilotTalentSearch(query) { return apiFetch('/copilot/search', { method: 'POST', body: JSON.stringify({ query }) }); },
  async copilotChat(message, conversationId, context) { return apiFetch('/copilot/chat', { method: 'POST', body: JSON.stringify({ message, conversationId, context }) }); },
  async copilotGetPrompts() { return apiFetch('/copilot/prompts'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 21: Plugin Marketplace APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getPluginMarketplace(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/plugins/marketplace?${p}`); },
  async getPlugin(key) { return apiFetch(`/plugins/marketplace/${key}`); },
  async getInstalledPlugins(orgId) { return apiFetch(`/plugins/installed/${orgId}`); },
  async installPlugin(orgId, pluginKey) { return apiFetch(`/plugins/install/${orgId}`, { method: 'POST', body: JSON.stringify({ pluginKey }) }); },
  async uninstallPlugin(orgId, pluginKey) { return apiFetch(`/plugins/uninstall/${orgId}/${pluginKey}`, { method: 'DELETE' }); },
  async togglePlugin(orgId, pluginKey) { return apiFetch(`/plugins/toggle/${orgId}/${pluginKey}`, { method: 'PATCH' }); },
  async updatePluginSettings(orgId, pluginKey, settings) { return apiFetch(`/plugins/settings/${orgId}/${pluginKey}`, { method: 'PATCH', body: JSON.stringify({ settings }) }); },
  async submitPluginReview(pluginId, data) { return apiFetch(`/plugins/reviews/${pluginId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async submitPlugin(data) { return apiFetch('/plugins/developer/submit', { method: 'POST', body: JSON.stringify(data) }); },
  async getMyPlugins() { return apiFetch('/plugins/developer/my-plugins'); },
  async updateMyPlugin(id, data) { return apiFetch(`/plugins/developer/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async approvePlugin(id) { return apiFetch(`/plugins/admin/approve/${id}`, { method: 'PATCH' }); },
  async rejectPlugin(id) { return apiFetch(`/plugins/admin/reject/${id}`, { method: 'PATCH' }); },
  async getPendingPlugins() { return apiFetch('/plugins/admin/pending'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 22: Workflow Builder APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getWorkflowList(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/workflows/${orgId}?${p}`); },
  async createWorkflowDef(orgId, data) { return apiFetch(`/workflows/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async getWorkflowDef(orgId, id) { return apiFetch(`/workflows/${orgId}/${id}`); },
  async updateWorkflowDef(orgId, id, data) { return apiFetch(`/workflows/${orgId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteWorkflowDef(orgId, id) { return apiFetch(`/workflows/${orgId}/${id}`, { method: 'DELETE' }); },
  async publishWorkflow(orgId, id) { return apiFetch(`/workflows/${orgId}/${id}/publish`, { method: 'PATCH' }); },
  async executeWorkflow(orgId, id, data) { return apiFetch(`/workflows/${orgId}/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }); },
  async getWorkflowExecutions(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/workflows/${orgId}/executions/list?${p}`); },
  async getWorkflowExecution(orgId, execId) { return apiFetch(`/workflows/${orgId}/executions/${execId}`); },
  async cancelWorkflowExecution(orgId, execId) { return apiFetch(`/workflows/${orgId}/executions/${execId}/cancel`, { method: 'PATCH' }); },
  async getWorkflowApprovals(orgId) { return apiFetch(`/workflows/${orgId}/approvals`); },
  async respondToApproval(orgId, id, decision, comment) { return apiFetch(`/workflows/${orgId}/approvals/${id}/respond`, { method: 'PATCH', body: JSON.stringify({ decision, comment }) }); },
  async getWorkflowTemplates(category) { return apiFetch(`/workflows/templates/list${category ? `?category=${category}` : ''}`); },
  async createFromTemplate(orgId, templateId, name) { return apiFetch(`/workflows/${orgId}/from-template/${templateId}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  async simulateWorkflow(orgId, id) { return apiFetch(`/workflows/${orgId}/${id}/simulate`, { method: 'POST' }); },
  async getWorkflowAnalytics(orgId) { return apiFetch(`/workflows/${orgId}/analytics/summary`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 23: TINCLO Flow (Automation) APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getAutomations(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/automations/${orgId}?${p}`); },
  async createAutomation(orgId, data) { return apiFetch(`/automations/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async getAutomation(orgId, id) { return apiFetch(`/automations/${orgId}/${id}`); },
  async updateAutomation(orgId, id, data) { return apiFetch(`/automations/${orgId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteAutomation(orgId, id) { return apiFetch(`/automations/${orgId}/${id}`, { method: 'DELETE' }); },
  async activateAutomation(orgId, id) { return apiFetch(`/automations/${orgId}/${id}/activate`, { method: 'PATCH' }); },
  async pauseAutomation(orgId, id) { return apiFetch(`/automations/${orgId}/${id}/pause`, { method: 'PATCH' }); },
  async runAutomation(orgId, id, data) { return apiFetch(`/automations/${orgId}/${id}/run`, { method: 'POST', body: JSON.stringify(data) }); },
  async getAutomationExecutions(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/automations/${orgId}/executions/list?${p}`); },
  async getAutomationExecution(orgId, execId) { return apiFetch(`/automations/${orgId}/executions/${execId}`); },
  async cancelAutomationExecution(orgId, execId) { return apiFetch(`/automations/${orgId}/executions/${execId}/cancel`, { method: 'PATCH' }); },
  async retryAutomationExecution(orgId, execId) { return apiFetch(`/automations/${orgId}/executions/${execId}/retry`, { method: 'PATCH' }); },
  async getAutomationTemplates(category) { return apiFetch(`/automations/templates/all${category ? `?category=${category}` : ''}`); },
  async createAutomationFromTemplate(orgId, templateId, name) { return apiFetch(`/automations/${orgId}/from-template/${templateId}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  async getAutomationAnalytics(orgId) { return apiFetch(`/automations/${orgId}/analytics/summary`); },
  async getAutomationMonitoring(orgId) { return apiFetch(`/automations/${orgId}/monitoring`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 24: Developer Platform APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getDeveloperApps() { return apiFetch('/developer/apps'); },
  async createDeveloperApp(data) { return apiFetch('/developer/apps', { method: 'POST', body: JSON.stringify(data) }); },
  async getDeveloperApp(clientId) { return apiFetch(`/developer/apps/${clientId}`); },
  async updateDeveloperApp(clientId, data) { return apiFetch(`/developer/apps/${clientId}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteDeveloperApp(clientId) { return apiFetch(`/developer/apps/${clientId}`, { method: 'DELETE' }); },
  async rotateAppSecret(clientId) { return apiFetch(`/developer/apps/${clientId}/rotate-secret`, { method: 'POST' }); },
  async oauthAuthorize(params) { const p = new URLSearchParams(params); return apiFetch(`/developer/oauth/authorize?${p}`); },
  async oauthToken(data) { return apiFetch('/developer/oauth/token', { method: 'POST', body: JSON.stringify(data) }); },
  async getWebhookDeliveries(appId) { return apiFetch(`/developer/webhooks/deliveries?appId=${appId || ''}`); },
  async testWebhook(data) { return apiFetch('/developer/webhooks/test', { method: 'POST', body: JSON.stringify(data) }); },
  async getDeveloperAnalytics() { return apiFetch('/developer/analytics'); },
  async getDeveloperLogs(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/developer/logs?${p}`); },
  async getSandboxStatus() { return apiFetch('/developer/sandbox/status'); },
  async getApiDocs() { return apiFetch('/developer/docs/modules'); },
  async getChangelog() { return apiFetch('/developer/changelog'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 25: Native Mobile APIs
  // ══════════════════════════════════════════════════════════════════════════

  async registerDevice(data) { return apiFetch('/mobile/devices/register', { method: 'POST', body: JSON.stringify(data) }); },
  async getDevices() { return apiFetch('/mobile/devices'); },
  async removeDevice(deviceId) { return apiFetch(`/mobile/devices/${deviceId}`, { method: 'DELETE' }); },
  async logoutAllDevices() { return apiFetch('/mobile/devices/logout-all', { method: 'POST' }); },
  async updatePushToken(deviceId, pushToken) { return apiFetch(`/mobile/devices/${deviceId}/token`, { method: 'PATCH', body: JSON.stringify({ pushToken }) }); },
  async queueOfflineActions(actions, deviceId) { return apiFetch('/mobile/sync/queue', { method: 'POST', body: JSON.stringify({ actions, deviceId }) }); },
  async processOfflineSync() { return apiFetch('/mobile/sync/process', { method: 'POST' }); },
  async getSyncStatus() { return apiFetch('/mobile/sync/status'); },
  async getMobileConfig() { return apiFetch('/mobile/config'); },
  async resolveDeepLink(path) { return apiFetch(`/mobile/deep-link/resolve?path=${encodeURIComponent(path)}`); },
  async enableBiometric(data) { return apiFetch('/mobile/biometric/enable', { method: 'POST', body: JSON.stringify(data) }); },
  async verifyBiometric(deviceId) { return apiFetch('/mobile/biometric/verify', { method: 'POST', body: JSON.stringify({ deviceId }) }); },
  async reportMobileEvent(data) { return apiFetch('/mobile/analytics/event', { method: 'POST', body: JSON.stringify(data) }); },
  async reportCrash(data) { return apiFetch('/mobile/analytics/crash', { method: 'POST', body: JSON.stringify(data) }); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 26: AI Studio APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getAiAssistants(orgId) { return apiFetch(`/ai-studio/${orgId}/assistants`); },
  async createAiAssistant(orgId, data) { return apiFetch(`/ai-studio/${orgId}/assistants`, { method: 'POST', body: JSON.stringify(data) }); },
  async getAiAssistant(orgId, id) { return apiFetch(`/ai-studio/${orgId}/assistants/${id}`); },
  async updateAiAssistant(orgId, id, data) { return apiFetch(`/ai-studio/${orgId}/assistants/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteAiAssistant(orgId, id) { return apiFetch(`/ai-studio/${orgId}/assistants/${id}`, { method: 'DELETE' }); },
  async deployAiAssistant(orgId, id) { return apiFetch(`/ai-studio/${orgId}/assistants/${id}/deploy`, { method: 'PATCH' }); },
  async chatWithAssistant(orgId, id, message, context) { return apiFetch(`/ai-studio/${orgId}/assistants/${id}/chat`, { method: 'POST', body: JSON.stringify({ message, context }) }); },
  async getKnowledgeBases(orgId) { return apiFetch(`/ai-studio/${orgId}/knowledge`); },
  async createKnowledgeBase(orgId, data) { return apiFetch(`/ai-studio/${orgId}/knowledge`, { method: 'POST', body: JSON.stringify(data) }); },
  async addKnowledgeDocument(orgId, kbId, data) { return apiFetch(`/ai-studio/${orgId}/knowledge/${kbId}/documents`, { method: 'POST', body: JSON.stringify(data) }); },
  async deleteKnowledgeBase(orgId, kbId) { return apiFetch(`/ai-studio/${orgId}/knowledge/${kbId}`, { method: 'DELETE' }); },
  async getAiStudioWorkflows(orgId) { return apiFetch(`/ai-studio/${orgId}/workflows`); },
  async createAiStudioWorkflow(orgId, data) { return apiFetch(`/ai-studio/${orgId}/workflows`, { method: 'POST', body: JSON.stringify(data) }); },
  async updateAiStudioWorkflow(orgId, id, data) { return apiFetch(`/ai-studio/${orgId}/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteAiStudioWorkflow(orgId, id) { return apiFetch(`/ai-studio/${orgId}/workflows/${id}`, { method: 'DELETE' }); },
  async testPrompt(orgId, data) { return apiFetch(`/ai-studio/${orgId}/test-prompt`, { method: 'POST', body: JSON.stringify(data) }); },
  async getAiStudioAnalytics(orgId) { return apiFetch(`/ai-studio/${orgId}/analytics`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 27: AI Agent Marketplace APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getAgentMarketplace(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/agents/marketplace?${p}`); },
  async getAgentListing(key) { return apiFetch(`/agents/marketplace/${key}`); },
  async getInstalledAgents(orgId) { return apiFetch(`/agents/${orgId}/installed`); },
  async installAgent(orgId, agentKey) { return apiFetch(`/agents/${orgId}/install`, { method: 'POST', body: JSON.stringify({ agentKey }) }); },
  async uninstallAgent(orgId, agentKey) { return apiFetch(`/agents/${orgId}/uninstall/${agentKey}`, { method: 'DELETE' }); },
  async configureAgent(orgId, agentKey, data) { return apiFetch(`/agents/${orgId}/config/${agentKey}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async toggleAgent(orgId, agentKey) { return apiFetch(`/agents/${orgId}/toggle/${agentKey}`, { method: 'PATCH' }); },
  async executeAgent(orgId, agentKey, input) { return apiFetch(`/agents/${orgId}/execute/${agentKey}`, { method: 'POST', body: JSON.stringify({ input }) }); },
  async getAgentExecutions(orgId, agentKey, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/agents/${orgId}/executions/${agentKey}?${p}`); },
  async getAgentAnalytics(orgId) { return apiFetch(`/agents/${orgId}/analytics`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 28: Enterprise BPM APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getBpmWorkflows(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bpm/${orgId}?${p}`); },
  async createBpmWorkflow(orgId, data) { return apiFetch(`/bpm/${orgId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async getBpmWorkflow(orgId, id) { return apiFetch(`/bpm/${orgId}/${id}`); },
  async updateBpmWorkflow(orgId, id, data) { return apiFetch(`/bpm/${orgId}/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteBpmWorkflow(orgId, id) { return apiFetch(`/bpm/${orgId}/${id}`, { method: 'DELETE' }); },
  async publishBpmWorkflow(orgId, id) { return apiFetch(`/bpm/${orgId}/${id}/publish`, { method: 'PATCH' }); },
  async executeBpmWorkflow(orgId, id, data) { return apiFetch(`/bpm/${orgId}/${id}/execute`, { method: 'POST', body: JSON.stringify(data) }); },
  async getBpmExecutions(orgId, params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bpm/${orgId}/executions/list?${p}`); },
  async getBpmExecution(orgId, execId) { return apiFetch(`/bpm/${orgId}/executions/${execId}`); },
  async advanceBpmExecution(orgId, execId, data) { return apiFetch(`/bpm/${orgId}/executions/${execId}/advance`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getBpmTemplates(category) { return apiFetch(`/bpm/templates/all${category ? `?category=${category}` : ''}`); },
  async createBpmFromTemplate(orgId, templateId, name) { return apiFetch(`/bpm/${orgId}/from-template/${templateId}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  async simulateBpmWorkflow(orgId, id) { return apiFetch(`/bpm/${orgId}/${id}/simulate`, { method: 'POST' }); },
  async getBpmAnalytics(orgId) { return apiFetch(`/bpm/${orgId}/analytics/summary`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 29: BI Studio APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getBiDashboards(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/bi-studio/dashboards?${p}`); },
  async createBiDashboard(data) { return apiFetch('/bi-studio/dashboards', { method: 'POST', body: JSON.stringify(data) }); },
  async getBiDashboardDetail(id) { return apiFetch(`/bi-studio/dashboards/${id}`); },
  async updateBiDashboardDetail(id, data) { return apiFetch(`/bi-studio/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteBiDashboardDetail(id) { return apiFetch(`/bi-studio/dashboards/${id}`, { method: 'DELETE' }); },
  async publishBiDashboardDetail(id) { return apiFetch(`/bi-studio/dashboards/${id}/publish`, { method: 'PATCH' }); },
  async favoriteBiDashboard(id) { return apiFetch(`/bi-studio/dashboards/${id}/favorite`, { method: 'PATCH' }); },
  async shareBiDashboard(id, data) { return apiFetch(`/bi-studio/dashboards/${id}/share`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getBiTemplates() { return apiFetch('/bi-studio/templates'); },
  async createBiFromTemplate(templateId, name) { return apiFetch(`/bi-studio/dashboards/from-template/${templateId}`, { method: 'POST', body: JSON.stringify({ name }) }); },
  async queryBiData(data) { return apiFetch('/bi-studio/query', { method: 'POST', body: JSON.stringify(data) }); },
  async getBiScheduledReports() { return apiFetch('/bi-studio/reports/scheduled'); },
  async createBiScheduledReport(data) { return apiFetch('/bi-studio/reports/scheduled', { method: 'POST', body: JSON.stringify(data) }); },
  async deleteBiScheduledReport(id) { return apiFetch(`/bi-studio/reports/scheduled/${id}`, { method: 'DELETE' }); },
  async getBiAiInsights(data) { return apiFetch('/bi-studio/ai-insights', { method: 'POST', body: JSON.stringify(data) }); },
  async generateBiAiDashboard(description) { return apiFetch('/bi-studio/ai-dashboard', { method: 'POST', body: JSON.stringify({ description }) }); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 30: TINCLO Operating System (TOS) APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getTosIdentity() { return apiFetch('/tos/identity'); },
  async switchRole(role) { return apiFetch('/tos/identity/role', { method: 'PATCH', body: JSON.stringify({ role }) }); },
  async updateTosPreferences(preferences) { return apiFetch('/tos/identity/preferences', { method: 'PUT', body: JSON.stringify(preferences) }); },
  async universalSearch(q, type) { return apiFetch(`/tos/search?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ''}`); },
  async getTosWorkspace() { return apiFetch('/tos/workspace'); },
  async getTosIntelligence() { return apiFetch('/tos/intelligence'); },
  async getTosAppStore() { return apiFetch('/tos/app-store'); },
  async getTosStatus() { return apiFetch('/tos/status'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 31: Digital Career Passport APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getMyPassport() { return apiFetch('/passport'); },
  async updatePassport(data) { return apiFetch('/passport', { method: 'PUT', body: JSON.stringify(data) }); },
  async getPublicPassport(username) { return apiFetch(`/passport/public/${username}`); },
  async addTimelineEvent(data) { return apiFetch('/passport/timeline', { method: 'POST', body: JSON.stringify(data) }); },
  async updatePassportSkills(skills) { return apiFetch('/passport/skills', { method: 'PUT', body: JSON.stringify({ skills }) }); },
  async endorsePassport(passportId, data) { return apiFetch(`/passport/endorse/${passportId}`, { method: 'POST', body: JSON.stringify(data) }); },
  async verifyPassportSkill(skillName, source) { return apiFetch('/passport/verify-skill', { method: 'POST', body: JSON.stringify({ skillName, source }) }); },
  async sharePassport(expiresInDays) { return apiFetch('/passport/share', { method: 'POST', body: JSON.stringify({ expiresInDays }) }); },
  async getSharedPassport(token) { return apiFetch(`/passport/shared/${token}`); },
  async exportPassport() { return apiFetch('/passport/export'); },
  async getPassportAnalytics() { return apiFetch('/passport/analytics'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 32: Skill Graph APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getSkillCatalog(params = {}) { const p = new URLSearchParams(params); return apiFetch(`/skills/catalog?${p}`); },
  async getSkillDetail(key) { return apiFetch(`/skills/catalog/${key}`); },
  async getTrendingSkills() { return apiFetch('/skills/trending'); },
  async getMySkillGraph() { return apiFetch('/skills/graph'); },
  async updateSkillGraph(data) { return apiFetch('/skills/update', { method: 'POST', body: JSON.stringify(data) }); },
  async verifySkill(skillKey, source) { return apiFetch('/skills/verify', { method: 'POST', body: JSON.stringify({ skillKey, source }) }); },
  async endorseSkill(targetUserId, skillKey) { return apiFetch('/skills/endorse', { method: 'POST', body: JSON.stringify({ targetUserId, skillKey }) }); },
  async getSkillRecommendations() { return apiFetch('/skills/recommendations'); },
  async getSkillCareerPath() { return apiFetch('/skills/career-path'); },
  async analyzeSkillGaps(data) { return apiFetch('/skills/gaps', { method: 'POST', body: JSON.stringify(data) }); },
  async getSkillHeatmap() { return apiFetch('/skills/heatmap'); },
  async getSkillAnalytics() { return apiFetch('/skills/analytics'); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 33: Career DNA APIs
  // ══════════════════════════════════════════════════════════════════════════

  async getCareerDna() { return apiFetch('/career-dna'); },
  async updateCareerDna(data) { return apiFetch('/career-dna/update', { method: 'POST', body: JSON.stringify(data) }); },
  async getCareerDnaInsights() { return apiFetch('/career-dna/insights'); },
  async getCareerDnaReadiness() { return apiFetch('/career-dna/readiness'); },
  async getCareerDnaSalary() { return apiFetch('/career-dna/salary'); },
  async getCareerDnaRecommendations() { return apiFetch('/career-dna/recommendations'); },
  async simulateCareer(data) { return apiFetch('/career-dna/simulate', { method: 'POST', body: JSON.stringify(data) }); },
  async getCareerDnaHistory() { return apiFetch('/career-dna/history'); },
  async shareCareerDna(visibility) { return apiFetch('/career-dna/share', { method: 'POST', body: JSON.stringify({ visibility }) }); },
  async getCareerDnaReport(userId) { return apiFetch(`/career-dna/report/${userId}`); },

  // ══════════════════════════════════════════════════════════════════════════
  // Phase 34: Career Simulation APIs
  // ══════════════════════════════════════════════════════════════════════════

  async runCareerSimulation(data) { return apiFetch('/career-simulation/run', { method: 'POST', body: JSON.stringify(data) }); },
  async getCareerSimulation() { return apiFetch('/career-simulation'); },
  async getSimulationHistory() { return apiFetch('/career-simulation/history'); },
  async compareScenarios(simulationId, scenarioIndexes) { return apiFetch('/career-simulation/compare', { method: 'POST', body: JSON.stringify({ simulationId, scenarioIndexes }) }); },
  async getSimulationSkills() { return apiFetch('/career-simulation/skills'); },
  async getSimulationSalary() { return apiFetch('/career-simulation/salary'); },
  async getSimulationCompanies() { return apiFetch('/career-simulation/companies'); },
  async getSimulationLocations() { return apiFetch('/career-simulation/locations'); },
  async getSimulationRecommendations() { return apiFetch('/career-simulation/recommendations'); },
  async exportSimulationReport() { return apiFetch('/career-simulation/report'); },

  // ══════════ TALENT HEATMAP (Phase 35) ═══════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getHeatmapGlobal() { return apiFetch('/heatmap/global'); },
  async getHeatmapCountry(country) { return apiFetch(`/heatmap/country?country=${encodeURIComponent(country || '')}`); },
  async getHeatmapState(state) { return apiFetch(`/heatmap/state?state=${encodeURIComponent(state || '')}`); },
  async getHeatmapCity(city) { return apiFetch(`/heatmap/city?city=${encodeURIComponent(city || '')}`); },
  async getHeatmapSkills(skill) { return apiFetch(`/heatmap/skills${skill ? `?skill=${encodeURIComponent(skill)}` : ''}`); },
  async getHeatmapSalary(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/heatmap/salary?${q}`); },
  async getHeatmapCompanies() { return apiFetch('/heatmap/companies'); },
  async getHeatmapForecast(type, name) { const q = new URLSearchParams({ ...(type && { type }), ...(name && { name }) }).toString(); return apiFetch(`/heatmap/forecast?${q}`); },
  async getHeatmapTrends() { return apiFetch('/heatmap/trends'); },
  async getHeatmapRemote() { return apiFetch('/heatmap/remote'); },
  async filterHeatmap(data) { return apiFetch('/heatmap/filter', { method: 'POST', body: JSON.stringify(data) }); },
  async getHeatmapInsights() { return apiFetch('/heatmap/insights'); },
  async getHeatmapCompetition(skill) { return apiFetch(`/heatmap/competition${skill ? `?skill=${encodeURIComponent(skill)}` : ''}`); },
  async getHeatmapAlerts() { return apiFetch('/heatmap/alerts'); },
  async createHeatmapAlert(data) { return apiFetch('/heatmap/alerts', { method: 'POST', body: JSON.stringify(data) }); },
  async deleteHeatmapAlert(id) { return apiFetch(`/heatmap/alerts/${id}`, { method: 'DELETE' }); },

  // ══════════ COMMAND CENTER (Phase 36) ═══════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getCommandDashboard() { return apiFetch('/command-center/dashboard'); },
  async getCommandLive(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/command-center/live?${q}`); },
  async getCommandRecruiters() { return apiFetch('/command-center/recruiters'); },
  async getCommandCandidates(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/command-center/candidates?${q}`); },
  async getCommandJobs(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/command-center/jobs?${q}`); },
  async getCommandPipeline() { return apiFetch('/command-center/pipeline'); },
  async getCommandInterviews() { return apiFetch('/command-center/interviews'); },
  async getCommandOffers() { return apiFetch('/command-center/offers'); },
  async getCommandAnalytics() { return apiFetch('/command-center/analytics'); },
  async getCommandAlerts(status) { return apiFetch(`/command-center/alerts${status ? `?status=${status}` : ''}`); },
  async updateCommandAlert(id, data) { return apiFetch(`/command-center/alerts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); },
  async getCommandReports(type) { return apiFetch(`/command-center/reports?type=${type || 'monthly'}`); },
  async postCommandAction(data) { return apiFetch('/command-center/actions', { method: 'POST', body: JSON.stringify(data) }); },
  async getCommandForecasts() { return apiFetch('/command-center/forecasts'); },

  // ══════════ BENCHMARKING (Phase 37) ═════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getBenchmarkDashboard() { return apiFetch('/benchmark/dashboard'); },
  async getBenchmarkOrganization() { return apiFetch('/benchmark/organization'); },
  async getBenchmarkRecruitment() { return apiFetch('/benchmark/recruitment'); },
  async getBenchmarkRecruiters() { return apiFetch('/benchmark/recruiters'); },
  async getBenchmarkSalary() { return apiFetch('/benchmark/salary'); },
  async getBenchmarkSkills() { return apiFetch('/benchmark/skills'); },
  async getBenchmarkLearning() { return apiFetch('/benchmark/learning'); },
  async getBenchmarkWorkforce() { return apiFetch('/benchmark/workforce'); },
  async getBenchmarkProductivity() { return apiFetch('/benchmark/productivity'); },
  async getBenchmarkIndustry(industry) { return apiFetch(`/benchmark/industry${industry ? `?industry=${encodeURIComponent(industry)}` : ''}`); },
  async getBenchmarkReports(type) { return apiFetch(`/benchmark/reports?type=${type || 'quarterly'}`); },
  async getBenchmarkAlerts() { return apiFetch('/benchmark/alerts'); },
  async compareBenchmark(data) { return apiFetch('/benchmark/compare', { method: 'POST', body: JSON.stringify(data) }); },

  // ══════════ HACKATHONS (Phase 38) ═══════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getHackathons(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/hackathons?${q}`); },
  async getHackathon(id) { return apiFetch(`/hackathons/${id}`); },
  async createHackathon(data) { return apiFetch('/hackathons', { method: 'POST', body: JSON.stringify(data) }); },
  async updateHackathon(id, data) { return apiFetch(`/hackathons/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteHackathon(id) { return apiFetch(`/hackathons/${id}`, { method: 'DELETE' }); },
  async registerHackathon(data) { return apiFetch('/hackathons/register', { method: 'POST', body: JSON.stringify(data) }); },
  async joinHackathonTeam(inviteCode) { return apiFetch('/hackathons/team/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }); },
  async getMyHackathonTeams() { return apiFetch('/hackathons/my/teams'); },
  async submitHackathon(data) { return apiFetch('/hackathons/submit', { method: 'POST', body: JSON.stringify(data) }); },
  async getMyHackathonSubmissions() { return apiFetch('/hackathons/my/submissions'); },
  async getHackathonLeaderboard(hackathonId) { return apiFetch(`/hackathons/leaderboard/${hackathonId}`); },
  async getHackathonCertificates() { return apiFetch('/hackathons/certificates'); },
  async getHackathonAnalytics(hackathonId) { return apiFetch(`/hackathons/analytics/${hackathonId}`); },
  async inviteHackathonCandidate(data) { return apiFetch('/hackathons/invite', { method: 'POST', body: JSON.stringify(data) }); },

  // ══════════ CAREER FAIRS (Phase 39) ═════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getCareerFairs(params = {}) { const q = new URLSearchParams(params).toString(); return apiFetch(`/career-fairs?${q}`); },
  async getCareerFair(id) { return apiFetch(`/career-fairs/${id}`); },
  async createCareerFair(data) { return apiFetch('/career-fairs', { method: 'POST', body: JSON.stringify(data) }); },
  async updateCareerFair(id, data) { return apiFetch(`/career-fairs/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteCareerFair(id) { return apiFetch(`/career-fairs/${id}`, { method: 'DELETE' }); },
  async registerCareerFair(data) { return apiFetch('/career-fairs/register', { method: 'POST', body: JSON.stringify(data) }); },
  async getMyCareerFairRegistrations() { return apiFetch('/career-fairs/my/registrations'); },
  async getCareerFairBooths(fairId) { return apiFetch(`/career-fairs/booths/${fairId}`); },
  async getCareerFairBooth(boothId) { return apiFetch(`/career-fairs/booth/${boothId}`); },
  async createCareerFairBooth(data) { return apiFetch('/career-fairs/booths', { method: 'POST', body: JSON.stringify(data) }); },
  async sendCareerFairChat(boothId, message) { return apiFetch('/career-fairs/chat', { method: 'POST', body: JSON.stringify({ boothId, message }) }); },
  async scheduleCareerFairInterview(boothId, slotIndex) { return apiFetch('/career-fairs/interview', { method: 'POST', body: JSON.stringify({ boothId, slotIndex }) }); },
  async dropResume(boothId, resume) { return apiFetch('/career-fairs/resume-drop', { method: 'POST', body: JSON.stringify({ boothId, resume }) }); },
  async getCareerFairAnalytics(fairId) { return apiFetch(`/career-fairs/analytics/${fairId}`); },
  async getCareerFairCertificates() { return apiFetch('/career-fairs/certificates'); },
  async submitCareerFairFeedback(data) { return apiFetch('/career-fairs/feedback', { method: 'POST', body: JSON.stringify(data) }); },

  // ══════════ VERIFIED SKILLS (Phase 40) ══════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════

  async getVerifiedSkills() { return apiFetch('/verified-skills'); },
  async getVerifiedSkill(id) { return apiFetch(`/verified-skills/${id}`); },
  async verifySkill(data) { return apiFetch('/verified-skills/verify', { method: 'POST', body: JSON.stringify(data) }); },
  async verifySkillByEmployer(data) { return apiFetch('/verified-skills/employer', { method: 'POST', body: JSON.stringify(data) }); },
  async verifySkillByAssessment(data) { return apiFetch('/verified-skills/assessment', { method: 'POST', body: JSON.stringify(data) }); },
  async verifySkillByProject(data) { return apiFetch('/verified-skills/project', { method: 'POST', body: JSON.stringify(data) }); },
  async verifySkillByCertificate(data) { return apiFetch('/verified-skills/certificate', { method: 'POST', body: JSON.stringify(data) }); },
  async getVerifiedSkillsHistory() { return apiFetch('/verified-skills/history'); },
  async getVerifiedSkillsCertificates() { return apiFetch('/verified-skills/certificates'); },
  async getVerifiedSkillsAnalytics() { return apiFetch('/verified-skills/analytics'); },
  async shareVerifiedSkills(data) { return apiFetch('/verified-skills/share', { method: 'POST', body: JSON.stringify(data) }); },
};

export default ApiService;
