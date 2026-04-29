import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../common/errors/app-exception';
import { GeminiService } from '../../modules/ai-review/gemini.service';

jest.mock('@google/generative-ai', () => {
  const mockGenerateContent = jest.fn();

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockImplementation(() => ({
        generateContent: mockGenerateContent,
      })),
    })),
    GenerativeModel: jest.fn(),
    __mockGenerateContent: mockGenerateContent,
  };
});

const mockGenerateContent = jest.requireMock(
  '@google/generative-ai',
).__mockGenerateContent;

function createConfigMock(
  overrides: Partial<Record<string, string | undefined>> = {},
): ConfigService {
  return {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'ai.geminiApiKey')
        return overrides.geminiApiKey ?? 'test-key';
      if (key === 'ai.geminiTimeoutMs')
        return overrides.geminiTimeoutMs ?? '30000';
      if (key === 'ai.geminiModel')
        return overrides.geminiModel ?? 'gemini-1.5-flash';
      return defaultValue;
    }),
  } as unknown as ConfigService;
}

describe('GeminiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateContent', () => {
    it('returns response text from a valid SDK response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"matchScore":85}' },
      });

      const service = new GeminiService(createConfigMock());
      const result = await service.generateContent('test prompt');

      expect(result).toBe('{"matchScore":85}');
      expect(GoogleGenerativeAI).toHaveBeenCalledWith('test-key');
    });

    it('throws on missing API key', async () => {
      const service = new GeminiService(createConfigMock({ geminiApiKey: '' }));

      await expect(service.generateContent('test')).rejects.toThrow(
        AppException,
      );
      await expect(service.generateContent('test')).rejects.toMatchObject(
        expect.objectContaining({
          message: expect.stringContaining('API key'),
        }),
      );
    });

    it('throws on SDK transport error', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Network error'));

      const service = new GeminiService(createConfigMock());

      await expect(service.generateContent('test')).rejects.toThrow(
        'Network error',
      );
    });

    it('passes the model name from config to the SDK', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"matchScore":90}' },
      });

      const service = new GeminiService(
        createConfigMock({ geminiModel: 'gemini-pro' }),
      );

      await service.generateContent('test prompt');

      const gaInstance = (GoogleGenerativeAI as jest.Mock).mock.results[0]
        .value;
      expect(gaInstance.getGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-pro',
      });
    });
  });
});
