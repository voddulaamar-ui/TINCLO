/**
 * /api/saved-searches — Named search filter presets with notification support
 */
import express from 'express';
import SavedSearch from '../models/SavedSearch.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/saved-searches — List user's saved searches
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const searches = await SavedSearch.find({ userId: req.user.userId })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, searches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/saved-searches — Create a saved search
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { name, filters, notifyOnMatch } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

  try {
    const search = await SavedSearch.create({
      userId: req.user.userId,
      name: name.trim(),
      filters: filters || {},
      notifyOnMatch: notifyOnMatch !== false,
    });
    res.status(201).json({ success: true, search });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'A saved search with this name already exists.' });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/saved-searches/:id — Update a saved search
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const search = await SavedSearch.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!search) return res.status(404).json({ success: false, message: 'Saved search not found.' });

    const { name, filters, notifyOnMatch } = req.body;
    if (name) search.name = name.trim();
    if (filters) search.filters = filters;
    if (notifyOnMatch !== undefined) search.notifyOnMatch = notifyOnMatch;
    await search.save();

    res.json({ success: true, search });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/saved-searches/:id — Delete a saved search
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const result = await SavedSearch.deleteOne({ _id: req.params.id, userId: req.user.userId });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Saved search deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/saved-searches/:id/run — Execute saved search and return matching jobs
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/run', async (req, res) => {
  try {
    const search = await SavedSearch.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!search) return res.status(404).json({ success: false, message: 'Not found.' });

    const f = search.filters || {};
    const filter = { status: 'open' };
    if (f.query) {
      const regex = new RegExp(f.query, 'i');
      filter.$or = [{ title: regex }, { company: regex }, { skillsRequired: regex }];
    }
    if (f.location) filter.location = new RegExp(f.location, 'i');
    if (f.domain)   filter.domain = new RegExp(f.domain, 'i');
    if (f.workMode) filter.workMode = f.workMode;
    if (f.jobType)  filter.jobType = new RegExp(f.jobType, 'i');
    if (f.company)  filter.company = new RegExp(f.company, 'i');

    const jobs = await Job.find(filter)
      .select('title company salary location domain workMode skillsRequired createdAt')
      .sort({ createdAt: -1 }).limit(30).lean();

    // Update lastCheckedAt
    search.lastCheckedAt = new Date();
    search.matchCount = jobs.length;
    await search.save();

    res.json({ success: true, jobs, count: jobs.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
