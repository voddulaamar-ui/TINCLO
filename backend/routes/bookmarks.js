/**
 * /api/bookmarks — Bookmark collections (custom job folders)
 */
import express from 'express';
import BookmarkCollection from '../models/BookmarkCollection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/bookmarks — List user's collections
// ══════════════════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const collections = await BookmarkCollection.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 }).lean();
    res.json({ success: true, collections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/bookmarks — Create a new collection
// ══════════════════════════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { name, description, color, icon } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Collection name is required.' });

  try {
    const collection = await BookmarkCollection.create({
      userId: req.user.userId,
      name: name.trim(),
      description: description || '',
      color: color || '#667eea',
      icon: icon || '📁',
    });
    res.status(201).json({ success: true, collection });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'A collection with this name already exists.' });
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PUT /api/bookmarks/:id — Update collection metadata
// ══════════════════════════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  try {
    const col = await BookmarkCollection.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    const { name, description, color, icon } = req.body;
    if (name) col.name = name.trim();
    if (description !== undefined) col.description = description;
    if (color) col.color = color;
    if (icon) col.icon = icon;
    await col.save();

    res.json({ success: true, collection: col });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/bookmarks/:id — Delete a collection
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const result = await BookmarkCollection.deleteOne({ _id: req.params.id, userId: req.user.userId });
    if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Collection deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/bookmarks/:id/jobs — Add a job to collection
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/jobs', async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required.' });

  try {
    const col = await BookmarkCollection.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    if (!col.jobIds.includes(jobId)) {
      col.jobIds.push(jobId);
      await col.save();
    }
    res.json({ success: true, message: 'Job added to collection.', jobCount: col.jobIds.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/bookmarks/:id/jobs/:jobId — Remove a job from collection
// ══════════════════════════════════════════════════════════════════════════════
router.delete('/:id/jobs/:jobId', async (req, res) => {
  try {
    const col = await BookmarkCollection.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    col.jobIds = col.jobIds.filter(id => String(id) !== req.params.jobId);
    await col.save();
    res.json({ success: true, message: 'Job removed from collection.', jobCount: col.jobIds.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/bookmarks/:id/jobs — Get jobs in a collection (populated)
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id/jobs', async (req, res) => {
  try {
    const col = await BookmarkCollection.findOne({ _id: req.params.id, userId: req.user.userId })
      .populate({ path: 'jobIds', select: 'title company salary location domain workMode status createdAt' })
      .lean();
    if (!col) return res.status(404).json({ success: false, message: 'Collection not found.' });

    res.json({ success: true, collection: col.name, jobs: col.jobIds || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
