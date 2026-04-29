import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { AppException } from '../../common/errors/app-exception';
import { parseReviewResponse } from '../../modules/ai-review/helpers';

function readFixture(fileName: string): string {
  return readFileSync(join(__dirname, 'fixtures', fileName), 'utf8');
}

async function expectInvalidResponse(raw: string): Promise<void> {
  await expect(async () => parseReviewResponse(raw)).rejects.toThrow(
    AppException,
  );

  try {
    parseReviewResponse(raw);
  } catch (error) {
    const exception = error as AppException;

    expect(exception.code).toBe(ErrorCode.AI_INVALID_RESPONSE);
    expect(exception.getStatus()).toBe(502);
    expect((error as Error).message).not.toContain('SyntaxError');
    return;
  }

  throw new Error('Expected parseReviewResponse to throw AppException.');
}

describe('parseReviewResponse', () => {
  it('parses a valid raw JSON fixture into a ReviewResult object', () => {
    expect(parseReviewResponse(readFixture('valid-ai-response.json'))).toEqual({
      matchScore: 87,
      recommendation: 'ACCEPT',
      completedCriteria: [
        'Responsive layout matches the approved design',
        'Portfolio section is visible on mobile',
      ],
      missingCriteria: ['Brand colors match the style guide'],
      outOfScopeItems: ['Add a separate admin dashboard'],
      reasoning:
        'The delivery meets most of the required acceptance criteria and is acceptable overall.',
    });
  });

  it('parses a valid single markdown JSON fence into a ReviewResult object', () => {
    expect(
      parseReviewResponse(readFixture('markdown-fenced-response.txt')),
    ).toEqual({
      matchScore: 61,
      recommendation: 'PARTIAL',
      completedCriteria: ['Responsive layout matches the approved design'],
      missingCriteria: ['Portfolio section is visible on mobile'],
      outOfScopeItems: ['Add a separate admin dashboard'],
      reasoning:
        'The delivery meets some criteria but still misses one important item.',
    });
  });

  it('throws AI_INVALID_RESPONSE for non-JSON text', async () => {
    await expectInvalidResponse(readFixture('invalid-non-json.txt'));
  });

  it('throws AI_INVALID_RESPONSE for an out-of-range matchScore', async () => {
    await expectInvalidResponse(readFixture('invalid-out-of-range-score.json'));
  });

  it('throws AI_INVALID_RESPONSE for an unknown recommendation', async () => {
    await expectInvalidResponse(readFixture('invalid-recommendation.json'));
  });

  it('throws AI_INVALID_RESPONSE for an invalid criteria shape', async () => {
    await expectInvalidResponse(readFixture('invalid-criteria-shape.json'));
  });

  it('throws AI_INVALID_RESPONSE for empty reasoning', async () => {
    await expectInvalidResponse(readFixture('invalid-empty-reasoning.json'));
  });
});
