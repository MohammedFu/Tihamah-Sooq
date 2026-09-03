export type ApiEntityId = number;

export type ApiErrorDetail = Readonly<{
  field?: string;
  message: string;
  code?: string;
}>;

export type ApiErrorBody = Readonly<{
  code: string;
  message: string;
  details?: readonly ApiErrorDetail[] | Record<string, unknown> | null;
}>;

export type ApiErrorEnvelope = Readonly<{
  success: false;
  message?: string;
  error?: ApiErrorBody;
}>;

export type ApiSuccessEnvelope<T> = Readonly<{
  success: true;
  data: T;
  message?: string;
}>;

export type ApiActionResponse = Readonly<{
  success: boolean;
  message: string;
}>;

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export type ApiPaginationMeta = Readonly<{
  page: number;
  limit: number;
  total_rows: number;
  total_pages: number;
}>;

export type ApiPaginatedResponse<T> = Readonly<{
  success: true;
  data: readonly T[];
  pagination: ApiPaginationMeta;
  message?: string;
}>;

export type ApiListResponse<T> = Readonly<{
  success: true;
  data: readonly T[];
  message?: string;
}>;
