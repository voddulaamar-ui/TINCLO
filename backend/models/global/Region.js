import mongoose from 'mongoose';
const regionSchema = new mongoose.Schema({
  key:        { type: String, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  countries:  { type: [String], default: [] },
  dataCenter: { type: String, default: '' },
  timezone:   { type: String, default: 'UTC' },
  currency:   { type: String, default: 'USD' },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Region', regionSchema);
