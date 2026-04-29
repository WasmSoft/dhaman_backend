import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

/**
 * E2E: POST /agreements/:id/send-invite
 *
 * These tests run against a real PostgreSQL database defined by DATABASE_URL.
 * Each test creates its own data and cleans up in afterEach.
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
