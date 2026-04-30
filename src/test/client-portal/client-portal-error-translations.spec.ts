import { Test, TestingModule } from '@nestjs/testing';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { ErrorTranslatorService } from '../../common/errors/error-translator.service';

describe('Client Portal — Error Translations (US2)', () => {
  let translator: ErrorTranslatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorTranslatorService],
    }).compile();

    translator = module.get<ErrorTranslatorService>(ErrorTranslatorService);
  });

  // ──────────────────────────────────────────────
  //  Portal token error codes
  // ──────────────────────────────────────────────

  describe('PORTAL_TOKEN errors', () => {
    it('should translate PORTAL_TOKEN_INVALID in English', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_INVALID, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result.toLowerCase()).toContain('token');
    });

    it('should translate PORTAL_TOKEN_INVALID in Arabic', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_INVALID, Locale.AR);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Arabic text contains Arabic characters
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate PORTAL_TOKEN_EXPIRED in English', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_EXPIRED, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('expired');
    });

    it('should translate PORTAL_TOKEN_EXPIRED in Arabic', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_EXPIRED, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate PORTAL_TOKEN_REVOKED in English', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_REVOKED, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('revoked');
    });

    it('should translate PORTAL_TOKEN_REVOKED in Arabic', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_REVOKED, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate PORTAL_TOKEN_CREATE_FAILED in English', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_CREATE_FAILED, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.toLowerCase()).toContain('portal');
    });

    it('should translate PORTAL_TOKEN_CREATE_FAILED in Arabic', () => {
      const result = translator.translate(ErrorCode.PORTAL_TOKEN_CREATE_FAILED, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Agreement action error codes
  // ──────────────────────────────────────────────

  describe('Agreement action errors', () => {
    it('should translate AGREEMENT_NOT_APPROVABLE in English', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_APPROVABLE, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate AGREEMENT_NOT_APPROVABLE in Arabic', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_APPROVABLE, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate AGREEMENT_NOT_CHANGEABLE in English', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_CHANGEABLE, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate AGREEMENT_NOT_CHANGEABLE in Arabic', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_CHANGEABLE, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate AGREEMENT_NOT_REJECTABLE in English', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_REJECTABLE, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate AGREEMENT_NOT_REJECTABLE in Arabic', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_REJECTABLE, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Scoped resource error codes
  // ──────────────────────────────────────────────

  describe('Scoped resource errors', () => {
    it('should translate AGREEMENT_NOT_FOUND in English', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_FOUND, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate AGREEMENT_NOT_FOUND in Arabic', () => {
      const result = translator.translate(ErrorCode.AGREEMENT_NOT_FOUND, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate DELIVERY_NOT_FOUND in English', () => {
      const result = translator.translate(ErrorCode.DELIVERY_NOT_FOUND, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate DELIVERY_NOT_FOUND in Arabic', () => {
      const result = translator.translate(ErrorCode.DELIVERY_NOT_FOUND, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate PAYMENT_NOT_FOUND in English', () => {
      const result = translator.translate(ErrorCode.PAYMENT_NOT_FOUND, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate PAYMENT_NOT_FOUND in Arabic', () => {
      const result = translator.translate(ErrorCode.PAYMENT_NOT_FOUND, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });

    it('should translate CHANGE_REQUEST_NOT_FOUND in English', () => {
      const result = translator.translate(ErrorCode.CHANGE_REQUEST_NOT_FOUND, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate CHANGE_REQUEST_NOT_FOUND in Arabic', () => {
      const result = translator.translate(ErrorCode.CHANGE_REQUEST_NOT_FOUND, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Validation error
  // ──────────────────────────────────────────────

  describe('Validation errors', () => {
    it('should translate VALIDATION_ERROR in English', () => {
      const result = translator.translate(ErrorCode.VALIDATION_ERROR, Locale.EN);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should translate VALIDATION_ERROR in Arabic', () => {
      const result = translator.translate(ErrorCode.VALIDATION_ERROR, Locale.AR);
      expect(result).toBeDefined();
      expect(/[\u0600-\u06FF]/.test(result)).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  //  Stable codes — English fallback behavior
  // ──────────────────────────────────────────────

  describe('Fallback behavior', () => {
    it('should return English message for unknown locale', () => {
      const enResult = translator.translate(ErrorCode.PORTAL_TOKEN_INVALID, Locale.EN);
      const unknownResult = translator.translate(ErrorCode.PORTAL_TOKEN_INVALID, 'FR' as Locale);

      expect(unknownResult).toBe(enResult);
    });

    it('should return INTERNAL_SERVER_ERROR for unknown code', () => {
      const result = translator.translate('UNKNOWN_ERROR_CODE' as ErrorCode, Locale.EN);
      const internalError = translator.translate(ErrorCode.INTERNAL_SERVER_ERROR, Locale.EN);

      expect(result).toBe(internalError);
    });

    it('should return default English message via getDefaultMessage', () => {
      const result = translator.getDefaultMessage(ErrorCode.PORTAL_TOKEN_INVALID);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toBe(translator.translate(ErrorCode.PORTAL_TOKEN_INVALID, Locale.EN));
    });
  });

  // ──────────────────────────────────────────────
  //  Safety — messages do not contain raw technical data
  // ──────────────────────────────────────────────

  describe('Message safety', () => {
    const portalCodes = [
      ErrorCode.PORTAL_TOKEN_INVALID,
      ErrorCode.PORTAL_TOKEN_EXPIRED,
      ErrorCode.PORTAL_TOKEN_REVOKED,
      ErrorCode.PORTAL_TOKEN_CREATE_FAILED,
      ErrorCode.AGREEMENT_NOT_APPROVABLE,
      ErrorCode.AGREEMENT_NOT_CHANGEABLE,
      ErrorCode.AGREEMENT_NOT_REJECTABLE,
      ErrorCode.AGREEMENT_NOT_FOUND,
      ErrorCode.DELIVERY_NOT_FOUND,
      ErrorCode.PAYMENT_NOT_FOUND,
      ErrorCode.CHANGE_REQUEST_NOT_FOUND,
    ];

    for (const code of portalCodes) {
      it(`${code} should not contain raw technical data`, () => {
        const enMsg = translator.translate(code, Locale.EN);
        expect(enMsg).not.toContain('stack');
        expect(enMsg).not.toContain('hash');
        expect(enMsg).not.toContain('token value');
      });
    }
  });
});
