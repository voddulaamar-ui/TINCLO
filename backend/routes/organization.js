/**
 * /api/org — Organization management, team, departments, offices, pipeline, notes, tags, bulk ops
 * This is the master enterprise route file for Phase 5.
 */
import express from 'express';
import Organization from '../models/Organization.js';
import OrganizationMember from '../models/OrganizationMember.js';
import Department from '../models/Department.js';
import Office from '../models/Office.js';
import CandidatePipeline from '../models/CandidatePipeline.js';
import CandidateNote from '../models/CandidateNote.js';
import CandidateTag from '../models/CandidateTag.js';
import Job from '../models/Job.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireOrgMember, requireOrgPermission } from '../middleware/orgPermissions.js';

const router = express.Router();
router.use(authenticateToken);

const slugify = (v) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ══════════════════════════════════════════════════════════════════════════════
// 1. ORGANIZATION CRUD
// ══════════════════════════════════════════════════════════════════════════════

// POST /api/org — Create organization
router.post('/', async (req, res) => {
  const { name, industry, website, companySize, headquarters, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Organization name is required.' });

  try {
    const org = await Organization.create({
      name: name.trim(), slug: slugify(name), industry, website, companySize,
      headquarters, description, createdBy: req.user.userId,
    });
    // Creator becomes owner
    await OrganizationMember.create({
      organizationId: org._id, userId: req.user.userId, email: req.user.email,
      role: 'owner', status: 'active', acceptedAt: new Date(),
    });
    res.status(201).json({ success: true, organization: org });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Organization name already exists.' });
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/org/my — List organizations I belong to
router.get('/my', async (req, res) => {
  try {
    const memberships = await OrganizationMember.find({ userId: req.user.userId, status: 'active' }).lean();
    const orgIds = memberships.map(m => m.organizationId);
    const orgs = await Organization.find({ _id: { $in: orgIds } }).lean();
    res.json({ success: true, organizations: orgs.map(o => ({ ...o, myRole: memberships.find(m => String(m.organizationId) === String(o._id))?.role })) });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// GET /api/org/:orgId — Get organization details
router.get('/:orgId', requireOrgMember, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId).lean();
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found.' });
    res.json({ success: true, organization: org, myRole: req.orgMember.role });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PUT /api/org/:orgId — Update organization (owner/hr_manager)
router.put('/:orgId', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const updates = {};
    const allowed = ['name','logo','coverBanner','website','industry','companySize','headquarters','description','socialLinks','emailDomain','contactEmail','brandColors','settings'];
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    if (updates.name) updates.slug = slugify(updates.name);
    const org = await Organization.findByIdAndUpdate(req.params.orgId, updates, { new: true }).lean();
    res.json({ success: true, organization: org });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. TEAM MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/org/:orgId/members — List team members
router.get('/:orgId/members', requireOrgMember, async (req, res) => {
  try {
    const members = await OrganizationMember.find({ organizationId: req.params.orgId }).sort({ role: 1 }).lean();
    // Enrich with user names
    const enriched = await Promise.all(members.map(async m => {
      const user = await User.findOne({ userId: m.userId }).select('name email profilePicture').lean();
      return { ...m, user };
    }));
    res.json({ success: true, members: enriched });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/org/:orgId/members/invite — Invite a recruiter
router.post('/:orgId/members/invite', requireOrgMember, requireOrgPermission('manageTeam'), async (req, res) => {
  const { email, role, departmentId, officeId } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

  try {
    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    const userId = user?.userId || `pending-${email}`;

    const member = await OrganizationMember.findOneAndUpdate(
      { organizationId: req.params.orgId, email: email.toLowerCase() },
      { organizationId: req.params.orgId, userId, email: email.toLowerCase(),
        role: role || 'recruiter', departmentId, officeId,
        invitedBy: req.user.userId, invitedAt: new Date(),
        status: user ? 'active' : 'invited', acceptedAt: user ? new Date() : null },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, member, message: user ? 'Member added.' : 'Invitation sent.' });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Already a member.' });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/org/:orgId/members/:userId/role — Change member role
router.patch('/:orgId/members/:userId/role', requireOrgMember, requireOrgPermission('manageTeam'), async (req, res) => {
  const { role } = req.body;
  const valid = ['owner', 'hr_manager', 'recruiter', 'interviewer', 'hiring_manager', 'viewer'];
  if (!valid.includes(role)) return res.status(400).json({ success: false, message: 'Invalid role.' });
  try {
    await OrganizationMember.findOneAndUpdate(
      { organizationId: req.params.orgId, userId: req.params.userId },
      { role }
    );
    res.json({ success: true, message: 'Role updated.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/org/:orgId/members/:userId/deactivate
router.patch('/:orgId/members/:userId/deactivate', requireOrgMember, requireOrgPermission('manageTeam'), async (req, res) => {
  try {
    await OrganizationMember.findOneAndUpdate(
      { organizationId: req.params.orgId, userId: req.params.userId },
      { status: 'deactivated' }
    );
    res.json({ success: true, message: 'Member deactivated.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// DELETE /api/org/:orgId/members/:userId — Remove member
router.delete('/:orgId/members/:userId', requireOrgMember, requireOrgPermission('manageTeam'), async (req, res) => {
  try {
    await OrganizationMember.deleteOne({ organizationId: req.params.orgId, userId: req.params.userId });
    res.json({ success: true, message: 'Member removed.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. DEPARTMENTS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/departments', requireOrgMember, async (req, res) => {
  try { res.json({ success: true, departments: await Department.find({ organizationId: req.params.orgId }).lean() }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/:orgId/departments', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const dept = await Department.create({ organizationId: req.params.orgId, name: req.body.name, description: req.body.description || '' });
    res.status(201).json({ success: true, department: dept });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/:orgId/departments/:id', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try { await Department.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. OFFICES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/offices', requireOrgMember, async (req, res) => {
  try { res.json({ success: true, offices: await Office.find({ organizationId: req.params.orgId }).lean() }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/:orgId/offices', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try {
    const office = await Office.create({ organizationId: req.params.orgId, ...req.body });
    res.status(201).json({ success: true, office });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/:orgId/offices/:id', requireOrgMember, requireOrgPermission('manageSettings'), async (req, res) => {
  try { await Office.deleteOne({ _id: req.params.id, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. CANDIDATE PIPELINE (Kanban)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/org/:orgId/pipeline/:jobId — Get pipeline for a job
router.get('/:orgId/pipeline/:jobId', requireOrgMember, requireOrgPermission('viewCandidates'), async (req, res) => {
  try {
    const candidates = await CandidatePipeline.find({ organizationId: req.params.orgId, jobId: req.params.jobId })
      .sort({ stage: 1, stageOrder: 1 }).lean();
    // Enrich with user info
    const enriched = await Promise.all(candidates.map(async c => {
      const user = await User.findOne({ userId: c.candidateId }).select('name email skills experienceYears profilePicture resumeUrl').lean();
      return { ...c, candidate: user };
    }));
    res.json({ success: true, pipeline: enriched });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/org/:orgId/pipeline/:id/move — Move candidate to a different stage
router.patch('/:orgId/pipeline/:id/move', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { stage, notes } = req.body;
  const validStages = ['applied', 'screening', 'technical', 'hr', 'manager', 'offer', 'joined', 'rejected', 'withdrawn'];
  if (!validStages.includes(stage)) return res.status(400).json({ success: false, message: 'Invalid stage.' });

  try {
    const pipeline = await CandidatePipeline.findById(req.params.id);
    if (!pipeline) return res.status(404).json({ success: false, message: 'Pipeline entry not found.' });

    pipeline.stageHistory.push({ stage, movedBy: req.user.userId, movedAt: new Date(), notes: notes || '' });
    pipeline.stage = stage;
    if (stage === 'rejected') { pipeline.rejectedBy = req.user.userId; pipeline.rejectedAt = new Date(); pipeline.rejectionReason = notes || ''; }
    await pipeline.save();

    res.json({ success: true, pipeline });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// PATCH /api/org/:orgId/pipeline/:id/assign — Assign candidate to a recruiter
router.patch('/:orgId/pipeline/:id/assign', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { assignedTo } = req.body;
  try {
    await CandidatePipeline.findByIdAndUpdate(req.params.id, { assignedTo, assignedAt: new Date(), assignmentType: 'manual' });
    res.json({ success: true, message: 'Candidate assigned.' });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// POST /api/org/:orgId/pipeline — Add candidate to pipeline
router.post('/:orgId/pipeline', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { jobId, candidateId, matchId, stage } = req.body;
  try {
    const entry = await CandidatePipeline.findOneAndUpdate(
      { organizationId: req.params.orgId, jobId, candidateId },
      { organizationId: req.params.orgId, jobId, candidateId, matchId, stage: stage || 'applied',
        stageHistory: [{ stage: stage || 'applied', movedBy: req.user.userId }] },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true, pipeline: entry });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. CANDIDATE NOTES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/notes/:candidateId', requireOrgMember, async (req, res) => {
  try {
    const notes = await CandidateNote.find({ organizationId: req.params.orgId, candidateId: req.params.candidateId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, notes });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/:orgId/notes', requireOrgMember, async (req, res) => {
  const { candidateId, jobId, content } = req.body;
  if (!candidateId || !content) return res.status(400).json({ success: false, message: 'candidateId and content are required.' });
  try {
    const note = await CandidateNote.create({ organizationId: req.params.orgId, candidateId, jobId, authorId: req.user.userId, authorName: req.user.name || '', content });
    res.status(201).json({ success: true, note });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/:orgId/notes/:noteId', requireOrgMember, async (req, res) => {
  try { await CandidateNote.deleteOne({ _id: req.params.noteId, organizationId: req.params.orgId }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. CANDIDATE TAGS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/tags/:candidateId', requireOrgMember, async (req, res) => {
  try {
    const tags = await CandidateTag.find({ organizationId: req.params.orgId, candidateId: req.params.candidateId }).lean();
    res.json({ success: true, tags });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/:orgId/tags/:candidateId', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { tags, jobId } = req.body;
  try {
    const doc = await CandidateTag.findOneAndUpdate(
      { organizationId: req.params.orgId, candidateId: req.params.candidateId, jobId: jobId || null },
      { tags: tags || [], addedBy: req.user.userId },
      { upsert: true, new: true }
    );
    res.json({ success: true, tags: doc.tags });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.post('/:orgId/bulk/move', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { pipelineIds, stage } = req.body;
  if (!Array.isArray(pipelineIds) || !stage) return res.status(400).json({ success: false, message: 'pipelineIds array and stage are required.' });
  try {
    const result = await CandidatePipeline.updateMany(
      { _id: { $in: pipelineIds }, organizationId: req.params.orgId },
      { $set: { stage }, $push: { stageHistory: { stage, movedBy: req.user.userId, movedAt: new Date(), notes: 'Bulk move' } } }
    );
    res.json({ success: true, modified: result.modifiedCount });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/:orgId/bulk/assign', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { pipelineIds, assignedTo } = req.body;
  if (!Array.isArray(pipelineIds) || !assignedTo) return res.status(400).json({ success: false, message: 'pipelineIds and assignedTo are required.' });
  try {
    const result = await CandidatePipeline.updateMany(
      { _id: { $in: pipelineIds }, organizationId: req.params.orgId },
      { $set: { assignedTo, assignedAt: new Date(), assignmentType: 'manual' } }
    );
    res.json({ success: true, modified: result.modifiedCount });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/:orgId/bulk/reject', requireOrgMember, requireOrgPermission('manageCandidates'), async (req, res) => {
  const { pipelineIds, reason } = req.body;
  if (!Array.isArray(pipelineIds)) return res.status(400).json({ success: false, message: 'pipelineIds array is required.' });
  try {
    const result = await CandidatePipeline.updateMany(
      { _id: { $in: pipelineIds }, organizationId: req.params.orgId },
      { $set: { stage: 'rejected', rejectedBy: req.user.userId, rejectedAt: new Date(), rejectionReason: reason || '' },
        $push: { stageHistory: { stage: 'rejected', movedBy: req.user.userId, movedAt: new Date(), notes: reason || 'Bulk reject' } } }
    );
    res.json({ success: true, modified: result.modifiedCount });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. ORGANIZATION ANALYTICS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/analytics', requireOrgMember, requireOrgPermission('viewAnalytics'), async (req, res) => {
  try {
    const orgId = req.params.orgId;
    const members = await OrganizationMember.find({ organizationId: orgId, status: 'active' }).lean();
    const recruiterIds = members.map(m => m.userId);
    const jobs = await Job.find({ postedBy: { $in: recruiterIds } }).lean();
    const jobIds = jobs.map(j => j._id);
    const pipeline = await CandidatePipeline.find({ organizationId: orgId }).lean();
    const matches = await Match.find({ jobId: { $in: jobIds }, applied: true }).lean();

    res.json({
      success: true,
      analytics: {
        totalJobs:      jobs.length,
        activeJobs:     jobs.filter(j => j.status === 'open').length,
        closedJobs:     jobs.filter(j => j.status === 'closed').length,
        totalCandidates:pipeline.length,
        totalApplications: matches.length,
        offers:         pipeline.filter(p => p.stage === 'offer').length,
        hires:          pipeline.filter(p => p.stage === 'joined').length,
        rejected:       pipeline.filter(p => p.stage === 'rejected').length,
        teamSize:       members.length,
        byStage: {
          applied:    pipeline.filter(p => p.stage === 'applied').length,
          screening:  pipeline.filter(p => p.stage === 'screening').length,
          technical:  pipeline.filter(p => p.stage === 'technical').length,
          hr:         pipeline.filter(p => p.stage === 'hr').length,
          manager:    pipeline.filter(p => p.stage === 'manager').length,
          offer:      pipeline.filter(p => p.stage === 'offer').length,
          joined:     pipeline.filter(p => p.stage === 'joined').length,
          rejected:   pipeline.filter(p => p.stage === 'rejected').length,
        },
      },
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. RECRUITER WORKLOAD
// ══════════════════════════════════════════════════════════════════════════════

router.get('/:orgId/workload', requireOrgMember, requireOrgPermission('viewAnalytics'), async (req, res) => {
  try {
    const members = await OrganizationMember.find({ organizationId: req.params.orgId, status: 'active', role: { $in: ['recruiter', 'hr_manager', 'owner'] } }).lean();
    const workload = await Promise.all(members.map(async m => {
      const user = await User.findOne({ userId: m.userId }).select('name email profilePicture').lean();
      const assigned = await CandidatePipeline.countDocuments({ organizationId: req.params.orgId, assignedTo: m.userId, stage: { $nin: ['joined', 'rejected', 'withdrawn'] } });
      const openJobs = await Job.countDocuments({ postedBy: m.userId, status: 'open' });
      return { ...m, user, assignedCandidates: assigned, openJobs };
    }));
    res.json({ success: true, workload });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
