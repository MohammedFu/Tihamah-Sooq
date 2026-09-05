const FALLBACK_PATH = "/";

export function safeDashboardRedirect(value: unknown) {
  if (typeof value !== "string") return FALLBACK_PATH;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return FALLBACK_PATH;
  }

  try {
    const url = new URL(candidate, "https://dashboard.invalid");
    if (url.origin !== "https://dashboard.invalid" || url.pathname === "/login") return FALLBACK_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK_PATH;
  }
}
