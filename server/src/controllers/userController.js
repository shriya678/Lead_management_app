const User = require('../models/User');

async function listUsers(_req, res) {
  const users = await User.find({}).sort({ createdAt: -1 });
  return res.status(200).json({
    users: users.map((u) => u.toPublicJSON()),
  });
}

module.exports = { listUsers };
