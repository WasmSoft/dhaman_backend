import { ErrorCode } from '../enums/error-code.enum';

export type ApiFieldError = {
  field: string;
  message: string;
};

export type ApiError = {
  code: ErrorCode;
  message: string;
  localizedMessage: string;
  details?: Record<string, unknown>;
  fieldErrors?: ApiFieldError[];
  requestId: string;
  timestamp: string;
  path: string;
  method: string;
};
