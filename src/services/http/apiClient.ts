import { getEnvironment } from "../../config/env.ts";
import { ApiError, createEnvelopeError, createHttpError, isApiError } from "./ApiError.ts";
import { appendQueryString, type QueryParameters } from "./query.ts";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type AccessTokenProvider = () => string | null | Promise<string | null>;
export type UnauthorizedHandler = (error: ApiError) => void | Promise<void>;

export type ApiClientOptions = Readonly<{
  baseUrl: string;
  timeoutMs: number;
  fetcher?: typeof fetch;
  getAccessToken?: AccessTokenProvider;
  onUnauthorized?: UnauthorizedHandler;
  defaultHeaders?: HeadersInit;
}>;

export type ApiRequestOptions<TBody = unknown> = Readonly<{
  method?: HttpMethod;
  query?: QueryParameters;
  body?: TBody;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
  authenticated?: boolean;
  expectEnvelope?: boolean;
  correlationId?: string;
}>;

export type ConfiguredApiClientOptions = Omit<ApiClientOptions, "baseUrl" | "timeoutMs">;

function normalizeBaseUrl(baseUrl: string) {
  const value = baseUrl.trim();
  if (!value) throw new TypeError("ApiClient baseUrl cannot be empty.");
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("?") || value.includes("#")) {
      throw new TypeError("ApiClient baseUrl must be a clean root-relative path or an absolute HTTP(S) URL.");
    }
    return value === "/" ? value : value.replace(/\/+$/, "");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("ApiClient baseUrl must be a clean root-relative path or an absolute HTTP(S) URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("ApiClient baseUrl must use the http or https protocol.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TypeError("ApiClient baseUrl cannot contain credentials, a query string, or a fragment.");
  }

  return url.toString().replace(/\/+$/, "");
}

function buildUrl(baseUrl: string, path: string, query?: QueryParameters) {
  const normalizedPath = path.trim();
  if (!normalizedPath) throw new TypeError("ApiClient request path cannot be empty.");
  if (/^https?:\/\//i.test(normalizedPath)) {
    throw new TypeError("ApiClient request paths must be relative to the configured API base URL.");
  }
  if (normalizedPath.includes("?") || normalizedPath.includes("#")) {
    throw new TypeError("ApiClient request paths cannot include query strings or fragments. Use the query option.");
  }

  const relativePath = normalizedPath.replace(/^\/+/, "");
  const url = baseUrl === "/" ? `/${relativePath}` : `${baseUrl}/${relativePath}`;
  return appendQueryString(url, query);
}

function validTimeout(timeoutMs: number) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError("ApiClient timeout must be a positive number of milliseconds.");
  }
  return timeoutMs;
}

function serializeRequestBody(body: unknown) {
  try {
    const serialized = JSON.stringify(body);
    if (serialized === undefined) throw new TypeError("Request body is not JSON serializable.");
    return serialized;
  } catch (cause) {
    throw new ApiError({
      kind: "bad_request",
      code: "REQUEST_BODY_SERIALIZATION_ERROR",
      userMessage: "تعذر تجهيز بيانات الطلب للإرسال.",
      retryable: false,
      cause,
    });
  }
}

