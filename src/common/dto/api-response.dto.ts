export class ApiResponseDto<T> {
  success!: true;
  data!: T;
  meta!: {
    requestId: string;
  };
}
