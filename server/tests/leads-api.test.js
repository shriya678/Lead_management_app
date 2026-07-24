const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./helpers/db');
const { createLead } = require('./helpers/factories');
const { seedAdminAndMember } = require('./helpers/auth');
const Note = require('../src/models/Note');
const Activity = require('../src/models/Activity');

setupTestDB();

describe('Public capture', () => {
  test('honeypot triggers 400 with opaque message', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ name: 'X', email: 'x@x.com', website: 'trap' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid submission');
  });

  test('missing name returns 400', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });

  test('invalid email format returns 400 (mapped from Mongoose ValidationError)', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ name: 'X', email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('valid submission defaults to status=new, assignedTo=null', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ name: 'Rahul', email: 'rahul@x.com', source: 'referral' });
    expect(res.status).toBe(201);
    expect(res.body.lead.status).toBe('new');
    expect(res.body.lead.assignedTo).toBeNull();
    expect(res.body.lead.source).toBe('referral');
  });

  test('unknown source falls back to website', async () => {
    const res = await request(app)
      .post('/api/public/leads')
      .send({ name: 'X', email: 'y@x.com', source: 'not-a-real-source' });
    expect(res.status).toBe(201);
    expect(res.body.lead.source).toBe('website');
  });
});

describe('Pagination cap', () => {
  test('limit=99999 is capped at MAX_LIMIT (100)', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    for (let i = 0; i < 3; i++) await createLead({});
    const res = await request(app)
      .get('/api/leads?limit=99999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });
});

describe('PATCH /api/leads/:id — field whitelist', () => {
  test('member update with only disallowed fields returns 400', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: 'Trying to change identity' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no updatable fields/i);
  });

  test('PATCH with assignedTo in body returns 400 (must use /assign)', async () => {
    const { member, adminToken } = await seedAdminAndMember(app);
    const lead = await createLead({});
    const res = await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: String(member._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/\/assign/);
  });

  test('invalid status enum returns 400', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const lead = await createLead({});
    const res = await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'not-a-status' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /:id/assign — target validation', () => {
  test('assign to an admin (not member) returns 400', async () => {
    const { admin, adminToken } = await seedAdminAndMember(app);
    const lead = await createLead({});
    const res = await request(app)
      .patch(`/api/leads/${lead._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: String(admin._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/member/i);
  });

  test('assign with malformed userId returns 400', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const lead = await createLead({});
    const res = await request(app)
      .patch(`/api/leads/${lead._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: 'not-a-valid-id' });
    expect(res.status).toBe(400);
  });

  test('assign to null unassigns the lead', async () => {
    const { member, adminToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .patch(`/api/leads/${lead._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: null });
    expect(res.status).toBe(200);
    expect(res.body.lead.assignedTo).toBeNull();
  });
});

describe('Notes — validation', () => {
  test('empty body returns 400', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: '   ' });
    expect(res.status).toBe(400);
  });

  test('body over 5000 chars returns 400', async () => {
    const { member, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });
    const res = await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'x'.repeat(5001) });
    expect(res.status).toBe(400);
  });
});

describe('Cascade delete', () => {
  test('deleting a lead removes its notes and activity', async () => {
    const { member, adminToken, memberToken } = await seedAdminAndMember(app);
    const lead = await createLead({ assignedTo: member._id });

    await request(app)
      .post(`/api/leads/${lead._id}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'first note' });

    await request(app)
      .patch(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'contacted' });

    expect(await Note.countDocuments({ leadId: lead._id })).toBeGreaterThan(0);
    expect(await Activity.countDocuments({ leadId: lead._id })).toBeGreaterThan(0);

    const del = await request(app)
      .delete(`/api/leads/${lead._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(204);

    expect(await Note.countDocuments({ leadId: lead._id })).toBe(0);
    expect(await Activity.countDocuments({ leadId: lead._id })).toBe(0);
  });
});

describe('404 responses', () => {
  test('GET /api/leads/:malformed returns 404', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .get('/api/leads/not-a-valid-id')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/leads/:nonexistent returns 404', async () => {
    const { adminToken } = await seedAdminAndMember(app);
    const res = await request(app)
      .get('/api/leads/000000000000000000000000')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
