export class FieldErrorDto {
  field!: string;
  message!: string;
}

export class ErrorBodyDto {
  code!: string;
  message!: string;
  localizedMessage!: string;
  details!: Record<string, unknown>;
  fieldErrors!: FieldErrorDto[];
  requestId!: string;
  timestamp!: string;
  path!: string;
  method!: string;
}

export class ErrorResponseDto {
  success!: false;
  error!: ErrorBodyDto;
}
