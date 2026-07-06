import mongoose from 'mongoose';

const webhookDeliverySchema = new mongoose.Schema({
  appId:      { type: String, required: true, index: true },
  event:      { type: String, required: true },
  url:        { type: String, required: true },
  payload:    { type: mongoose.Schema.Types.Mixed, default: {} },
  statusCode: { type: Number, default: null },
  response:   { type: String, default: '' },
  success:    { type: Boolean, default: false },
  attempts:   { type: Number, default: 1 },
  maxAttempts:{ type: Number, default: 5 },
  nextRetryAt:{ type: Date, default: null },
  deliveredAt:{ type: Date, default: null },
  error:      { type: String, default: '' },
}, { timestamps: true });

webhookDeliverySchema.index({ appId: 1, createdAt: -1 });
webhookDeliverySchema.index({ success: 1, nextRetryAt: 1 });
export default mongoose.model('WebhookDelivery', webhookDeliverySchema);
