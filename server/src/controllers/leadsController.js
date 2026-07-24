const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { parsePagination } = require('../utils/pagination');

const ADMIN_UPDATABLE = ['name', 'email', 'phone', 'company', 'source', 'status'];
const MEMBER_UPDATABLE = ['status', 'phone', 'company'];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMemberOwner(lead, user) {
  return lead.assignedTo && lead.assignedTo.toString() === user.id;
}

async function list(req, res) {
  const { page, limit, skip } = parsePagination(req.query);
  const filter = {};

  if (req.user.role === 'member') {
    filter.assignedTo = req.user.id;
  } else if (req.query.assignedTo) {
    if (req.query.assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (mongoose.isValidObjectId(req.query.assignedTo)) {
      filter.assignedTo = req.query.assignedTo;
    } else {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'assignedTo must be a valid userId or "unassigned"',
      });
    }
  }

  if (req.query.status) {
    if (!Lead.STATUSES.includes(req.query.status)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `status must be one of: ${Lead.STATUSES.join(', ')}`,
      });
    }
    filter.status = req.query.status;
  }

  if (req.query.q) {
    const q = escapeRegex(String(req.query.q));
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'name email'),
    Lead.countDocuments(filter),
  ]);

  return res.status(200).json({
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

async function getOne(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  if (req.user.role === 'member' && !isMemberOwner(lead, req.user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not your lead' });
  }

  await lead.populate('assignedTo', 'name email');
  return res.status(200).json({ lead });
}

async function update(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const body = req.body || {};

  if (Object.prototype.hasOwnProperty.call(body, 'assignedTo')) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'Use PATCH /leads/:id/assign to change assignment',
    });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  if (req.user.role === 'member' && !isMemberOwner(lead, req.user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not your lead' });
  }

  const allowed = req.user.role === 'admin' ? ADMIN_UPDATABLE : MEMBER_UPDATABLE;
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `No updatable fields provided. Allowed: ${allowed.join(', ')}`,
    });
  }

  if (updates.status && !Lead.STATUSES.includes(updates.status)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `status must be one of: ${Lead.STATUSES.join(', ')}`,
    });
  }

  if (updates.source && !Lead.SOURCES.includes(updates.source)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `source must be one of: ${Lead.SOURCES.join(', ')}`,
    });
  }

  Object.assign(lead, updates);
  await lead.save();
  await lead.populate('assignedTo', 'name email');

  return res.status(200).json({ lead });
}

async function assign(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const body = req.body || {};
  if (!Object.prototype.hasOwnProperty.call(body, 'assignedTo')) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'assignedTo is required (userId or null)',
    });
  }

  const { assignedTo } = body;

  if (assignedTo !== null) {
    if (!mongoose.isValidObjectId(assignedTo)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'assignedTo must be a valid userId or null',
      });
    }
    const target = await User.findById(assignedTo);
    if (!target || target.role !== 'member') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'assignedTo must reference an existing member',
      });
    }
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  lead.assignedTo = assignedTo;
  await lead.save();
  await lead.populate('assignedTo', 'name email');

  return res.status(200).json({ lead });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const result = await Lead.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  return res.status(204).end();
}

module.exports = { list, getOne, update, assign, remove };
