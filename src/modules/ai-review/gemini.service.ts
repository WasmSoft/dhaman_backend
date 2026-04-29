import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';

@Injectable()
export class GeminiService {
  constructor(private readonly configService: ConfigService) {}

  async generateContent(prompt: string): Promise<string> {
    const apiKey = this.configService.get<string>('ai.geminiApiKey') ?? '';

    if (!apiKey) {
      throw new AppException({
        code: ErrorCode.AI_REVIEW_FAILED,
        message: 'Gemini API key is missing',
      });
    }

    const modelName =
      this.configService.get<string>('ai.geminiModel') ?? 'gemini-1.5-flash';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);

    return result.response.text();
  }
}
