import mongoose from 'mongoose';
const currencySchema = new mongoose.Schema({
  code:     { type: String, required: true, unique: true, uppercase: true },
  name:     { type: String, required: true },
  symbol:   { type: String, default: '' },
  rate:     { type: Number, default: 1 },  // relative to USD
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Currency', currencySchema);
