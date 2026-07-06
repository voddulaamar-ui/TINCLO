/**
 * Organization permission middleware.
 * Validates that the user belongs to the organization and has the required permission.
 * 
 * Usage in routes:
 *   import { requireOrgMember, requireOrgPermission } from '../middleware/orgPermissions.js';
 *   router.post('/jobs', requireOrgMember, requireOrgPermission('createJob'), handler);
 */
import OrganizationMember from '../models/OrganizationMember.js';

// ── Role → default permissions mapping ───────────────────────────────────────
const ROLE_DEFAULTS = {
  owner:          { createJob: true, editJob: true, deleteJob: true, approveJob: true, viewCandidates: true, manageCandidates: true, scheduleInterview: true, submitFeedback: true, createOffer: true, approveOffer: true, manageTeam: true, viewAnalytics: true, manageSettings: true, manageBilling: true },
  hr_manager:     { createJob: true, editJob: true, deleteJob: false, approveJob: true, viewCandidates: true, manageCandidates: true, scheduleInterview: true, submitFeedback: true, createOffer: true, approveOffer: true, manageTeam: true, viewAnalytics: true, manageSettings: false, manageBilling: false },
  recruiter:      { createJob: true, editJob: true, deleteJob: false, approveJob: false, viewCandidates: true, manageCandidates: true, scheduleInterview: true, submitFeedback: true, createOffer: false, approveOffer: false, manageTeam: false, viewAnalytics: true, manageSettings: false, manageBilling: false },
  interviewer:    { createJob: false, editJob: false, deleteJob: false, approveJob: false, viewCandidates: true, manageCandidates: false, scheduleInterview: false, submitFeedback: true, createOffer: false, approveOffer: false, manageTeam: false, viewAnalytics: false, manageSettings: false, manageBilling: false },
  hiring_manager: { createJob: false, editJob: false, deleteJob: false, approveJob: true, viewCandidates: true, manageCandidates: false, scheduleInterview: false, submitFeedback: true, createOffer: false, approveOffer: true, manageTeam: false, viewAnalytics: true, manageSettings: false, manageBilling: false },
  viewer:         { createJob: false, editJob: false, deleteJob: false, approveJob: false, viewCandidates: true, manageCandidates: false, scheduleInterview: false, submitFeedback: false, createOffer: false, approveOffer: false, manageTeam: false, viewAnalytics: true, manageSettings: false, manageBilling: false },
};

/**
 * Resolve effective permission for a member (override > role default).
 */
function hasPermission(member, permission) {
  // Explicit override takes precedence
  if (member.permissions && member.permissions[permission] !== null && member.permissions[permission] !== undefined) {
    return member.permissions[permission];
  }
  // Fall back to role defaults
  const defaults = ROLE_DEFAULTS[member.role] || {};
  return defaults[permission] || false;
}

/**
 * Middleware: require user is a member of the organization.
 * Extracts orgId from req.params.orgId, req.body.organizationId, or req.query.orgId.
 * Attaches req.orgMember with the membership document.
 */
export async function requireOrgMember(req, res, next) {
  const orgId = req.params.orgId || req.body.organizationId || req.query.orgId;
  if (!orgId) return res.status(400).json({ success: false, message: 'organizationId is required.', errorCode: 'MISSING_ORG_ID' });

  try {
    const member = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: req.user.userId,
      status: 'active',
    }).lean();

    if (!member) {
      return res.status(403).json({ success: false, message: 'You are not a member of this organization.', errorCode: 'NOT_ORG_MEMBER' });
    }

    req.orgMember = member;
    req.orgId = orgId;
    next();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Factory: require a specific permission.
 * Must be used AFTER requireOrgMember.
 */
export function requireOrgPermission(permission) {
  return (req, res, next) => {
    if (!req.orgMember) {
      return res.status(403).json({ success: false, message: 'Organization membership not verified.', errorCode: 'NO_MEMBERSHIP' });
    }

    // Platform admins bypass org permissions
    if (req.user.role === 'admin') return next();

    if (!hasPermission(req.orgMember, permission)) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to "${permission}" in this organization.`,
        errorCode: 'PERMISSION_DENIED',
      });
    }

    next();
  };
}

export { ROLE_DEFAULTS, hasPermission };
export default { requireOrgMember, requireOrgPermission, ROLE_DEFAULTS, hasPermission };
