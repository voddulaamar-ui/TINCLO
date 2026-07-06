import mongoose from 'mongoose';

const apiLogSchema = new mongoose.Schema({
  appId:       { type: String, default: null, index: true },
  developerId: { type: String, default: null, index: true },
  method:      { type: String, required: true },
  path:        { type: String, required: true },
  statusCode:  { type: Number, default: 200 },
  latency:     { type: Number, default: 0 },
  ip:          { type: String, default: '' },
  userAgent:   { type: String, default: '' },
  error:       { type: String, default: '' },
  version:     { type: String, default: 'v1' },
}, { timestamps: true });

apiLogSchema.index({ appId: 1, createdAt: -1 });
apiLogSchema.index({ path: 1, createdAt: -1 });
// TTL: auto-delete after 90 days
apiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 });
export default mongoose.model('ApiLog', apiLogSchema);
