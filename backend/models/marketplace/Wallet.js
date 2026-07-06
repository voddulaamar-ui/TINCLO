import mongoose from 'mongoose';
const transactionSchema = new mongoose.Schema({
  type:        { type: String, enum: ['deposit', 'withdrawal', 'earning', 'refund', 'escrow_hold', 'escrow_release', 'fee'], required: true },
  amount:      { type: Number, required: true },
  currency:    { type: String, default: 'INR' },
  description: { type: String, default: '' },
  referenceId: { type: String, default: null },
  status:      { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  at:          { type: Date, default: Date.now },
}, { _id: true });

const walletSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  balance:      { type: Number, default: 0 },
  escrowHeld:   { type: Number, default: 0 },
  totalEarned:  { type: Number, default: 0 },
  totalSpent:   { type: Number, default: 0 },
  currency:     { type: String, default: 'INR' },
  transactions: { type: [transactionSchema], default: [] },
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
