import express from 'express';
import Company from '../models/Company.js';
import CompanyFollow from '../models/CompanyFollow.js';
import Job from '../models/Job.js';
import { authenticateToken } from '../middleware/auth.js';
import { slugifyCompany } from '../utils/companyUtils.js';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';
import cache from '../utils/cache.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const { page, limit, skip } = parsePagination(req.query, { limit: 20 });

    const cacheKey = !search ? `companies:p${page}:l${limit}` : null;
    if (cacheKey) {
      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);
    }

    const filter = search
      ? { $or: [{ name: new RegExp(search, 'i') }, { industry: new RegExp(search, 'i') }, { techStack: new RegExp(search, 'i') }] }
      : {};

    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Company.countDocuments(filter),
    ]);

    const withStats = await Promise.all(companies.map(async company => ({
      ...company,
      activeJobs: await Job.countDocuments({ company: new RegExp(`^${company.name}$`, 'i'), status: 'open' }),
      followers: await CompanyFollow.countDocuments({ companyId: company._id }),
    })));

    const response = paginatedResponse(withStats, total, page, limit, { companies: withStats });
    if (cacheKey) cache.set(cacheKey, response, 45);
    res.json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/following/me', authenticateToken, async (req, res) => {
  try {
    const follows = await CompanyFollow.find({ userId: req.user.userId }).populate('companyId').sort({ createdAt: -1 });
    res.json(follows.map(f => f.companyId).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;
    let company = await Company.findOne({ slug }).lean();
    if (!company) {
      const name = slug.replace(/-/g, ' ');
      company = await Company.findOne({ name: new RegExp(`^${name}$`, 'i') }).lean();
    }
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const [openJobs, activeJobs, followers] = await Promise.all([
      Job.find({ company: new RegExp(`^${company.name}$`, 'i'), status: 'open' }).sort({ createdAt: -1 }).limit(20),
      Job.countDocuments({ company: new RegExp(`^${company.name}$`, 'i'), status: 'open' }),
      CompanyFollow.countDocuments({ companyId: company._id }),
    ]);
    res.json({ ...company, activeJobs, followers, openJobs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:slug/follow', authenticateToken, async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug || slugifyCompany(req.params.slug) });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    const follow = await CompanyFollow.findOneAndUpdate(
      { userId: req.user.userId, companyId: company._id },
      { userId: req.user.userId, companyId: company._id },
      { upsert: true, new: true },
    );
    res.status(201).json({ following: true, follow });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:slug/follow', authenticateToken, async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await CompanyFollow.deleteOne({ userId: req.user.userId, companyId: company._id });
    res.json({ following: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
