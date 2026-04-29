import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiProvider {
  readonly isEnabled: boolean;
  private readonly model: ReturnType<
    GoogleGenerativeAI['getGenerativeModel']
  > | null;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('ai.geminiApiKey') ?? '';
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      this.isEnabled = true;
    } else {
      this.model = null;
      this.isEnabled = false;
    }
  }

  async generateContent(prompt: string): Promise<string> {
    if (!this.model) throw new Error('GeminiProvider is not enabled');
    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async generateWithRetry(prompt: string): Promise<string> {
    try {
      return await this.generateContent(prompt);
    } catch {
      return await this.generateContent(prompt);
    }
  }
}
