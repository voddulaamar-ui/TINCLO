import mongoose from 'mongoose';

const officeSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true, trim: true },    // "Hyderabad Office"
  city:           { type: String, default: '' },
  state:          { type: String, default: '' },
  country:        { type: String, default: '' },
  address:        { type: String, default: '' },
  isHeadquarters: { type: Boolean, default: false },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

officeSchema.index({ organizationId: 1, name: 1 }, { unique: true });

export default mongoose.model('Office', officeSchema);
