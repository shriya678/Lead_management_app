const mongoose = require('mongoose');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const SOURCES = ['website', 'referral', 'ad', 'other'];

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_RE, 'Invalid email format'],
    },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, enum: SOURCES, default: 'website' },
    status: { type: String, enum: STATUSES, default: 'new' },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

leadSchema.index({ email: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);
Lead.STATUSES = STATUSES;
Lead.SOURCES = SOURCES;

module.exports = Lead;
