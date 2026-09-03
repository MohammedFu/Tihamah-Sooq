export const API_MODES = ["fixture", "remote"] as const;
export const APPLICATION_ENVIRONMENTS = ["development", "staging", "production", "test"] as const;

export type ApiMode = (typeof API_MODES)[number];
export type ApplicationEnvironment = (typeof APPLICATION_ENVIRONMENTS)[number];

export type EnvironmentSource = {
  MODE?: string;
  VITE_API_MODE?: string;
  VITE_API_URL?: string;
  VITE_REQUEST_TIMEOUT_MS?: string;
  VITE_MEDIA_HOST?: string;
  VITE_APP_ENV?: string;
};

export type AppEnvironmentConfig = Readonly<{
  applicationEnvironment: ApplicationEnvironment;
  api: Readonly<{
    mode: ApiMode;
    baseUrl: string | null;
    requestTimeoutMs: number;
  }>;
  mediaHost: string | null;
}>;

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const MIN_REQUEST_TIMEOUT_MS = 1_000;
const MAX_REQUEST_TIMEOUT_MS = 120_000;

export class EnvironmentConfigurationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "EnvironmentConfigurationError";
    this.issues = Object.freeze([...issues]);
  }
}

function clean(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function parseApplicationEnvironment(source: EnvironmentSource, issues: string[]): ApplicationEnvironment {
  const value = clean(source.VITE_APP_ENV) ?? clean(source.MODE) ?? "development";

  if (APPLICATION_ENVIRONMENTS.includes(value as ApplicationEnvironment)) {
    return value as ApplicationEnvironment;
  }

  issues.push(`VITE_APP_ENV must be one of: ${APPLICATION_ENVIRONMENTS.join(", ")}. Received "${value}".`);
  return "development";
}

function parseApiMode(
  source: EnvironmentSource,
  applicationEnvironment: ApplicationEnvironment,
  issues: string[],
): ApiMode {
  const value = clean(source.VITE_API_MODE);

  if (!value) {
    if (applicationEnvironment === "development" || applicationEnvironment === "test") {
      return "fixture";
    }

    issues.push("VITE_API_MODE is required for staging and production builds. Use fixture or remote explicitly.");
    return "remote";
  }

  if (API_MODES.includes(value as ApiMode)) {
    return value as ApiMode;
  }

  issues.push(`VITE_API_MODE must be one of: ${API_MODES.join(", ")}. Received "${value}".`);
  return "fixture";
}

function normalizeUrl(
  key: "VITE_API_URL" | "VITE_MEDIA_HOST",
  rawValue: string | undefined,
  allowRootRelative: boolean,
  issues: string[],
) {
  const value = clean(rawValue);
  if (!value) return null;

  if (allowRootRelative && value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("?") || value.includes("#")) {
      issues.push(`${key} must be a clean root-relative path or an absolute HTTP(S) URL.`);
      return null;
    }

    return value === "/" ? value : value.replace(/\/+$/, "");
  }

  try {
    const url = new URL(value);
    if (!(["http:", "https:"] as const).includes(url.protocol as "http:" | "https:")) {
      issues.push(`${key} must use the http or https protocol.`);
      return null;
    }

    if (url.username || url.password || url.search || url.hash) {
      issues.push(`${key} must not contain credentials, a query string, or a fragment.`);
      return null;
    }

    return url.toString().replace(/\/+$/, "");
  } catch {
    issues.push(`${key} must be a valid ${allowRootRelative ? "root-relative path or " : ""}absolute HTTP(S) URL.`);
    return null;
  }
}

function parseRequestTimeout(value: string | undefined, issues: string[]) {
  const normalized = clean(value);
  if (!normalized) return DEFAULT_REQUEST_TIMEOUT_MS;

  if (!/^\d+$/.test(normalized)) {
    issues.push("VITE_REQUEST_TIMEOUT_MS must be an integer number of milliseconds.");
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  const timeout = Number(normalized);
  if (timeout < MIN_REQUEST_TIMEOUT_MS || timeout > MAX_REQUEST_TIMEOUT_MS) {
    issues.push(
      `VITE_REQUEST_TIMEOUT_MS must be between ${MIN_REQUEST_TIMEOUT_MS} and ${MAX_REQUEST_TIMEOUT_MS} milliseconds.`,
    );
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return timeout;
}

export function parseEnvironment(source: EnvironmentSource): AppEnvironmentConfig {
  const issues: string[] = [];
  const applicationEnvironment = parseApplicationEnvironment(source, issues);
  const apiMode = parseApiMode(source, applicationEnvironment, issues);
  const apiUrl = normalizeUrl("VITE_API_URL", source.VITE_API_URL, true, issues);
  const mediaHost = normalizeUrl("VITE_MEDIA_HOST", source.VITE_MEDIA_HOST, false, issues);
  const requestTimeoutMs = parseRequestTimeout(source.VITE_REQUEST_TIMEOUT_MS, issues);

  if (apiMode === "remote" && !apiUrl) {
    issues.push("VITE_API_URL is required when VITE_API_MODE is remote.");
  }

  if (issues.length > 0) {
    throw new EnvironmentConfigurationError(issues);
  }

  return Object.freeze({
    applicationEnvironment,
    api: Object.freeze({ mode: apiMode, baseUrl: apiUrl, requestTimeoutMs }),
    mediaHost,
  });
}

let cachedEnvironment: AppEnvironmentConfig | undefined;

export function getEnvironment() {
  cachedEnvironment ??= parseEnvironment(import.meta.env);
  return cachedEnvironment;
}