function isEnvelope(payload: unknown): payload is Record<string, unknown> & { success: boolean } {
  return typeof payload === "object"
    && payload !== null
    && !Array.isArray(payload)
    && typeof (payload as Record<string, unknown>).success === "boolean";
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof fetch;
  private readonly getAccessToken?: AccessTokenProvider;
  private readonly onUnauthorized?: UnauthorizedHandler;
  private readonly defaultHeaders: Headers;

  constructor(options: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.timeoutMs = validTimeout(options.timeoutMs);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
    this.getAccessToken = options.getAccessToken;
    this.onUnauthorized = options.onUnauthorized;
    this.defaultHeaders = new Headers(options.defaultHeaders);
  }

  get<TResponse>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
    return this.request<TResponse>(path, { ...options, method: "GET" });
  }

  post<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}) {
    return this.request<TResponse, TBody>(path, { ...options, method: "POST", body });
  }

  put<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}) {
    return this.request<TResponse, TBody>(path, { ...options, method: "PUT", body });
  }

  patch<TResponse, TBody = unknown>(path: string, body?: TBody, options: Omit<ApiRequestOptions<TBody>, "method" | "body"> = {}) {
    return this.request<TResponse, TBody>(path, { ...options, method: "PATCH", body });
  }

  delete<TResponse>(path: string, options: Omit<ApiRequestOptions, "method" | "body"> = {}) {
    return this.request<TResponse>(path, { ...options, method: "DELETE" });
  }

  async request<TResponse, TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const method = options.method ?? "GET";
    const authenticated = options.authenticated ?? true;
    const expectEnvelope = options.expectEnvelope ?? true;
    const correlationId = options.correlationId ?? (
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    );
    const requestUrl = buildUrl(this.baseUrl, path, options.query);
    const controller = new AbortController();
    const timeoutMs = validTimeout(options.timeoutMs ?? this.timeoutMs);
    let timedOut = false;

    const abortFromCaller = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) abortFromCaller();
    else options.signal?.addEventListener("abort", abortFromCaller, { once: true });

    const timeoutId = globalThis.setTimeout(() => {
      if (!controller.signal.aborted) {
        timedOut = true;
        controller.abort();
      }
    }, timeoutMs);

    try {
      const headers = new Headers(this.defaultHeaders);
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
      headers.set("Accept", "application/json");
      headers.set("X-Correlation-Id", correlationId);
      headers.set("X-Request-Id", correlationId);

      if (authenticated && this.getAccessToken) {
        const accessToken = await this.getAccessToken();
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
      }

      let body: BodyInit | undefined;
      if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
        body = serializeRequestBody(options.body);
      }

      const response = await this.fetcher(requestUrl, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      if (response.status === 204 || response.status === 205) {
        if (!response.ok) await this.throwHttpError(response, null, authenticated, correlationId);
        return undefined as TResponse;
      }

      const text = await response.text();
      let payload: unknown = null;

      if (text) {
        try {
          payload = JSON.parse(text);
        } catch (cause) {
          if (!response.ok) await this.throwHttpError(response, null, authenticated, correlationId);
          throw new ApiError({
            kind: "invalid_response",
            code: "INVALID_JSON_RESPONSE",
            userMessage: "استجاب الخادم ببيانات غير صالحة.",
            status: response.status,
            retryable: false,
            requestId: response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? correlationId,
            cause,
          });
        }
      }

      if (!response.ok) await this.throwHttpError(response, payload, authenticated, correlationId);

      if (expectEnvelope) {
        if (!isEnvelope(payload)) {
          throw new ApiError({
            kind: "invalid_response",
            code: "INVALID_RESPONSE_ENVELOPE",
            userMessage: "استجاب الخادم بتنسيق غير متوقع.",
            status: response.status,
            details: null,
            retryable: false,
            requestId: response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? correlationId,
          });
        }
        if (!payload.success) throw createEnvelopeError(payload, response, correlationId);
      }

      return payload as TResponse;
    } catch (error) {
      if (isApiError(error)) throw error;
      if (timedOut) {
        throw new ApiError({
          kind: "timeout",
          code: "REQUEST_TIMEOUT",
          userMessage: "استغرق الخادم وقتاً أطول من المتوقع. حاول مرة أخرى.",
          retryable: true,
          requestId: correlationId,
          cause: error,
        });
      }
      if (options.signal?.aborted || controller.signal.aborted) {
        throw new ApiError({
          kind: "aborted",
          code: "REQUEST_ABORTED",
          userMessage: "تم إلغاء الطلب.",
          retryable: false,
          requestId: correlationId,
          cause: error,
        });
      }
      throw new ApiError({
        kind: "network",
        code: "NETWORK_ERROR",
        userMessage: "تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مرة أخرى.",
        retryable: true,
        requestId: correlationId,
        cause: error,
      });
    } finally {
      globalThis.clearTimeout(timeoutId);
      options.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  private async throwHttpError(response: Response, payload: unknown, authenticated: boolean, fallbackRequestId?: string): Promise<never> {
    const error = createHttpError(response, payload, fallbackRequestId);
    if (authenticated && error.kind === "unauthorized" && this.onUnauthorized) {
      try {
        await this.onUnauthorized(error);
      } catch {
        // Authentication cleanup must not hide the original API failure.
      }
    }
    throw error;
  }
}

export function createConfiguredApiClient(options: ConfiguredApiClientOptions = {}) {
  const environment = getEnvironment();
  if (environment.api.mode !== "remote" || !environment.api.baseUrl) {
    throw new ApiError({
      kind: "configuration",
      code: "REMOTE_API_NOT_CONFIGURED",
      userMessage: "عميل API غير متاح لأن التطبيق يعمل في وضع البيانات التجريبية.",
      retryable: false,
    });
  }

  return new ApiClient({
    ...options,
    baseUrl: environment.api.baseUrl,
    timeoutMs: environment.api.requestTimeoutMs,
  });
}
