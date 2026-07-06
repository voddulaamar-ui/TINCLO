/**
 * Seed an admin user into the database.
 * Run: node seedAdmin.js
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const ADMIN_EMAIL = 'admin@tinclo.com';
const ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    existing.role = 'admin';
    existing.password = hashedPassword;
    existing.name = 'TINCLO Admin';
    await existing.save();
    console.log('✅ Existing user updated to admin');
  } else {
    await User.create({
      userId: 'admin-tinclo-001',
      name: 'TINCLO Admin',
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Admin user created');
  }

  console.log('\n  ┌─────────────────────────────────┐');
  console.log('  │  Admin Login Credentials        │');
  console.log('  ├─────────────────────────────────┤');
  console.log('  │  Email:    admin@tinclo.com     │');
  console.log('  │  Password: Admin@123            │');
  console.log('  │  URL:      /admin/login         │');
  console.log('  └─────────────────────────────────┘\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
