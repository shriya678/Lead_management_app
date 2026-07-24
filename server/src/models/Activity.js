const mongoose = require('mongoose');

// meta shape convention per type:
//   created         { source }
//   status_changed  { from, to }              (status enum values)
//   assigned        { from, to }              (userId or null)
//   note_added      { noteId, preview }       (preview = body.slice(0, 80))
//   updated         { fields }                (array of field names, non-status/non-assign)
const TYPES = ['created', 'status_changed', 'assigned', 'note_added', 'updated'];

const activitySchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: TYPES,
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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

activitySchema.index({ leadId: 1, createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);
Activity.TYPES = TYPES;

module.exports = Activity;
