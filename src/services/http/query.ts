export type QueryPrimitive = string | number | boolean | Date | null | undefined;
export type QueryValue = QueryPrimitive | readonly QueryPrimitive[];
export type QueryParameters = Readonly<Record<string, QueryValue>>;

function serializeQueryValue(value: Exclude<QueryPrimitive, null | undefined>, key: string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new TypeError(`Query parameter "${key}" contains an invalid date.`);
    return value.toISOString();
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(`Query parameter "${key}" must be a finite number.`);
  }

  return String(value);
}

export function buildQueryString(parameters?: QueryParameters) {
  if (!parameters) return "";

  const search = new URLSearchParams();
  const entries = Object.entries(parameters).sort(([left], [right]) => left.localeCompare(right));

  for (const [key, rawValue] of entries) {
    if (!key.trim()) throw new TypeError("Query parameter names cannot be empty.");
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    for (const value of values) {
      if (value === null || value === undefined) continue;
      search.append(key, serializeQueryValue(value, key));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export function appendQueryString(url: string, parameters?: QueryParameters) {
  const query = buildQueryString(parameters);
  if (!query) return url;
  return `${url}${url.includes("?") ? `&${query.slice(1)}` : query}`;
}
