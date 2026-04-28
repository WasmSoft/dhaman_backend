import { Global, Module } from '@nestjs/common';
import { ErrorTranslatorService } from './error-translator.service';

@Global()
@Module({
  providers: [ErrorTranslatorService],
  exports: [ErrorTranslatorService],
})
export class ErrorTranslatorModule {}
