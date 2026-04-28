import { ApiResponseDto } from './api-response.dto';

export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  declare meta: {
    requestId: string;
    page: number;
    pageSize: number;
    total: number;
  };
}
