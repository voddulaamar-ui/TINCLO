import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Job from '../models/Job.js';
import Match from '../models/Match.js';
import JobView from '../models/JobView.js';

dotenv.config();

const apply = process.argv.includes('--apply');

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined');
  }

  if (process.env.MONGODB_URI.includes('.query.mongodb.net') || process.env.MONGODB_URI.includes('atlas-sql')) {
    throw new Error('MONGODB_URI is an Atlas SQL/query endpoint. Use the MongoDB Atlas driver connection string before running cleanup.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const registeredUsers = await User.find({
    email: { $nin: [null, ''] },
    password: { $nin: [null, ''] },
  }).select('userId');
  const registeredUserIds = registeredUsers.map((user) => user.userId);

  const validJobIds = await Job.distinct('_id');
  const matchedJobIds = await Match.distinct('jobId');
  const viewedJobIds = await JobView.distinct('jobId');
  const keepJobIds = [...new Set([...matchedJobIds, ...viewedJobIds].map((id) => id.toString()))];

  const legacyUsersFilter = {
    role: 'user',
    $or: [
      { email: { $in: [null, ''] } },
      { password: { $in: [null, ''] } },
    ],
  };

  const orphanMatchesFilter = {
    $or: [
      { userId: { $nin: registeredUserIds } },
      { jobId: { $nin: validJobIds } },
    ],
  };

  const orphanViewsFilter = {
    $or: [
      { userId: { $nin: registeredUserIds } },
      { jobId: { $nin: validJobIds } },
    ],
  };

  const unusedJobsFilter = {
    _id: { $nin: keepJobIds },
    isExternal: true,
  };

  const counts = {
    legacyUsers: await User.countDocuments(legacyUsersFilter),
    orphanMatches: await Match.countDocuments(orphanMatchesFilter),
    orphanJobViews: await JobView.countDocuments(orphanViewsFilter),
    unusedExternalJobs: await Job.countDocuments(unusedJobsFilter),
  };

  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', counts }, null, 2));

  if (apply) {
    await Promise.all([
      User.deleteMany(legacyUsersFilter),
      Match.deleteMany(orphanMatchesFilter),
      JobView.deleteMany(orphanViewsFilter),
      Job.deleteMany(unusedJobsFilter),
    ]);
    console.log('Cleanup applied.');
  } else {
    console.log('Dry run only. Re-run with --apply to delete these records.');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
