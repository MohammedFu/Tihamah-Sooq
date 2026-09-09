/**
 * Utilities for masking sensitive operational data (PII, credentials, financial references).
 * Ensures safe display by default in Arabic RTL interfaces without leaking customer/admin details.
 */

export function maskPhone(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "—";
  }

  const clean = value.trim();
  const digitsOnly = clean.replace(/\D/g, "");

  // Saudi international format: +9665XXXXXXXX (12 digits excluding +, 13 with +)
  if (clean.startsWith("+966") && digitsOnly.length >= 11) {
    // digitsOnly: 966 5X XXX XXXX
    const prefix = clean.slice(0, clean.indexOf("5") + 2); // e.g. "+966 50" or "+96650"
    const suffix = digitsOnly.slice(-4);
    const formattedPrefix = prefix.includes(" ") ? prefix : `+966 ${prefix.slice(4)}`;
    return `${formattedPrefix} ••• ${suffix}`;
  }

  // Saudi local format: 05XXXXXXXX (10 digits)
  if (clean.startsWith("05") && digitsOnly.length === 10) {
    const prefix = clean.slice(0, 3); // "050"
    const suffix = digitsOnly.slice(-4);
    return `${prefix} ••• ${suffix}`;
  }

  // General international format: e.g. +967700000012
  if (clean.startsWith("+") && digitsOnly.length >= 9) {
    const countryAndArea = clean.slice(0, 5); // "+9677" or "+967 7"
    const suffix = digitsOnly.slice(-4);
    return `${countryAndArea} ••• ${suffix}`;
  }

  // Generic digits fallback: if at least 7 chars, preserve first 3 and last 3
  if (clean.length >= 7) {
    const start = clean.slice(0, 3);
    const end = clean.slice(-3);
    return `${start} ••• ${end}`;
  }

  // Too short to selectively mask: mask entire value
  return "••••";
}

export function maskEmail(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "—";
  }

  const clean = value.trim();
  const atIndex = clean.indexOf("@");
  if (atIndex <= 0) {
    return "••••";
  }

  const localPart = clean.slice(0, atIndex);
  const domainPart = clean.slice(atIndex); // includes "@"

  if (localPart.length <= 2) {
    return `${localPart[0]}•${domainPart}`;
  }

  const firstChar = localPart[0];
  const lastChar = localPart[localPart.length - 1];
  return `${firstChar}••••${lastChar}${domainPart}`;
}

export function maskIban(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "—";
  }

  const clean = value.trim().replace(/\s+/g, "");
  if (clean.length < 10) {
    return "••••";
  }

  const prefix = clean.slice(0, 4); // Country code + 2 check digits, e.g. "SA03"
  const suffix = clean.slice(-4);   // Last 4 digits

  // Render standardized IBAN masked groups
  return `${prefix} •••• •••• •••• •••• ${suffix}`;
}

export function maskBankReference(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.trim() || value.trim() === "-") {
    return "—";
  }

  const clean = value.trim();
  const dashIndex = clean.indexOf("-");

  if (dashIndex > 0 && dashIndex < clean.length - 2) {
    const prefix = clean.slice(0, dashIndex + 1); // e.g. "TRX-" or "BLD-"
    const suffix = clean.slice(-3);
    return `${prefix}•••${suffix}`;
  }

  if (clean.length > 5) {
    return `••••${clean.slice(-4)}`;
  }

  return "••••";
}

export function maskSecret(value: string | null | undefined): string {
  if (!value || typeof value !== "string" || !value.trim()) {
    return "—";
  }
  return "••••••••";
}

/**
 * Sanitizes sensitive key-value pairs (passwords, tokens, secrets) from raw text/logs.
 */
export function sanitizeSensitiveString(text: string): string {
  if (!text) return text;
  return text
    .replace(/(password|token|secret|api_key|authorization)=([^&\s]+)/gi, "$1=••••")
    .replace(/("password"|"token"|"secret"|"apiKey"|"api_key")\s*:\s*"[^"]+"/gi, '$1:"••••"')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer ••••");
}
