import mongoose from 'mongoose';
const marketplaceExtensionSchema = new mongoose.Schema({
  key:          { type: String, required: true, unique: true, index: true },
  name:         { type: String, required: true },
  description:  { type: String, default: '' },
  category:     { type: String, enum: ['integration', 'theme', 'analytics', 'assessment', 'learning', 'extension'], default: 'extension' },
  publisher:    { type: String, default: 'TINCLO' },
  version:      { type: String, default: '1.0.0' },
  logo:         { type: String, default: '' },
  price:        { type: Number, default: 0 },
  currency:     { type: String, default: 'USD' },
  installCount: { type: Number, default: 0 },
  rating:       { type: Number, default: 0 },
  isActive:     { type: Boolean, default: true },
  isPremium:    { type: Boolean, default: false },
}, { timestamps: true });

marketplaceExtensionSchema.index({ category: 1, isActive: 1 });
export default mongoose.model('MarketplaceExtension', marketplaceExtensionSchema);
