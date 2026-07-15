// State Manager for centralized application state

import ApiService from '../services/ApiService.js';

const LS_MATCHES_KEY = 'tinclo_matches';

// ── localStorage helpers ──────────────────────────────────────────────────────

function saveMatchesToStorage(userId, matches) {
  try {
    // Store keyed by userId so different users don't share matches
    const all = JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '{}');
    all[userId] = matches;
    localStorage.setItem(LS_MATCHES_KEY, JSON.stringify(all));
  } catch (e) { /* ignore quota errors */ }
}

function loadMatchesFromStorage(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '{}');
    return Array.isArray(all[userId]) ? all[userId] : [];
  } catch (e) {
    return [];
  }
}

function clearMatchesFromStorage(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(LS_MATCHES_KEY) || '{}');
    delete all[userId];
    localStorage.setItem(LS_MATCHES_KEY, JSON.stringify(all));
  } catch (e) { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────

export class StateManager {
  constructor(userId, apiService = ApiService) {
    this.userId = userId;
    this.apiService = apiService;
    this.listeners = [];

    this.state = {
      currentView: 'browser',
      currentJobIndex: 0,
      matches: [],
      jobs: []
    };
  }

  getState() {
    return { ...this.state };
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /** Persist current matches to localStorage and notify listeners */
  _commitMatches() {
    saveMatchesToStorage(this.userId, this.state.matches);
    this.notifyListeners();
  }

  /**
   * Normalize API match response to internal match structure
   * Carries all Phase-1 fields: matchScore, matchDetails, applicationStatus
   */
  normalizeMatch(apiMatch) {
    const job = apiMatch.jobId || {};
    return {
      id: apiMatch._id,
      applicationStatus: apiMatch.applicationStatus || (apiMatch.applied ? 'applied' : 'saved'),
      matchScore:   apiMatch.matchScore   || 0,
      matchDetails: apiMatch.matchDetails || null,
      matchedAt: apiMatch.matchedAt
        ? new Date(apiMatch.matchedAt).toISOString()
        : new Date().toISOString(),
      applied: apiMatch.applied || false,
      job: {
        id:          job._id,
        _id:         job._id,
        title:       job.title,
        company:     job.company,
        description: job.description,
        salary:      job.salary,
        location:    job.location,
        applyUrl:    job.applyUrl    || null,
        source:      job.source      || null,
        isExternal:  job.isExternal  || false,
        tags:        job.tags        || [],
        // Phase-1 additions
        domain:             job.domain             || '',
        workMode:           job.workMode           || '',
        jobType:            job.jobType            || 'Full-time',
        skillsRequired:     job.skillsRequired     || [],
        requirements:       job.requirements       || [],
        experienceRequired: job.experienceRequired || job.experience || '',
        experience:         job.experience         || '',
        companyLogo:        job.companyLogo        || null,
        deadline:           job.deadline           || null,
        status:             job.status             || 'open',
        postedAt:           job.postedAt           || null,
        createdAt:          job.createdAt          || null,
      },
    };
  }

  /**
   * Load jobs — all jobs come from external portals via JobBrowser
   */
  async loadJobs() {
    this.state.jobs = [];
    this.notifyListeners();
  }

  /**
   * Load matches — tries API first, falls back to localStorage
   */
  async loadMatches() {
    try {
      const apiMatches = await this.apiService.fetchUserMatches(this.userId);
      this.state.matches = apiMatches.map(m => this.normalizeMatch(m));
      // Sync the fresh API data back to localStorage
      saveMatchesToStorage(this.userId, this.state.matches);
      this.notifyListeners();
      console.log('✅ Loaded matches from API');
    } catch (error) {
      console.warn('⚠️ API unavailable, loading matches from localStorage:', error.message);
      // Restore from localStorage so matches survive page refresh
      this.state.matches = loadMatchesFromStorage(this.userId);
      this.notifyListeners();
    }
  }

  /**
   * Add a match (user likes a job) — carries all Phase-1 job fields
   */
  async addMatch(job) {
    const localMatch = {
      id: `local-${Date.now()}`,
      applicationStatus: 'saved',
      matchScore:   job.matchScore   || 0,
      matchDetails: job.matchDetails || null,
      matchedAt: new Date().toISOString(),
      applied: false,
      job: {
        id:          job.id  || job._id,
        _id:         job._id || job.id,
        title:       job.title,
        company:     job.company,
        description: job.description,
        salary:      job.salary,
        location:    job.location,
        applyUrl:    job.applyUrl    || null,
        source:      job.source      || null,
        isExternal:  job.isExternal  || false,
        tags:        job.tags        || [],
        // Phase-1 fields
        domain:             job.domain             || '',
        workMode:           job.workMode           || '',
        jobType:            job.jobType            || 'Full-time',
        skillsRequired:     job.skillsRequired     || [],
        requirements:       job.requirements       || [],
        experienceRequired: job.experienceRequired || job.experience || '',
        experience:         job.experience         || '',
        companyLogo:        job.companyLogo        || null,
        deadline:           job.deadline           || null,
        status:             job.status             || 'open',
        postedAt:           job.postedAt           || null,
        createdAt:          job.createdAt          || null,
      },
    };

    this.state.matches.push(localMatch);
    this.state.currentJobIndex++;
    this._commitMatches(); // persist immediately

    // Try to sync with API (only if we have an auth token)
    const token = localStorage.getItem('tinclo_token');
    if (!token) {
      console.log('⚠️ No auth token — match saved locally only');
      return localMatch;
    }

    // Skip API sync for external jobs (non-MongoDB ObjectId)
    const jobId = job.id || job._id;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(jobId);
    if (!isMongoId) {
      console.log('⚠️ External job — match saved locally only');
      return localMatch;
    }

    try {
      const apiMatch = await this.apiService.createMatch(this.userId, job.id || job._id);
      const normalizedMatch = this.normalizeMatch(apiMatch);

      // Replace local placeholder with real API match
      const index = this.state.matches.findIndex(m => m.id === localMatch.id);
      if (index !== -1) {
        this.state.matches[index] = normalizedMatch;
        this._commitMatches();
      }
      console.log('✅ Match synced with API');
    } catch (error) {
      // If it's a token/auth error, keep the match locally — don't remove it
      if (error.message?.includes('token') || error.message?.includes('Access token') || error.message?.includes('Forbidden')) {
        console.warn('⚠️ Auth issue — match saved locally only:', error.message);
        return localMatch;
      }

      console.warn('API sync failed, removing local match:', error.message);

      if (error.message.includes('Already matched')) {
        this.state.matches = this.state.matches.filter(m => m.id !== localMatch.id);
        this.state.currentJobIndex--;
        this._commitMatches();
        throw new Error('You have already saved this job.');
      }
      // For other errors, keep locally too — don't remove
      console.warn('⚠️ Keeping match locally despite API error');
      return localMatch;
    }
  }

  skipJob() {
    this.state.currentJobIndex++;
    this.notifyListeners();
  }

  /**
   * Mark a match as applied
   */
  async markAsApplied(matchId) {
    const index = this.state.matches.findIndex(m => m.id === matchId);
    if (index === -1) {
      console.error('Match not found:', matchId);
      return;
    }

    this.state.matches[index].applied = true;
    this._commitMatches(); // persist applied status

    try {
      const apiMatch = await this.apiService.markMatchApplied(matchId);
      const normalizedMatch = this.normalizeMatch(apiMatch);
      this.state.matches[index] = normalizedMatch;
      this._commitMatches();
      console.log('✅ Applied status synced with API');
    } catch (error) {
      console.warn('API sync failed, keeping local applied update:', error.message);
    }
  }

  /**
   * Undo apply status
   */
  async undoApply(matchId) {
    const match = this.state.matches.find(m => m.id === matchId);
    if (match && match.applied) {
      match.applied = false;
      match.applicationStatus = 'saved';
      this._commitMatches();
    }
  }

  /**
   * Update a match application status
   */
  async updateMatchStatus(matchId, status) {
    const index = this.state.matches.findIndex(m => m.id === matchId);
    if (index === -1) {
      throw new Error('Match not found.');
    }

    const previous = { ...this.state.matches[index] };
    this.state.matches[index] = {
      ...this.state.matches[index],
      applicationStatus: status,
      applied: status === 'applied' ? true : this.state.matches[index].applied,
    };
    this._commitMatches();

    try {
      const apiMatch = await this.apiService.updateMatchStatus(matchId, status);
      this.state.matches[index] = this.normalizeMatch(apiMatch);
      this._commitMatches();
    } catch (error) {
      // On token/auth errors, keep the local update
      if (error.message?.includes('token') || error.message?.includes('Session expired') || error.message?.includes('Forbidden')) {
        console.warn('⚠️ API unavailable — status updated locally');
        return;
      }
      this.state.matches[index] = previous;
      this._commitMatches();
      throw new Error(error.message || 'Unable to update application status.');
    }
  }

  /**
   * Delete a match (user unlikes a job)
   */
  async deleteMatch(matchId) {
    const previous = this.state.matches;
    this.state.matches = this.state.matches.filter(m => m.id !== matchId);
    this._commitMatches();

    // Only try API delete if it's a valid MongoDB ObjectId
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(matchId);
    if (!isMongoId) return; // Local-only match, already removed

    try {
      await this.apiService.deleteMatch(matchId);
    } catch (error) {
      // On token/auth errors, keep the delete (match is gone locally)
      if (error.message?.includes('token') || error.message?.includes('Session expired') || error.message?.includes('Forbidden')) {
        console.warn('⚠️ API unavailable — match removed locally');
        return;
      }
      console.error('Failed to delete match from API:', error);
      // For other errors, still keep the local delete — don't restore
    }
  }

  /**
   * Clear all local matches for this user (called on logout)
   */
  clearMatches() {
    this.state.matches = [];
    clearMatchesFromStorage(this.userId);
    this.notifyListeners();
  }

  switchView(view) {
    this.state.currentView = view;
    this.notifyListeners();
  }
}
