import Company from '../models/Company.js';

export const slugifyCompany = (name = '') => name
  .toString()
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || `company-${Date.now()}`;

export async function ensureCompanyFromJob(job) {
  if (!job?.company) return null;
  const slug = slugifyCompany(job.company);
  const update = {
    $setOnInsert: {
      name: job.company,
      slug,
      logo: job.companyLogo || null,
      about: job.companyDescription || '',
      industry: job.domain || '',
      headquarters: job.location || '',
      techStack: job.skillsRequired || [],
      benefits: [],
      hiringStatus: 'Hiring',
    },
    $set: {
      ...(job.companyLogo ? { logo: job.companyLogo } : {}),
      ...(job.companyDescription ? { about: job.companyDescription } : {}),
      updatedAt: new Date(),
    },
  };
  return Company.findOneAndUpdate({ slug }, update, { upsert: true, new: true });
}
