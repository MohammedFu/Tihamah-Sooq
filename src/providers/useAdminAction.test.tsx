import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../services/http";
import { useAdminAction } from "./useAdminAction";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn() }));

vi.mock("@refinedev/core", () => ({
  useInvalidate: () => mocks.invalidate,
}));

describe("useAdminAction", () => {
  beforeEach(() => {
    mocks.invalidate.mockReset();
    mocks.invalidate.mockResolvedValue(undefined);
  });

  it("refreshes affected resources after a confirmed action", async () => {
    const { result } = renderHook(() => useAdminAction());

    await expect(result.current("commission", async () => "confirmed")).resolves.toBe("confirmed");
    expect(mocks.invalidate.mock.calls.map(([value]) => value.resource)).toEqual([
      "commissions",
      "users",
      "dashboard",
      "audit",
    ]);
  });

  it("starts a scoped refresh and preserves the original stale-write conflict", async () => {
    const conflict = new ApiError({
      kind: "conflict",
      code: "PRECONDITION_FAILED",
      status: 412,
      userMessage: "تغير السجل.",
    });
    const execute = vi.fn().mockRejectedValue(conflict);
    const { result } = renderHook(() => useAdminAction());

    await expect(result.current("ban", execute)).rejects.toBe(conflict);
    expect(execute).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledTimes(4));
    expect(mocks.invalidate.mock.calls.map(([value]) => value.resource)).toEqual([
      "users",
      "listings",
      "dashboard",
      "audit",
    ]);
  });

  it("does not refresh or retry an ordinary mutation failure", async () => {
    const failure = new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال." });
    const execute = vi.fn().mockRejectedValue(failure);
    const { result } = renderHook(() => useAdminAction());

    await expect(result.current("listing", execute)).rejects.toBe(failure);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(mocks.invalidate).not.toHaveBeenCalled();
  });
});
