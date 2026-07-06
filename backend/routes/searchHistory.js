import express from 'express';
import SearchHistory from '../models/SearchHistory.js';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const history = await SearchHistory.find({ userId: req.user.userId }).sort({ updatedAt: -1 }).limit(25);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { query = '', location = '', filters = {} } = req.body;
    const item = await SearchHistory.findOneAndUpdate(
      { userId: req.user.userId, query, location },
      { userId: req.user.userId, query, location, filters, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    await AnalyticsEvent.create({ userId: req.user.userId, eventType: 'search', metadata: { query, location, filters } });
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await SearchHistory.deleteOne({ _id: req.params.id, userId: req.user.userId });
    res.json({ message: 'Search deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user.userId });
    res.json({ message: 'Search history cleared' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
