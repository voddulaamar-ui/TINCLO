/**
 * API Service Layer
 * Handles all communication with the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

/**
 * Base fetch wrapper with error handling
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Parsed JSON response
 * @throws {Error} - Descriptive error for network or HTTP failures
 */
async function apiFetch(endpoint, options = {}) {
  try {
    // Attach JWT token if available
    const token = localStorage.getItem('tinclo_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error: Unable to connect to server');
    }
    throw error;
  }
}

const ApiService = {
  // Configuration
  getBaseUrl: () => API_BASE_URL,

  // Job API methods
  /**
   * Fetch all job listings
   * @returns {Promise<Array>} - Array of job objects
   * @throws {Error} - Network or HTTP error
   */
  async fetchJobs() {
    return await apiFetch('/jobs');
  },

  /**
   * Fetch a single job by ID
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} - Job object
   * @throws {Error} - Network or HTTP error (404 if not found)
   */
  async fetchJob(jobId) {
    return await apiFetch(`/jobs/${jobId}`);
  },

  // Match API methods
  /**
   * Fetch all matches for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of match objects with populated job details
   * @throws {Error} - Network or HTTP error
   */
  async fetchUserMatches(userId) {
    return await apiFetch(`/matches/user/${userId}`);
  },

  /**
   * Create a new match (user likes a job)
   * @param {string} userId - User ID
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} - Created match object with populated job details
   * @throws {Error} - Network or HTTP error (400 if duplicate)
   */
  async createMatch(userId, jobId) {
    // Ensure user exists before creating match
    await this.ensureUserExists(userId);
    
    return await apiFetch('/matches', {
      method: 'POST',
      body: JSON.stringify({ userId, jobId }),
    });
  },

  /**
   * Mark a match as applied
   * @param {string} matchId - Match ID
   * @returns {Promise<object>} - Updated match object with populated job details
   * @throws {Error} - Network or HTTP error (404 if not found)
   */
  async markMatchApplied(matchId) {
    return await apiFetch(`/matches/${matchId}/apply`, {
      method: 'PUT',
    });
  },

  /**
   * Delete a match (user unlikes a job)
   * @param {string} matchId - Match ID
   * @returns {Promise<object>} - Success message
   * @throws {Error} - Network or HTTP error (404 if not found)
   */
  async deleteMatch(matchId) {
    return await apiFetch(`/matches/${matchId}`, {
      method: 'DELETE',
    });
  },

  // User API methods
  /**
   * Register a new user with full details (saves to MongoDB)
   */
  async registerUser({ name, email, password }) {
    return await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  /**
   * Login user via MongoDB
   */
  async loginUser({ email, password }) {
    return await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Create a new user (legacy — userId only)
   */
  async createUser(userId) {
    return await apiFetch('/users', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  /**
   * Fetch a user by userId
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User object
   * @throws {Error} - Network or HTTP error (404 if not found)
   */
  async fetchUser(userId) {
    return await apiFetch(`/users/${userId}`);
  },

  /**
   * Ensure user exists, create if not
   * @param {string} userId - User ID
   * @returns {Promise<object>} - User object
   * @throws {Error} - Network or HTTP error
   */
  async ensureUserExists(userId) {
    return await this.fetchUser(userId);
  },

  // Health check
  /**
   * Check backend service health
   * @returns {Promise<object>} - Health status object
   * @throws {Error} - Network or HTTP error
   */
  async checkHealth() {
    return await apiFetch('/health');
  },

  // External Jobs (JSearch - Indeed, LinkedIn, Glassdoor, Naukri)
  /**
   * Fetch real jobs from external portals via JSearch API
   * @param {object} params - Search params: query, location, page
   * @returns {Promise<object>} - { jobs: [], total, source }
   */
  async fetchExternalJobs({ query = 'software developer', location = 'India', page = 1 } = {}) {
    const params = new URLSearchParams({ query, location, page });
    return await apiFetch(`/external-jobs?${params}`);
  },

  async trackJobView({ userId, jobId }) {
    return await apiFetch('/job-views', {
      method: 'POST',
      body: JSON.stringify({ userId, jobId }),
    });
  },

  // Job Application — submit in-app and send confirmation email
  async applyToJob({ name, email, phone, experience, coverLetter, applicationType, applicationDetails, jobTitle, company, location, salary, jobId }) {
    return await apiFetch('/apply', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, experience, coverLetter, applicationType, applicationDetails, jobTitle, company, location, salary, jobId }),
    });
  },

  // Validate email domain (blocks disposable emails)
  async validateEmail(email) {
    return await apiFetch('/apply/validate-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Update user profile via backend
  async updateProfile({ email, name, phone, location, bio }) {
    return await apiFetch('/auth/update-profile', {
      method: 'PUT',
      body: JSON.stringify({ email, name, phone, location, bio }),
    });
  },

  // Change password via backend
  async changePassword({ email, currentPassword, newPassword }) {
    return await apiFetch('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email, currentPassword, newPassword }),
    });
  },
};

export default ApiService;
