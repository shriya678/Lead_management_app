const Activity = require('../models/Activity');

// Best-effort: audit writes must never fail the parent request.
async function writeActivity({ leadId, actorId, type, meta = {} }) {
  try {
    await Activity.create({ leadId, actorId, type, meta });
  } catch (err) {
    console.error('Activity write failed:', { leadId, type, message: err.message });
  }
}

module.exports = { writeActivity };
