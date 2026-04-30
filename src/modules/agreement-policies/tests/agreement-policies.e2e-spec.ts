import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'agreement-policies-e2e-secret';

describe('Agreement Policies endpoints (e2e)', () => {
  let app: INestApplication;
  let jwt: string;
  let otherJwt: string;
  let agreementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `policy-e2e-1+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer One',
      });
    jwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `policy-e2e-2+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Freelancer Two',
      });
    otherJwt = r2.body.data?.accessToken ?? r2.body.accessToken;

    const agr = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ title: 'Policy E2E Agreement', currency: 'SAR' });
    agreementId = agr.body.data?.id ?? agr.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 without JWT for GET', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}/policies`)
      .expect(401);
  });

  it('returns 404 for another freelancer on GET', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${otherJwt}`)
      .expect(404);

    expect(res.body.error?.code ?? res.body.code).toBe('AGREEMENT_NOT_FOUND');
  });

  it('returns baseline policy on GET after agreement creation', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.clientReviewPeriodDays).toBe(7);
    expect(body.freelancerDelayGraceDays).toBe(3);
  });

  it('creates and then updates a policy on PATCH', async () => {
    const created = await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ delayPolicy: 'policy text' })
      .expect(200);

    const createdBody = created.body.data ?? created.body;
    expect(createdBody.delayPolicy).toBe('policy text');
    expect(createdBody.clientReviewPeriodDays).toBe(7);
    expect(createdBody.freelancerDelayGraceDays).toBe(3);

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ cancellationPolicy: null, clientReviewPeriodDays: 14 })
      .expect(200);

    const updatedBody = updated.body.data ?? updated.body;
    expect(updatedBody.delayPolicy).toBe('policy text');
    expect(updatedBody.cancellationPolicy).toBeNull();
    expect(updatedBody.clientReviewPeriodDays).toBe(14);
  });

  it('returns 400 POLICY_INVALID_CONTENT for empty text', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ delayPolicy: '' })
      .expect(400);

    expect(res.body.error?.code ?? res.body.code).toBe('POLICY_INVALID_CONTENT');
  });
});

describe('Default policies endpoints (e2e)', () => {
  let app: INestApplication;
  let jwt: string;
  let otherJwt: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `defaults-patch-e2e+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Defaults PATCH User',
      });
    jwt = r1.body.data?.accessToken ?? r1.body.accessToken;

    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `defaults-other-e2e+${Date.now()}@test.com`,
        password: 'Test1234!',
        name: 'Defaults Other',
      });
    otherJwt = r2.body.data?.accessToken ?? r2.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 when no JWT is provided for GET', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/settings/default-policies')
      .expect(401);
  });

  it('returns fallback values for GET when no defaults have been saved', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.delayPolicy).toBeNull();
    expect(body.cancellationPolicy).toBeNull();
    expect(body.extraRequestPolicy).toBeNull();
    expect(body.reviewPolicy).toBeNull();
    expect(body.clientReviewPeriodDays).toBe(7);
    expect(body.freelancerDelayGraceDays).toBe(3);
  });

  it('returns 401 when no JWT is provided for PATCH', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .send({ clientReviewPeriodDays: 7 })
      .expect(401);
  });

  it('saves defaults on first call and returns a complete template', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        delayPolicy: 'في حال التأخير لأكثر من 3 أيام.',
        clientReviewPeriodDays: 10,
      })
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.delayPolicy).toBe('في حال التأخير لأكثر من 3 أيام.');
    expect(body.clientReviewPeriodDays).toBe(10);
    expect(body.freelancerDelayGraceDays).toBe(3);
  });

  it('copies saved defaults into a new draft agreement response', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/agreements')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ title: 'Defaults Copied Agreement', currency: 'SAR' })
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body.policy).toBeDefined();
    expect(body.policy.delayPolicy).toBe('في حال التأخير لأكثر من 3 أيام.');
    expect(body.policy.clientReviewPeriodDays).toBe(10);
    expect(body.policy.freelancerDelayGraceDays).toBe(3);
  });

  it('updates only the provided field and preserves others on subsequent save', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ cancellationPolicy: 'cancellation text' })
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.cancellationPolicy).toBe('cancellation text');
    expect(body.delayPolicy).toBe('في حال التأخير لأكثر من 3 أيام.');
  });

  it('clears a text field when null is sent', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ delayPolicy: null })
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.delayPolicy).toBeNull();
  });

  it('returns current template unchanged when body is empty', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ reviewPolicy: 'review text' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({})
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.reviewPolicy).toBe('review text');
  });

  it('returns 400 POLICY_INVALID_CONTENT when a text field is empty', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ delayPolicy: '' })
      .expect(400);

    expect(res.body.error?.code ?? res.body.code).toBe('POLICY_INVALID_CONTENT');
  });

  it('returns 400 when clientReviewPeriodDays is null', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ clientReviewPeriodDays: null })
      .expect(400);
  });

  it('returns 400 when clientReviewPeriodDays is out of range', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ clientReviewPeriodDays: 0 })
      .expect(400);
  });

  it('returns 400 when freelancerDelayGraceDays is out of range', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ freelancerDelayGraceDays: 31 })
      .expect(400);
  });

  it('isolates freelancers and returns fallback defaults for a different user', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/settings/default-policies')
      .set('Authorization', `Bearer ${otherJwt}`)
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.clientReviewPeriodDays).toBe(7);
    expect(body.delayPolicy).toBeNull();
  });
});
