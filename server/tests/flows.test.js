const request = require('supertest');
const app = require('../src/app');
const { setupTestDB } = require('./helpers/db');
const { seedAdminAndMember } = require('./helpers/auth');

setupTestDB();

describe('Flow 1 — full lead lifecycle', () => {
  test('public capture → admin assigns → member updates status → adds note → activity trail is complete', async () => {
    const { member, adminToken, memberToken } = await seedAdminAndMember(app);

    const capture = await request(app)
      .post('/api/public/leads')
      .send({
        name: 'Rahul Sharma',
        email: 'rahul@acme.com',
        phone: '+91-9876543210',
        company: 'Acme Ltd',
        source: 'website',
      });
    expect(capture.status).toBe(201);
    const leadId = capture.body.lead.id;
    expect(capture.body.lead.status).toBe('new');
    expect(capture.body.lead.assignedTo).toBeNull();

    const adminList = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminList.status).toBe(200);
    expect(adminList.body.items.some((l) => l.id === leadId)).toBe(true);

    const assign = await request(app)
      .patch(`/api/leads/${leadId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: String(member._id) });
    expect(assign.status).toBe(200);

    const memberList = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberList.status).toBe(200);
    expect(memberList.body.items.some((l) => l.id === leadId)).toBe(true);

    const statusUpdate = await request(app)
      .patch(`/api/leads/${leadId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'contacted' });
    expect(statusUpdate.status).toBe(200);
    expect(statusUpdate.body.lead.status).toBe('contacted');

    const noteRes = await request(app)
      .post(`/api/leads/${leadId}/notes`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ body: 'Called today, sending proposal Monday' });
    expect(noteRes.status).toBe(201);
    expect(noteRes.body.note.body).toContain('Called today');

    const activityRes = await request(app)
      .get(`/api/leads/${leadId}/activity`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(activityRes.status).toBe(200);

    const byType = Object.fromEntries(activityRes.body.items.map((a) => [a.type, a]));

    expect(byType.created).toBeDefined();
    expect(byType.created.actorId).toBeNull();
    expect(byType.created.meta.source).toBe('website');

    expect(byType.assigned).toBeDefined();
    expect(byType.assigned.meta.from).toBeNull();
    expect(String(byType.assigned.meta.to)).toBe(String(member._id));

    expect(byType.status_changed).toBeDefined();
    expect(byType.status_changed.meta.from).toBe('new');
    expect(byType.status_changed.meta.to).toBe('contacted');

    expect(byType.note_added).toBeDefined();
    expect(byType.note_added.meta.preview).toContain('Called today');
  });
});

describe('Flow 2 — pagination and filtering under a realistic dataset', () => {
  test('25 leads: pagination + status/q/assignedTo filters return correct slices', async () => {
    const { member, adminToken, memberToken } = await seedAdminAndMember(app);

    const seeds = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        request(app)
          .post('/api/public/leads')
          .send({
            name: `Lead ${String(i + 1).padStart(2, '0')}`,
            email: `lead${i + 1}@bulk-seed.test`,
            source: 'website',
          })
      )
    );
    const captured = seeds.map((r) => r.body.lead);

    const page1 = await request(app)
      .get('/api/leads?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.total).toBe(25);
    expect(page1.body.pages).toBe(3);
    expect(page1.body.items.length).toBe(10);

    const page3 = await request(app)
      .get('/api/leads?page=3&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(page3.status).toBe(200);
    expect(page3.body.items.length).toBe(5);

    for (const lead of captured.slice(0, 4)) {
      await request(app)
        .patch(`/api/leads/${lead.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'contacted' });
    }

    const contacted = await request(app)
      .get('/api/leads?status=contacted')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(contacted.status).toBe(200);
    expect(contacted.body.total).toBe(4);
    contacted.body.items.forEach((l) => expect(l.status).toBe('contacted'));

    // Every seeded email contains "bulk-seed" — this q should match all 25.
    const qAll = await request(app)
      .get('/api/leads?q=bulk-seed')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(qAll.status).toBe(200);
    expect(qAll.body.total).toBe(25);

    // "lead1@" is a substring of exactly one seeded email (lead1@bulk-seed.test) —
    // "lead10@..." through "lead19@..." don't contain "lead1@" because @ breaks the match.
    const qOne = await request(app)
      .get('/api/leads?q=lead1@')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(qOne.status).toBe(200);
    expect(qOne.body.total).toBe(1);

    const unassigned = await request(app)
      .get('/api/leads?assignedTo=unassigned')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(unassigned.status).toBe(200);
    expect(unassigned.body.total).toBe(25);

    for (const lead of captured.slice(5, 10)) {
      await request(app)
        .patch(`/api/leads/${lead.id}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: String(member._id) });
    }

    const memberSees = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(memberSees.status).toBe(200);
    expect(memberSees.body.total).toBe(5);
    memberSees.body.items.forEach((l) => {
      const aid = typeof l.assignedTo === 'object' ? l.assignedTo._id : l.assignedTo;
      expect(String(aid)).toBe(String(member._id));
    });

    const assignedToMember = await request(app)
      .get(`/api/leads?assignedTo=${member._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(assignedToMember.status).toBe(200);
    expect(assignedToMember.body.total).toBe(5);
  });
});
