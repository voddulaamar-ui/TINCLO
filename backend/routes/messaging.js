/**
 * /api/messaging — Full real-time messaging system
 * 
 * Conversations, messages, reactions, read receipts, file sharing,
 * pins, archives, labels, search, mentions, analytics.
 * 
 * Real-time events are emitted via Socket.IO (attached to req.app).
 */
import express from 'express';
import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import ConversationMember from '../models/ConversationMember.js';
import Message from '../models/Message.js';
import { authenticateToken } from '../middleware/auth.js';
import { parsePagination } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticateToken);

// ── Helper: emit to all online participants ──────────────────────────────────
function emitToParticipants(req, participants, event, data) {
  const io = req.app.get('io');
  const online = req.app.get('onlineUsers');
  if (!io || !online) return;
  for (const uid of participants) {
    if (uid === req.user.userId) continue; // don't emit to sender
    const sock = online.get(uid);
    if (sock) io.to(sock).emit(event, data);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATIONS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/messaging/conversations — List user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const { filter } = req.query; // 'unread', 'archived', 'pinned'
    const memberFilter = { userId: req.user.userId, isActive: true };
    if (filter === 'archived')  memberFilter.isArchived = true;
    else                        memberFilter.isArchived = false;
    if (filter === 'pinned')    memberFilter.isPinned = true;
    if (filter === 'unread')    memberFilter.unreadCount = { $gt: 0 };

    const memberships = await ConversationMember.find(memberFilter)
      .sort({ isPinned: -1 }).lean();
    const convIds = memberships.map(m => m.conversationId);

    const conversations = await Conversation.find({ _id: { $in: convIds } })
      .sort({ lastMessageAt: -1 }).lean();

    // Merge membership state into each conversation
    const result = conversations.map(c => {
      const ms = memberships.find(m => String(m.conversationId) === String(c._id));
      return { ...c, isPinned: ms?.isPinned, isArchived: ms?.isArchived, unreadCount: ms?.unreadCount || 0 };
    });

    res.json({ success: true, conversations: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/messaging/conversations — Create or get a direct conversation
router.post('/conversations', async (req, res) => {
  const { participantId, type, name, organizationId, jobId, candidateId, interviewId } = req.body;
  if (!participantId && type === 'direct')
    return res.status(400).json({ success: false, message: 'participantId is required for direct chats.' });

  try {
    const convType = type || 'direct';
    let participants = [req.user.userId];
    if (participantId) participants.push(participantId);
    if (req.body.participants) participants = [...new Set([...participants, ...req.body.participants])];

    // For direct: check if conversation already exists
    if (convType === 'direct' && participants.length === 2) {
      const existing = await Conversation.findOne({
        type: 'direct', participants: { $all: participants, $size: 2 },
      });
      if (existing) return res.json({ success: true, conversation: existing, existing: true });
    }

    const conv = await Conversation.create({
      type: convType, participants, participantCount: participants.length,
      name: name || '', organizationId, jobId, candidateId, interviewId,
      createdBy: req.user.userId, status: 'active',
    });

    // Create member entries for all participants
    await ConversationMember.insertMany(
      participants.map(uid => ({ conversationId: conv._id, userId: uid, role: uid === req.user.userId ? 'owner' : 'member' }))
    );

    res.status(201).json({ success: true, conversation: conv });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /api/messaging/conversations/:id — Get conversation details
router.get('/conversations/:id', async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.id).lean();
    if (!conv) return res.status(404).json({ success: false, message: 'Not found.' });
    if (!conv.participants.includes(req.user.userId))
      return res.status(403).json({ success: false, message: 'Access denied.' });
    const membership = await ConversationMember.findOne({ conversationId: conv._id, userId: req.user.userId }).lean();
    res.json({ success: true, conversation: { ...conv, ...membership } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/messaging/conversations/:id/pin
router.patch('/conversations/:id/pin', async (req, res) => {
  try {
    const ms = await ConversationMember.findOne({ conversationId: req.params.id, userId: req.user.userId });
    if (!ms) return res.status(404).json({ success: false, message: 'Not found.' });
    ms.isPinned = !ms.isPinned;
    await ms.save();
    res.json({ success: true, isPinned: ms.isPinned });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/messaging/conversations/:id/archive
router.patch('/conversations/:id/archive', async (req, res) => {
  try {
    const ms = await ConversationMember.findOne({ conversationId: req.params.id, userId: req.user.userId });
    if (!ms) return res.status(404).json({ success: false, message: 'Not found.' });
    ms.isArchived = !ms.isArchived;
    await ms.save();
    res.json({ success: true, isArchived: ms.isArchived });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/messaging/conversations/:id/labels
router.patch('/conversations/:id/labels', async (req, res) => {
  const { labels } = req.body;
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv || !conv.participants.includes(req.user.userId))
      return res.status(403).json({ success: false, message: 'Access denied.' });
    conv.labels = labels || [];
    await conv.save();
    res.json({ success: true, labels: conv.labels });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/messaging/conversations/:id/members — Add members to group
router.post('/conversations/:id/members', async (req, res) => {
  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ success: false, message: 'userIds array required.' });
  try {
    const conv = await Conversation.findById(req.params.id);
    if (!conv) return res.status(404).json({ success: false, message: 'Not found.' });
    for (const uid of userIds) {
      if (!conv.participants.includes(uid)) conv.participants.push(uid);
      await ConversationMember.findOneAndUpdate(
        { conversationId: conv._id, userId: uid },
        { conversationId: conv._id, userId: uid, isActive: true },
        { upsert: true }
      );
    }
    conv.participantCount = conv.participants.length;
    await conv.save();
    res.json({ success: true, participants: conv.participants });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGES
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/messaging/messages/:conversationId — Get messages (paginated)
router.get('/messages/:conversationId', async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.conversationId).lean();
    if (!conv || !conv.participants.includes(req.user.userId))
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const { page, limit, skip } = parsePagination(req.query, { limit: 50 });
    const messages = await Message.find({
      conversationId: req.params.conversationId,
      deletedForUsers: { $ne: req.user.userId },
      $or: [{ isDeleted: false }, { deletedForAll: false }],
    }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    // Mark as read
    await ConversationMember.findOneAndUpdate(
      { conversationId: req.params.conversationId, userId: req.user.userId },
      { unreadCount: 0, lastReadAt: new Date() }
    );

    res.json({ success: true, messages: messages.reverse(), page, limit });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/messaging/messages — Send a message
router.post('/messages', async (req, res) => {
  const { conversationId, content, type, attachments, replyTo, mentions } = req.body;
  if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId required.' });
  if (!content && (!attachments || !attachments.length))
    return res.status(400).json({ success: false, message: 'Message content or attachment required.' });

  try {
    const conv = await Conversation.findById(conversationId);
    if (!conv || !conv.participants.includes(req.user.userId))
      return res.status(403).json({ success: false, message: 'Access denied.' });

    const message = await Message.create({
      conversationId, senderId: req.user.userId, senderName: req.user.name || '',
      type: type || 'text', content: content || '',
      attachments: attachments || [], replyTo, mentions: mentions || [],
      status: 'sent',
    });

    // Update conversation last message
    conv.lastMessage = content ? content.substring(0, 100) : '[Attachment]';
    conv.lastMessageAt = new Date();
    conv.lastMessageBy = req.user.userId;
    await conv.save();

    // Increment unread count for other participants
    await ConversationMember.updateMany(
      { conversationId, userId: { $ne: req.user.userId } },
      { $inc: { unreadCount: 1 } }
    );

    // Emit real-time event to all participants
    emitToParticipants(req, conv.participants, 'chat:message', {
      conversationId: String(conversationId),
      message,
    });

    // Emit notification for mentions
    if (mentions?.length) {
      for (const uid of mentions) {
        emitToParticipants(req, [uid], 'notification:receive', {
          id: message._id, type: 'mention',
          title: `💬 ${req.user.name || 'Someone'} mentioned you`,
          message: content?.substring(0, 80) || 'in a conversation',
          time: 'Just now', read: false, icon: '💬',
        });
      }
    }

    res.status(201).json({ success: true, message });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/messaging/messages/:id/edit — Edit a message
router.patch('/messages/:id/edit', async (req, res) => {
  const { content } = req.body;
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg || msg.senderId !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Cannot edit this message.' });

    msg.editHistory.push({ content: msg.content, editedAt: new Date() });
    msg.content = content;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();

    emitToParticipants(req, (await Conversation.findById(msg.conversationId).lean())?.participants || [], 'chat:messageEdited', { messageId: msg._id, content, editedAt: msg.editedAt });
    res.json({ success: true, message: msg });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// DELETE /api/messaging/messages/:id — Delete a message
router.delete('/messages/:id', async (req, res) => {
  const { forAll } = req.query;
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found.' });

    if (forAll === 'true' && msg.senderId === req.user.userId) {
      msg.isDeleted = true; msg.deletedForAll = true; msg.deletedAt = new Date();
      msg.content = 'This message was deleted.';
    } else {
      msg.deletedForUsers.push(req.user.userId);
    }
    await msg.save();
    res.json({ success: true, message: 'Message deleted.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// REACTIONS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/messages/:id/reactions', async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ success: false, message: 'emoji required.' });
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found.' });

    // Toggle reaction
    const existing = msg.reactions.findIndex(r => r.userId === req.user.userId && r.emoji === emoji);
    if (existing >= 0) msg.reactions.splice(existing, 1);
    else msg.reactions.push({ userId: req.user.userId, emoji });
    await msg.save();

    res.json({ success: true, reactions: msg.reactions });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// READ RECEIPTS
// ══════════════════════════════════════════════════════════════════════════════

router.patch('/messages/:id/read', async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Not found.' });

    if (!msg.readBy.some(r => r.userId === req.user.userId)) {
      msg.readBy.push({ userId: req.user.userId, at: new Date() });
    }
    if (msg.status !== 'read') { msg.status = 'read'; msg.readAt = new Date(); }
    await msg.save();

    // Emit read receipt to sender
    emitToParticipants(req, [msg.senderId], 'chat:read', { messageId: msg._id, readBy: req.user.userId, at: new Date() });
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SEARCH
// ══════════════════════════════════════════════════════════════════════════════

router.get('/search', async (req, res) => {
  const { q, conversationId } = req.query;
  if (!q) return res.status(400).json({ success: false, message: 'Search query required.' });

  try {
    const filter = { content: new RegExp(q, 'i'), deletedForAll: { $ne: true } };
    if (conversationId) filter.conversationId = conversationId;
    else {
      // Only search in conversations user belongs to
      const memberships = await ConversationMember.find({ userId: req.user.userId, isActive: true }).select('conversationId').lean();
      filter.conversationId = { $in: memberships.map(m => m.conversationId) };
    }

    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, messages });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CHAT ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [sent, received, unreadTotal] = await Promise.all([
      Message.countDocuments({ senderId: userId, createdAt: { $gte: thirtyDaysAgo } }),
      Message.countDocuments({ conversationId: { $in: (await ConversationMember.find({ userId }).select('conversationId').lean()).map(m => m.conversationId) }, senderId: { $ne: userId }, createdAt: { $gte: thirtyDaysAgo } }),
      ConversationMember.aggregate([{ $match: { userId } }, { $group: { _id: null, total: { $sum: '$unreadCount' } } }]),
    ]);

    res.json({
      success: true,
      analytics: {
        messagesSent: sent,
        messagesReceived: received,
        unreadMessages: unreadTotal[0]?.total || 0,
      },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
