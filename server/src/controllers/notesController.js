const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Note = require('../models/Note');
const { parsePagination } = require('../utils/pagination');
const { isMemberOwner } = require('../utils/ownership');
const { writeActivity } = require('../utils/activityLog');

async function create(req, res) {
  const leadId = req.params.id;

  if (!mongoose.isValidObjectId(leadId)) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  const raw = req.body && typeof req.body.body === 'string' ? req.body.body.trim() : '';
  if (!raw) {
    return res.status(400).json({ error: 'BadRequest', message: 'body is required' });
  }
  if (raw.length > 5000) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'body must be 5000 characters or fewer',
    });
  }

  const lead = await Lead.findById(leadId);
  if (!lead) {
    return res.status(404).json({ error: 'NotFound', message: 'Lead not found' });
  }

  if (req.user.role === 'member' && !isMemberOwner(lead, req.user)) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not your lead' });
  }

  const note = await Note.create({
    leadId,
    authorId: req.user.id,
    body: raw,
  });

  await writeActivity({
    leadId,
    actorId: req.user.id,
    type: 'note_added',
    meta: { noteId: note.id, preview: raw.slice(0, 80) },
  });

  await note.populate('authorId', 'name email');
  return res.status(201).json({ note });
}

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
    Note.find({ leadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('authorId', 'name email'),
    Note.countDocuments({ leadId }),
  ]);

  return res.status(200).json({
    items,
    page,
    limit,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
}

module.exports = { create, list };
