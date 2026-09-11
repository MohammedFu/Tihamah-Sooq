import { describe, expect, it } from "vitest";
import { ApiError, createHttpError, isMutationConflict } from "./ApiError";

describe("mutation conflict errors", () => {
  it.each([409, 412])("maps HTTP %s to a non-retryable conflict", (status) => {
    const error = createHttpError(
      new Response(JSON.stringify({ success: false }), { status }),
      { success: false },
      "conflict-request",
    );

    expect(error).toMatchObject({
      kind: "conflict",
      status,
      retryable: false,
      requestId: "conflict-request",
    });
    expect(isMutationConflict(error)).toBe(true);
  });

  it("recognizes a backend stale-record code without misclassifying ordinary failures", () => {
    expect(isMutationConflict(new ApiError({
      kind: "api",
      code: "STALE_RECORD",
      userMessage: "تغير السجل.",
    }))).toBe(true);
    expect(isMutationConflict(new ApiError({
      kind: "network",
      code: "NETWORK_ERROR",
      userMessage: "تعذر الاتصال.",
    }))).toBe(false);
  });
});
