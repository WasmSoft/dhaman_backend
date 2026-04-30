import { ErrorCode } from '../../common/enums/error-code.enum';
import { Locale } from '../../common/enums/locale.enum';
import { ErrorTranslatorService } from '../../common/errors/error-translator.service';

// AR: يتحقق من وجود رسائل الخطأ المرتبطة بالسجل الزمني بالإنجليزية والعربية.
// EN: Verifies timeline-related error messages exist in English and Arabic.
describe('Timeline Events — error translations', () => {
  const translator = new ErrorTranslatorService();

  const timelineErrorCodes: ErrorCode[] = [
    ErrorCode.TIMELINE_EVENT_TYPE_INVALID,
    ErrorCode.TIMELINE_METADATA_INVALID,
    ErrorCode.AGREEMENT_NOT_FOUND,
    ErrorCode.PORTAL_TOKEN_INVALID,
    ErrorCode.PORTAL_TOKEN_EXPIRED,
    ErrorCode.PORTAL_TOKEN_REVOKED,
    ErrorCode.VALIDATION_ERROR,
    ErrorCode.UNAUTHORIZED,
    ErrorCode.FORBIDDEN,
  ];

  describe('English translations', () => {
    for (const code of timelineErrorCodes) {
      it(`has an English message for ${code}`, () => {
        const message = translator.translate(code, Locale.EN);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toBe(
          translator.translate(ErrorCode.INTERNAL_SERVER_ERROR, Locale.EN),
        );
      });
    }
  });

  describe('Arabic translations', () => {
    for (const code of timelineErrorCodes) {
      it(`has an Arabic message for ${code}`, () => {
        const message = translator.translate(code, Locale.AR);
        expect(message).toBeDefined();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    }
  });

  describe('Fallback behavior', () => {
    it('falls back to English for unknown locale', () => {
      const message = translator.translate(
        ErrorCode.FORBIDDEN,
        'unknown' as Locale,
      );
      expect(message).toBe(
        translator.translate(ErrorCode.FORBIDDEN, Locale.EN),
      );
    });
  });

  describe('Default message', () => {
    it('returns the English message as default for each code', () => {
      for (const code of timelineErrorCodes) {
        const defaultMsg = translator.getDefaultMessage(code);
        expect(defaultMsg).toBe(translator.translate(code, Locale.EN));
      }
    });
  });

  describe('Error message content', () => {
    it('TIMELINE_EVENT_TYPE_INVALID has appropriate English text', () => {
      const msg = translator.translate(
        ErrorCode.TIMELINE_EVENT_TYPE_INVALID,
        Locale.EN,
      );
      expect(msg.toLowerCase()).toContain('event');
    });

    it('TIMELINE_METADATA_INVALID has appropriate English text', () => {
      const msg = translator.translate(
        ErrorCode.TIMELINE_METADATA_INVALID,
        Locale.EN,
      );
      expect(msg.toLowerCase()).toContain('metadata');
    });

    it('PORTAL_TOKEN_INVALID has appropriate English text', () => {
      const msg = translator.translate(
        ErrorCode.PORTAL_TOKEN_INVALID,
        Locale.EN,
      );
      expect(msg.toLowerCase()).toContain('token');
    });

    it('PORTAL_TOKEN_EXPIRED has appropriate English text', () => {
      const msg = translator.translate(
        ErrorCode.PORTAL_TOKEN_EXPIRED,
        Locale.EN,
      );
      expect(msg.toLowerCase()).toContain('expire');
    });

    it('PORTAL_TOKEN_REVOKED has appropriate English text', () => {
      const msg = translator.translate(
        ErrorCode.PORTAL_TOKEN_REVOKED,
        Locale.EN,
      );
      expect(msg.toLowerCase()).toContain('revok');
    });
  });
});
