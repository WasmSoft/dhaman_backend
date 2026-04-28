import { Injectable, PipeTransform } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';
import { AppException } from '../errors/app-exception';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_REGEX.test(value)) {
      throw new AppException({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid UUID value',
        fieldErrors: [{ field: 'id', message: 'Invalid UUID value' }],
      });
    }

    return value;
  }
}
