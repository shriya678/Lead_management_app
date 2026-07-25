const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { setupTestDB } = require('./helpers/db');
const { createUser, createLead } = require('./helpers/factories');
const { seedAdminAndMember } = require('./helpers/auth');

setupTestDB();

describe('requireAuth', () => {
  test('public endpoint works without a token', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Anon', email: 'anon@x.com' });
    expect(res.status).toBe(201);
  });

  test('protected endpoint returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('401 when Authorization is not Bearer scheme', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
  });

  test('401 with a bogus token', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  test('401 with an expired token', async () => {
    const token = jwt.sign({ sub: 'x', role: 'admin', name: 'X' }, process.env.JWT_SECRET, {
      expiresIn: '1ms',
    });
    await new Promise((r) => setTimeout(r, 30));
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });
});

describe('requireRole', () => {
  test('member gets 403 on GET /api/users', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  test('member gets 403 on PATCH /:id/assign', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .patch(`/api/leads/${lead._id}/assign`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ assignedTo: null });
    expect(res.status).toBe(403);
  });

  test('member gets 403 on DELETE /api/leads/:id', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .delete(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  test('admin can register new users (201)', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'New Guy',
        email: 'new@test.com',
        password: 'Test@1234',
        role: 'member',
      });
    expect(res.status).toBe(201);
  });

  test('member cannot register new users (403)', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        name: 'X',
        email: 'x@test.com',
        password: 'Test@1234',
        role: 'member',
      });
    expect(res.status).toBe(403);
  });
});

describe('Password hash never leaks + no user enumeration', () => {
  test('login response has no passwordHash', async () => {
    await createUser({ email: 'leak@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'leak@test.com', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  test('GET /api/users response never includes passwordHash', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.users.forEach((u) => expect(u).not.toHaveProperty('passwordHash'));
  });

  test('wrong password and unknown email return identical 401 message', async () => {
    await createUser({ email: 'exists@test.com', role: 'member' });
    const [unknown, wrong] = await Promise.all([
      request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'x' }),
      request(app)
        .post('/api/auth/login')
        .send({ email: 'exists@test.com', password: 'wrong' }),
    ]);
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.message).toBe(wrong.body.message);
  });
});

describe('Ownership rules — member scoped to own leads', () => {
  test('member list only includes leads assigned to them', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    await createLead({ assignedTo: member._id });
    await createLead({ assignedTo: member._id });
    await createLead({ assignedTo: null });
    const { user: other } = await createUser({ email: 'other@test.com', role: 'member' });
    await createLead({ assignedTo: other._id });

    const res = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    res.body.items.forEach((l) => {
      const aid = typeof l.assignedTo === 'object' ? l.assignedTo._id : l.assignedTo;
      expect(String(aid)).toBe(String(member._id));
    });
  });

  test('member GET on another member\'s lead returns 403', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const { user: other } = await createUser({ email: 'other2@test.com', role: 'member' });
    const lead = await createLead({ assignedTo: other._id });

    const res = await request(app)
      .get(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });

  test('member PATCH on non-owned lead returns 403', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: null });

    const res = await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'contacted' });

    expect(res.status).toBe(403);
  });

  test('member POST note on non-owned lead returns 403', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: null });

    const res = await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'should fail' });

    expect(res.status).toBe(403);
  });

  test('member GET activity on non-owned lead returns 403', async () => {
    const { memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: null });

    const res = await request(app)
      .get(`/api/leads/${lead._id}/activity`)
      .set('Authorization', `Bearer ${memberToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Login response shape (access + refresh)', () => {
  test('login returns accessToken, refreshToken, and user', async () => {
    await createUser({ email: 'shape@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shape@test.com', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).toHaveProperty('email', 'shape@test.com');
    expect(res.body).not.toHaveProperty('token'); // legacy field removed
  });

  test('access and refresh tokens are distinct (different secrets)', async () => {
    await createUser({ email: 'distinct@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'distinct@test.com', password: 'Test@1234' });
    expect(res.body.accessToken).not.toBe(res.body.refreshToken);
  });
});

describe('POST /api/auth/refresh', () => {
  async function loginAndGetRefresh() {
    await createUser({ email: 'refresh@test.com', role: 'admin' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'refresh@test.com', password: 'Test@1234' });
    return {
      refreshToken: res.body.refreshToken,
      accessToken: res.body.accessToken,
    };
  }

  test('happy path: returns a new access token', async () => {
    const { refreshToken } = await loginAndGetRefresh();
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    // No new refresh token issued (stateless, non-rotating).
    expect(res.body).not.toHaveProperty('refreshToken');
  });

  test('400 when refreshToken is missing from body', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/refreshToken/);
  });

  test('401 when refresh token is malformed', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'not-a-real-jwt' });
    expect(res.status).toBe(401);
  });

  test('401 when access token is passed as refresh token (different secret)', async () => {
    const { accessToken } = await loginAndGetRefresh();
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: accessToken });
    expect(res.status).toBe(401);
  });

  test('401 when refresh token is passed as access token (different secret)', async () => {
    const { refreshToken } = await loginAndGetRefresh();
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${refreshToken}`);
    expect(res.status).toBe(401);
  });

  test('401 with expired refresh token', async () => {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { sub: 'x', type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '1ms' }
    );
    await new Promise((r) => setTimeout(r, 30));
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('401 when the user in the refresh token has been deleted', async () => {
    const { refreshToken } = await loginAndGetRefresh();
    // Simulate account deletion by wiping users between issue and refresh.
    const User = require('../src/models/User');
    await User.deleteMany({});
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  test('new access token from refresh actually authorizes protected routes', async () => {
    const { refreshToken } = await loginAndGetRefresh();
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });
    const newAccess = refreshRes.body.accessToken;

    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${newAccess}`);
    expect(usersRes.status).toBe(200);
  });
});
