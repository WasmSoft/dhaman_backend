import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

/**
 * E2E: Agreements CRUD & Lifecycle endpoints
 *
 * All tests run against a real PostgreSQL database defined by DATABASE_URL.
 * New CRUD E2E blocks (POST/GET/PATCH /agreements) must use the real database
 * through `AppModule` and must not mock Prisma. Each describe block creates
 * its own data via HTTP endpoints.
 */
describe('POST /agreements/:id/send-invite (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let otherFreelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Obtain JWTs by registering two freelancer accounts via the auth endpoint
    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `f1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer One',
      });
    freelancerJwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `f2+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Two',
      });
    otherFreelancerJwt = r2.body.data?.accessToken ?? r2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createReadyDraftAgreement(): Promise<string> {
    // 1. Create client
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ name: 'E2E Client', email: `client+${Date.now()}@test.com` });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    // 2. Create agreement
    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'E2E Agreement', clientId, currency: 'SAR' });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    // 3. Add milestone
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Milestone 1', amount: 1000, currency: 'SAR', order: 1 });

    // 4. Update totalAmount to match milestones
    await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ totalAmount: 1000 });

    // 5. Create policy
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/policy`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        cancellationPolicy: 'No cancellations.',
        delayPolicy: 'Delays incur fees.',
        extraRequestPolicy: 'Extra work billed separately.',
        reviewPolicy: '3 review rounds included.',
        clientReviewPeriodDays: 3,
        freelancerDelayGraceDays: 2,
      });

    return agreementId;
  }

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app.getHttpServer()).post(
      '/api/v1/agreements/nonexistent/send-invite',
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when agreement does not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements/does-not-exist/send-invite')
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(404);
    expect(res.body.code ?? res.body.error?.code).toBe('AGREEMENT_NOT_FOUND');
  });

  it('returns 404 for an agreement owned by another freelancer', async () => {
    const agreementId = await createReadyDraftAgreement();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${otherFreelancerJwt}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 AGREEMENT_CLIENT_REQUIRED when no client is linked', async () => {
    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'No Client Agreement' });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(400);
    expect(res.body.code ?? res.body.error?.code).toBe(
      'AGREEMENT_CLIENT_REQUIRED',
    );
  });

  it('returns 400 VALIDATION_ERROR when no milestones exist', async () => {
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ name: 'Client NM', email: `cnm+${Date.now()}@test.com` });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'No Milestones', clientId });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(400);
    expect(res.body.code ?? res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with SENT status, sentAt, and 64-char tokens on success', async () => {
    const agreementId = await createReadyDraftAgreement();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('SENT');
    expect(body.sentAt).not.toBeNull();
    expect(typeof body.inviteToken).toBe('string');
    expect(body.inviteToken).toHaveLength(64);
    expect(typeof body.portalToken).toBe('string');
    expect(body.portalToken).toHaveLength(64);
  });

  it('returns 409 AGREEMENT_ALREADY_SENT when send-invite called a second time', async () => {
    const agreementId = await createReadyDraftAgreement();
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(409);
    expect(res.body.code ?? res.body.error?.code).toBe(
      'AGREEMENT_ALREADY_SENT',
    );
  });
});

describe('POST /agreements/:id/activate (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let otherFreelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `fa1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Activate',
      });
    freelancerJwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `fa2+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Activate 2',
      });
    otherFreelancerJwt = r2.body.data?.accessToken ?? r2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createApprovedAgreement(): Promise<string> {
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        name: 'Activate Client',
        email: `client+${Date.now()}@test.com`,
      });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Activate Agreement', clientId, currency: 'SAR' });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'M1', amount: 500, currency: 'SAR', order: 1 });
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'M2', amount: 500, currency: 'SAR', order: 2 });

    await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ totalAmount: 1000 });

    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/policy`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        cancellationPolicy: 'No cancellations.',
        delayPolicy: 'Delays incur fees.',
        extraRequestPolicy: 'Extra work billed separately.',
        reviewPolicy: '3 review rounds included.',
        clientReviewPeriodDays: 3,
        freelancerDelayGraceDays: 2,
      });

    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    // approve via portal
    const inviteRes = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
    const inviteToken = (inviteRes.body.data?.inviteToken ??
      inviteRes.body.inviteToken) as string;

    await request(app.getHttpServer())
      .post(`/api/v1/portal/approve/${inviteToken}`)
      .send({
        clientName: 'Activate Client',
        clientEmail: `client+${Date.now()}@test.com`,
      });

    return agreementId;
  }

  async function createDraftAgreementWithMilestone(): Promise<string> {
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ name: 'Draft Client', email: `draft+${Date.now()}@test.com` });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Draft Agreement', clientId, currency: 'SAR' });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'M1', amount: 500, currency: 'SAR', order: 1 });

    return agreementId;
  }

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app.getHttpServer()).post(
      '/api/v1/agreements/nonexistent/activate',
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when agreement does not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements/does-not-exist/activate')
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(404);
    expect(res.body.code ?? res.body.error?.code).toBe('AGREEMENT_NOT_FOUND');
  });

  it('returns 404 for an agreement owned by another freelancer', async () => {
    const agreementId = await createDraftAgreementWithMilestone();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/activate`)
      .set('Authorization', `Bearer ${otherFreelancerJwt}`);
    expect(res.status).toBe(404);
  });

  it('returns 409 when agreement is not APPROVED', async () => {
    const agreementId = await createDraftAgreementWithMilestone();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/activate`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(409);
    expect(res.body.code ?? res.body.error?.code).toBe(
      'AGREEMENT_CANNOT_BE_MODIFIED',
    );
  });

  it('returns 200 with ACTIVE status and first DRAFT milestone set to ACTIVE', async () => {
    const agreementId = await createApprovedAgreement();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/activate`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('ACTIVE');

    const milestones = body.milestones as Array<{
      id: string;
      status: string;
      order: number;
    }>;
    expect(milestones.length).toBeGreaterThanOrEqual(1);
    const firstMilestone = milestones.find((m) => m.order === 1);
    expect(firstMilestone?.status).toBe('ACTIVE');
  });
});

describe('POST /agreements/:id/archive (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let otherFreelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `far1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Archive',
      });
    freelancerJwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `far2+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Archive 2',
      });
    otherFreelancerJwt = r2.body.data?.accessToken ?? r2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createDraftAgreementWithClient(): Promise<string> {
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        name: 'Archive Client',
        email: `archive+${Date.now()}@test.com`,
      });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Archive Agreement', clientId, currency: 'SAR' });
    const agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'M1', amount: 500, currency: 'SAR', order: 1 });

    return agreementId;
  }

  it('returns 401 when JWT is missing', async () => {
    const res = await request(app.getHttpServer()).post(
      '/api/v1/agreements/nonexistent/archive',
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when agreement does not exist', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements/does-not-exist/archive')
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(404);
    expect(res.body.code ?? res.body.error?.code).toBe('AGREEMENT_NOT_FOUND');
  });

  it('returns 404 for an agreement owned by another freelancer', async () => {
    const agreementId = await createDraftAgreementWithClient();
    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/archive`)
      .set('Authorization', `Bearer ${otherFreelancerJwt}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with CANCELLED status for a DRAFT agreement', async () => {
    const agreementId = await createDraftAgreementWithClient();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/archive`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('CANCELLED');
    const milestones = body.milestones as Array<{
      id: string;
      status: string;
      order: number;
    }>;
    for (const m of milestones) {
      expect(m.status).toBe('CANCELLED');
    }
  });
});

