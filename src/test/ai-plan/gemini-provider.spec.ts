import { GeminiProvider } from '../../modules/ai-plan/gemini.provider';

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

const createConfigService = (apiKey: string) =>
  ({
    get: jest.fn().mockReturnValue(apiKey),
  }) as any;

describe('GeminiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('sets isEnabled to false when API key is empty', () => {
      const config = createConfigService('');
      const provider = new GeminiProvider(config);

      expect(provider.isEnabled).toBe(false);
    });

    it('sets isEnabled to false when API key is undefined', () => {
      const config = {
        get: jest.fn().mockReturnValue(undefined),
      } as any;
      const provider = new GeminiProvider(config);

      expect(provider.isEnabled).toBe(false);
    });

    it('sets isEnabled to true when API key is non-empty', () => {
      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);

      expect(provider.isEnabled).toBe(true);
    });
  });

  describe('generateContent', () => {
    it('returns text from the Gemini model response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Generated plan JSON' },
      });

      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);
      const result = await provider.generateContent('prompt');

      expect(result).toBe('Generated plan JSON');
    });

    it('propagates errors from the Gemini SDK', async () => {
      const sdkError = new Error('Network error');
      mockGenerateContent.mockRejectedValue(sdkError);

      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);

      await expect(provider.generateContent('prompt')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('generateWithRetry', () => {
    it('succeeds on first attempt without retry', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'AI response' },
      });

      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);
      const result = await provider.generateWithRetry('prompt');

      expect(result).toBe('AI response');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('retries once after first failure and succeeds on second attempt', async () => {
      const sdkError = new Error('Temporary error');
      mockGenerateContent
        .mockRejectedValueOnce(sdkError)
        .mockResolvedValueOnce({
          response: { text: () => 'AI response after retry' },
        });

      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);
      const result = await provider.generateWithRetry('prompt');

      expect(result).toBe('AI response after retry');
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });

    it('throws when both attempts fail', async () => {
      const sdkError = new Error('Persistent error');
      mockGenerateContent.mockRejectedValue(sdkError);

      const config = createConfigService('test-api-key');
      const provider = new GeminiProvider(config);

      await expect(provider.generateWithRetry('prompt')).rejects.toThrow(
        'Persistent error',
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
  });
});
