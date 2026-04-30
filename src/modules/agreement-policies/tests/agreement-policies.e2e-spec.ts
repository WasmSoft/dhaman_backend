import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../app.module';

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

  it('returns 404 POLICY_NOT_FOUND on GET when no policy exists', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/agreements/${agreementId}/policies`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(404);

    expect(res.body.error?.code ?? res.body.code).toBe('POLICY_NOT_FOUND');
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