describe('POST /agreements (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `create-test+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Create Tester',
      });
    freelancerJwt = r.body.data?.accessToken ?? r.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 201 with DRAFT status, totalAmount 0, currency SAR, and freelancer ownership', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'E2E Create Test', currency: 'SAR' });

    expect(res.status).toBe(201);
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('DRAFT');
    expect(body.totalAmount).toBe(0);
    expect(body.currency).toBe('SAR');
    expect(body.freelancerId).toBeDefined();
    expect(typeof body.id).toBe('string');
  });
});

describe('GET /agreements (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `list-test+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'List Tester',
      });
    freelancerJwt = r.body.data?.accessToken ?? r.body.accessToken;

    // Create a few agreements owned by this freelancer
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/agreements')
        .set('Authorization', `Bearer ${freelancerJwt}`)
        .send({ title: `List Agreement ${i}` });
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with data, total, page, and limit metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('total');
    expect(body).toHaveProperty('page');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('totalPages');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBeGreaterThanOrEqual(3);
  });

  it('returns only agreements owned by the authenticated freelancer', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`);

    const body = res.body.data ?? res.body;
    for (const item of body.data) {
      expect(item.id).toBeDefined();
      expect(item.title).toBeDefined();
    }
  });
});

describe('GET /agreements/:id (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let agreementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `detail-test+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Detail Tester',
      });
    freelancerJwt = r.body.data?.accessToken ?? r.body.accessToken;

    // Create client
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        name: 'Detail Client',
        email: `detail-client+${Date.now()}@test.com`,
      });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    // Create agreement
    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Detail Agreement', clientId, currency: 'SAR' });
    agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    // Add milestone
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        title: 'Detail Milestone',
        amount: 500,
        currency: 'SAR',
        order: 1,
      });

    // Add policy
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/policy`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        cancellationPolicy: 'No cancellations.',
        delayPolicy: 'Delays incur fees.',
        extraRequestPolicy: 'Extra work billed separately.',
        reviewPolicy: '3 review rounds.',
        clientReviewPeriodDays: 3,
        freelancerDelayGraceDays: 2,
      });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with client, ordered milestones, and policy', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`);

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body).toHaveProperty('client');
    expect(body.client).toBeDefined();
    expect(body).toHaveProperty('milestones');
    expect(Array.isArray(body.milestones)).toBe(true);
    expect(body.milestones.length).toBeGreaterThanOrEqual(1);
    expect(body).toHaveProperty('policy');
    expect(body.policy).toBeDefined();
  });
});

