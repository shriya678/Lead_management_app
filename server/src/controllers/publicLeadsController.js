const Lead = require('../models/Lead');

async function create(req, res) {
  const { name, email, phone, company, source, website } = req.body || {};

  // Honeypot: real users never fill the hidden `website` field; bots often do.
  if (website) {
    return res.status(400).json({ error: 'BadRequest', message: 'Invalid submission' });
  }

  if (!name || !email) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'name and email are required',
    });
  }

  const lead = await Lead.create({
    name,
    email,
    phone,
    company,
    source: Lead.SOURCES.includes(source) ? source : 'website',
    status: 'new',
    assignedTo: null,
  });

  return res.status(201).json({ lead });
}

module.exports = { create };
