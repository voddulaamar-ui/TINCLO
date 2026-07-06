import mongoose from 'mongoose';

const badgeSchema = new mongoose.Schema({
  key:         { type: String, required: true, unique: true, index: true },
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  icon:        { type: String, default: '🎖️' },
  category:    { type: String, default: 'general' },
  rarity:      { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'], default: 'common' },
  condition:   { type: mongoose.Schema.Types.Mixed, default: {} },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Badge', badgeSchema);