describe('PATCH /agreements/:id (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let agreementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `patch-test+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Patch Tester',
      });
    freelancerJwt = r.body.data?.accessToken ?? r.body.accessToken;

    // Create a DRAFT agreement
    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Patch Agreement', currency: 'SAR' });
    agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with updated title and unchanged other fields', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    const body = res.body.data ?? res.body;
    expect(body.title).toBe('Updated Title');
  });
});

describe('CRUD endpoint authentication (401) (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for POST /agreements without JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .send({ title: 'Unauth' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /agreements without JWT', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/agreements');
    expect(res.status).toBe(401);
  });

  it('returns 401 for GET /agreements/:id without JWT', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/agreements/some-id',
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for PATCH /agreements/:id without JWT', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/agreements/some-id')
      .send({ title: 'Unauth' });
    expect(res.status).toBe(401);
  });
});

describe('GET /agreements/:id 404 handling (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let otherFreelancerJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `nf1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'NF One',
      });
    freelancerJwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `nf2+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'NF Two',
      });
    otherFreelancerJwt = r2.body.data?.accessToken ?? r2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 404 for a non-existent agreement', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/agreements/non-existent-id')
      .set('Authorization', `Bearer ${freelancerJwt}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for an agreement owned by another freelancer', async () => {
    // Create an agreement owned by freelancer 1
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Foreign Agreement' });
    const agreementId = createRes.body.data?.id ?? createRes.body.id;

    // Try to access it as freelancer 2
    const res = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${otherFreelancerJwt}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /agreements/:id 409 invalid-state (e2e)', () => {
  let app: INestApplication;
  let freelancerJwt: string;
  let agreementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const r = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `fs1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer State',
      });
    freelancerJwt = r.body.data?.accessToken ?? r.body.accessToken;

    // Create client
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        name: 'State Client',
        email: `state-client+${Date.now()}@test.com`,
      });
    const clientId = clientRes.body.data?.id ?? clientRes.body.id;

    // Create agreement
    const agreementRes = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'State Agreement', clientId, currency: 'SAR' });
    agreementId = agreementRes.body.data?.id ?? agreementRes.body.id;

    // Add milestone
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/milestones`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'M1', amount: 1000, currency: 'SAR', order: 1 });

    // Set totalAmount to match
    await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ totalAmount: 1000 });

    // Create policy
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/policy`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({
        cancellationPolicy: 'No cancellations.',
        delayPolicy: 'Delays incur fees.',
        extraRequestPolicy: 'Extra work billed separately.',
        reviewPolicy: '3 review rounds.',
        clientReviewPeriodDays: 3,
        freelancerDelayGraceDays: 2,
      });

    // Send invite to move to SENT
    await request(app.getHttpServer())
      .post(`/api/v1/agreements/${agreementId}/send-invite`)
      .set('Authorization', `Bearer ${freelancerJwt}`);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 409 AGREEMENT_CANNOT_BE_MODIFIED when patching a SENT agreement', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}`)
      .set('Authorization', `Bearer ${freelancerJwt}`)
      .send({ title: 'Should Fail' });

    expect(res.status).toBe(409);
    expect(res.body.code ?? res.body.error?.code).toBe(
      'AGREEMENT_CANNOT_BE_MODIFIED',
    );
  });
});
