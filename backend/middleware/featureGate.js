/**
 * Feature Gate Middleware — verifies the organization's subscription plan allows the requested feature.
 * 
 * Usage:
 *   import { requireFeature } from '../middleware/featureGate.js';
 *   router.post('/ai/chat', requireFeature('aiFeatures'), handler);
 */
import Subscription from '../models/saas/Subscription.js';
import SubscriptionPlan from '../models/saas/SubscriptionPlan.js';

export function requireFeature(featureKey) {
  return async (req, res, next) => {
    // Platform admins bypass feature gates
    if (req.user?.role === 'admin') return next();

    const orgId = req.orgId || req.body?.organizationId || req.query?.orgId;
    if (!orgId) return next(); // No org context = individual user, allow

    try {
      const sub = await Subscription.findOne({ organizationId: orgId, status: { $in: ['active', 'trial'] } }).lean();
      if (!sub) {
        return res.status(402).json({ success: false, message: 'No active subscription. Please upgrade your plan.', errorCode: 'NO_SUBSCRIPTION' });
      }

      const plan = await SubscriptionPlan.findById(sub.planId).lean();
      if (!plan) return next(); // No plan found = allow (graceful degradation)

      if (plan.features && plan.features[featureKey] === false) {
        return res.status(403).json({
          success: false,
          message: `This feature requires a higher subscription plan. Upgrade to access "${featureKey}".`,
          errorCode: 'FEATURE_NOT_AVAILABLE',
          requiredFeature: featureKey,
          currentPlan: plan.key,
        });
      }

      next();
    } catch (error) {
      // Fail open — don't block on middleware errors
      next();
    }
  };
}

export default { requireFeature };
