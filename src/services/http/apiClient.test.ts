import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "./apiClient";
import { ApiError } from "./ApiError";

describe("ApiClient correlation ID and error diagnostics", () => {
  it("attaches generated X-Correlation-Id and X-Request-Id headers to outgoing requests", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({ success: true, data: { status: "ok" } }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    await client.get("health");

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("/api/v1/health");
    const headers = new Headers(init?.headers);
    const correlationId = headers.get("x-correlation-id");
    const requestId = headers.get("x-request-id");
    expect(correlationId).toBeTruthy();
    expect(requestId).toBe(correlationId);
  });

  it("preserves a custom correlationId supplied in request options", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({ success: true, message: "custom-traced" }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    await client.post("admin/action", { foo: "bar" }, { correlationId: "audit-trace-12345" });

    const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
    expect(headers.get("x-correlation-id")).toBe("audit-trace-12345");
    expect(headers.get("x-request-id")).toBe("audit-trace-12345");
  });

  it("preserves the correlation ID on ApiError when server fails without an x-request-id header", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, message: "Server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    let caughtError: unknown;
    try {
      await client.get("error-endpoint", { correlationId: "fail-trace-999" });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiError = caughtError as ApiError;
    expect(apiError.status).toBe(500);
    expect(apiError.requestId).toBe("fail-trace-999");
  });

  it("prioritizes server-returned x-request-id header over client correlation ID on error", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, error: { message: "Server denied" } }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "X-Request-Id": "server-req-777",
        },
      }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    let caughtError: unknown;
    try {
      await client.get("forbidden-endpoint", { correlationId: "client-trace-111" });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiError = caughtError as ApiError;
    expect(apiError.status).toBe(403);
    expect(apiError.requestId).toBe("server-req-777");
  });

  it("attaches correlation ID to ApiError on network failures", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    let caughtError: unknown;
    try {
      await client.get("network-fail", { correlationId: "net-trace-555" });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiError = caughtError as ApiError;
    expect(apiError.kind).toBe("network");
    expect(apiError.requestId).toBe("net-trace-555");
  });

  it("attaches correlation ID to ApiError on timeout", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 25, fetcher });

    await expect(
      client.get("timeout-endpoint", { correlationId: "timeout-trace-333" }),
    ).rejects.toMatchObject({
      kind: "timeout",
      code: "REQUEST_TIMEOUT",
      requestId: "timeout-trace-333",
    });
  });

  it("attaches correlation ID to ApiError on invalid JSON response", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response("<html>Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const client = new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher });

    let caughtError: unknown;
    try {
      await client.get("bad-gateway", { correlationId: "html-err-444" });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(ApiError);
    const apiError = caughtError as ApiError;
    expect(apiError.kind).toBe("server");
    expect(apiError.status).toBe(502);
    expect(apiError.requestId).toBe("html-err-444");
  });
});
