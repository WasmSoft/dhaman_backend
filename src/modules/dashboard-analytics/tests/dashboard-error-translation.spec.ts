import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../../common/enums/error-code.enum';
import { Locale } from '../../../common/enums/locale.enum';
import { AppException } from '../../../common/errors/app-exception';
import { ErrorTranslatorModule } from '../../../common/errors/error-translator.module';
import { ErrorTranslatorService } from '../../../common/errors/error-translator.service';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';
import { ClsService } from '../../../common/cls/cls.service';
import { DashboardAnalyticsService } from '../dashboard-analytics.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  createDashboardClsMock,
  createDashboardPrismaMock,
} from './dashboard-service-test-helpers';
import { readErrorTranslation } from './dashboard-dto-test-helpers';

describe('dashboard error translation', () => {
  let service: DashboardAnalyticsService;
  let prisma: PrismaService;
  let errorTranslator: ErrorTranslatorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ErrorTranslatorModule],
      providers: [
        DashboardAnalyticsService,
        {
          provide: PrismaService,
          useValue: createDashboardPrismaMock(),
        },
        {
          provide: ClsService,
          useValue: createDashboardClsMock(),
        },
        {
          provide: HttpExceptionFilter,
          useValue: {
            catch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardAnalyticsService);
    prisma = module.get(PrismaService);
    errorTranslator = module.get(ErrorTranslatorService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('drives an invalid range value through the overview service and asserts HTTP 400, DASHBOARD_RANGE_INVALID, registry-sourced messages in en and ar (FR-010, FR-012)', async () => {
    await expect(
      service.getOverview({ range: 'foo' as never }),
    ).rejects.toThrow(AppException);

    try {
      await service.getOverview({ range: 'foo' as never });
    } catch (error) {
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.DASHBOARD_RANGE_INVALID);
      expect(exception.getStatus()).toBe(400);

      const enMessage = errorTranslator.translate(
        ErrorCode.DASHBOARD_RANGE_INVALID,
        Locale.EN,
      );
      const arMessage = errorTranslator.translate(
        ErrorCode.DASHBOARD_RANGE_INVALID,
        Locale.AR,
      );

      expect(enMessage).toBe(
        readErrorTranslation(ErrorCode.DASHBOARD_RANGE_INVALID, Locale.EN),
      );
      expect(arMessage).toBe(
        readErrorTranslation(ErrorCode.DASHBOARD_RANGE_INVALID, Locale.AR),
      );
    }
  });

  it('injects a faulty Prisma client to throw inside an aggregation; asserts HTTP 500, DASHBOARD_AGGREGATION_FAILED, registry-sourced messages in en and ar, and no stack trace exposed (FR-011, FR-012)', async () => {
    (prisma.agreement.groupBy as jest.Mock).mockRejectedValue(
      new Error('Simulated Prisma failure'),
    );

    await expect(service.getOverview({ range: '30d' })).rejects.toThrow(
      AppException,
    );

    try {
      await service.getOverview({ range: '30d' });
    } catch (error) {
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.DASHBOARD_AGGREGATION_FAILED);
      expect(exception.getStatus()).toBe(500);

      const enMessage = errorTranslator.translate(
        ErrorCode.DASHBOARD_AGGREGATION_FAILED,
        Locale.EN,
      );
      const arMessage = errorTranslator.translate(
        ErrorCode.DASHBOARD_AGGREGATION_FAILED,
        Locale.AR,
      );

      expect(enMessage).toBe(
        readErrorTranslation(ErrorCode.DASHBOARD_AGGREGATION_FAILED, Locale.EN),
      );
      expect(arMessage).toBe(
        readErrorTranslation(ErrorCode.DASHBOARD_AGGREGATION_FAILED, Locale.AR),
      );

      // Ensure no raw Prisma error is exposed in the exception message
      expect((error as Error).message).not.toContain(
        'Simulated Prisma failure',
      );
    }
  });

  it('triggers AGREEMENT_NOT_FOUND via a cross-tenant agreementId and asserts registry-sourced messages in en and ar (FR-009, FR-012)', async () => {
    (prisma.agreement.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      service.getRecentActivity({
        agreementId: 'agreement-owned-by-other',
        limit: 10,
      }),
    ).rejects.toThrow(AppException);

    try {
      await service.getRecentActivity({
        agreementId: 'agreement-owned-by-other',
        limit: 10,
      });
    } catch (error) {
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.AGREEMENT_NOT_FOUND);
      expect(exception.getStatus()).toBe(404);

      const enMessage = errorTranslator.translate(
        ErrorCode.AGREEMENT_NOT_FOUND,
        Locale.EN,
      );
      const arMessage = errorTranslator.translate(
        ErrorCode.AGREEMENT_NOT_FOUND,
        Locale.AR,
      );

      expect(enMessage).toBe(
        readErrorTranslation(ErrorCode.AGREEMENT_NOT_FOUND, Locale.EN),
      );
      expect(arMessage).toBe(
        readErrorTranslation(ErrorCode.AGREEMENT_NOT_FOUND, Locale.AR),
      );
    }
  });

  it('triggers VALIDATION_ERROR (any DTO failure) and asserts registry-sourced messages in en and ar (FR-012)', async () => {
    await expect(service.getActionsRequired({ limit: 0 })).rejects.toThrow(
      AppException,
    );

    try {
      await service.getActionsRequired({ limit: 0 });
    } catch (error) {
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(exception.getStatus()).toBe(400);

      const enMessage = errorTranslator.translate(
        ErrorCode.VALIDATION_ERROR,
        Locale.EN,
      );
      const arMessage = errorTranslator.translate(
        ErrorCode.VALIDATION_ERROR,
        Locale.AR,
      );

      expect(enMessage).toBe(
        readErrorTranslation(ErrorCode.VALIDATION_ERROR, Locale.EN),
      );
      expect(arMessage).toBe(
        readErrorTranslation(ErrorCode.VALIDATION_ERROR, Locale.AR),
      );
    }
  });

  it('triggers UNAUTHORIZED (missing JWT at the service-protected layer) and asserts registry-sourced messages in en and ar (FR-012)', async () => {
    const unauthorizedService = new DashboardAnalyticsService(
      prisma,
      createDashboardClsMock({ userId: undefined }),
    );

    await expect(unauthorizedService.getOverview({})).rejects.toThrow(
      AppException,
    );

    try {
      await unauthorizedService.getOverview({});
    } catch (error) {
      const exception = error as AppException;
      expect(exception.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(exception.getStatus()).toBe(401);

      const enMessage = errorTranslator.translate(
        ErrorCode.UNAUTHORIZED,
        Locale.EN,
      );
      const arMessage = errorTranslator.translate(
        ErrorCode.UNAUTHORIZED,
        Locale.AR,
      );

      expect(enMessage).toBe(
        readErrorTranslation(ErrorCode.UNAUTHORIZED, Locale.EN),
      );
      expect(arMessage).toBe(
        readErrorTranslation(ErrorCode.UNAUTHORIZED, Locale.AR),
      );
    }
  });

  it('regression — Arabic translation must exist for every dashboard error code (SC-009)', () => {
    const dashboardCodes: ErrorCode[] = [
      ErrorCode.DASHBOARD_RANGE_INVALID,
      ErrorCode.DASHBOARD_AGGREGATION_FAILED,
      ErrorCode.AGREEMENT_NOT_FOUND,
      ErrorCode.VALIDATION_ERROR,
      ErrorCode.UNAUTHORIZED,
    ];

    for (const code of dashboardCodes) {
      expect(() => readErrorTranslation(code, Locale.AR)).not.toThrow();
    }
  });
});
