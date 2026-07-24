const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');
const { parsePagination } = require('../utils/pagination');
const { isMemberOwner } = require('../utils/ownership');

async function list(req, res) {
  const leadId = req.params.id;

  if (!mongoose.isValidObjectId(leadId)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  if (req.user.role === 'member' && !isMemberOwner(lead, req.user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not your lead' });
  }

  const { page, limit, skip } = parsePagination(req.query);

  const [items, total] = await Promise.all([
    Activity.find({ leadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actorId', 'name email'),
    Activity.countDocuments({ leadId }),
  ]);

  return res.status(200).json({
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

module.exports = { list };
