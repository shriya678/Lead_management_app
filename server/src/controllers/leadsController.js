const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const User = require('../models/User');
const Note = require('../models/Note');
const Activity = require('../models/Activity');
const { parsePagination } = require('../utils/pagination');
const { isMemberOwner } = require('../utils/ownership');
const { writeActivity } = require('../utils/activityLog');

const ADMIN_UPDATABLE = ['name', 'email', 'phone', 'company', 'source', 'status'];
const MEMBER_UPDATABLE = ['status', 'phone', 'company'];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  const oldStatus = lead.status;

  Object.assign(lead, updates);
  await lead.save();

  if (updates.status && updates.status !== oldStatus) {
    await writeActivity({
      leadId: lead.id,
      actorId: req.user.id,
      type: 'status_changed',
      meta: { from: oldStatus, to: updates.status },
    });
  }

  const otherFields = Object.keys(updates).filter((k) => k !== 'status');
  if (otherFields.length > 0) {
    await writeActivity({
      leadId: lead.id,
      actorId: req.user.id,
      type: 'updated',
      meta: { fields: otherFields },
    });
  }

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

  const oldAssignedTo = lead.assignedTo ? lead.assignedTo.toString() : null;
  lead.assignedTo = assignedTo;
  await lead.save();

  await writeActivity({
    leadId: lead.id,
    actorId: req.user.id,
    type: 'assigned',
    meta: { from: oldAssignedTo, to: assignedTo },
  });

  await lead.populate('assignedTo', 'name email');
  return res.status(200).json({ lead });
}

async function remove(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const lead = await Lead.findById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  // Explicit cascade — three ops instead of a transaction to keep Atlas M0 friendly.
  await Note.deleteMany({ leadId: lead.id });
  await Activity.deleteMany({ leadId: lead.id });
  await Lead.findByIdAndDelete(lead.id);

  return res.status(204).end();
}

module.exports = { list, getOne, update, assign, remove };
