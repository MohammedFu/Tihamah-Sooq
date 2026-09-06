import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { SessionExpiredPage, UnauthorizedPage } from "./SessionStatusPages";

describe("session recovery pages", () => {
  it("provides a login recovery action for an expired session", () => {
    render(<MemoryRouter><SessionExpiredPage /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("انتهت جلسة الدخول");
    expect(screen.getByRole("link", { name: "تسجيل الدخول مجدداً" })).toHaveAttribute("href", "/login");
  });

  it("provides a login recovery action for an invalid or inactive session", () => {
    render(<MemoryRouter><UnauthorizedPage /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("تعذر اعتماد جلسة الدخول");
    expect(screen.getByRole("link", { name: "الانتقال إلى تسجيل الدخول" })).toHaveAttribute("href", "/login");
  });
});
