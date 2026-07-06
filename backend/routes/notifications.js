import express from 'express';
import Notification from '../models/Notification.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { type = '', unread = '', page = 1, limit = 30 } = req.query;
    const filter = { userId: req.user.userId };
    if (type) filter.type = type;
    if (unread === 'true') filter.read = false;
    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Notification.countDocuments({ userId: req.user.userId, read: false }),
      Notification.countDocuments(filter),
    ]);
    res.json({ notifications, unreadCount, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const notification = await Notification.create({
      userId: req.body.userId || req.user.userId,
      audience: req.body.audience || (req.user.role === 'recruiter' ? 'recruiter' : 'candidate'),
      type: req.body.type || 'system',
      title: req.body.title,
      message: req.body.message || '',
      icon: req.body.icon || 'bell',
      metadata: req.body.metadata || {},
    });
    res.status(201).json(notification);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { read: true },
      { new: true },
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.userId, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!result) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
