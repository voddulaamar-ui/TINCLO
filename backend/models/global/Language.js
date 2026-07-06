import mongoose from 'mongoose';
const languageSchema = new mongoose.Schema({
  code:      { type: String, required: true, unique: true },  // 'en', 'hi', 'fr'
  name:      { type: String, required: true },
  nativeName:{ type: String, default: '' },
  direction: { type: String, enum: ['ltr', 'rtl'], default: 'ltr' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Language', languageSchema);
