const request = require('supertest');
const { createUser } = require('./factories');

async function loginAndToken(app, { email, password }) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken;
}

async function loginAndTokens(app, { email, password }) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { access: res.body.accessToken, refresh: res.body.refreshToken };
}

async function seedAdminAndMember(app) {
  const { user: admin, plainPassword: adminPwd } = await createUser({
    name: 'Test Admin',
    email: 'admin@test.com',
    role: 'admin',
  });
  const { user: member, plainPassword: memberPwd } = await createUser({
    name: 'Test Member',
    email: 'member@test.com',
    role: 'member',
  });

  const adminToken = await loginAndToken(app, { email: admin.email, password: adminPwd });
  const memberToken = await loginAndToken(app, { email: member.email, password: memberPwd });

  return { admin, member, adminToken, memberToken };
}

module.exports = { loginAndToken, loginAndTokens, seedAdminAndMember };
