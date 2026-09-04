import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../../services/http/ApiError.ts";
import { FIXTURE_ADMIN_CREDENTIALS } from "../api/authService.ts";
import { LoginForm } from "./LoginForm.tsx";

describe("LoginForm", () => {
  it("validates both required fields before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LoginForm fixtureMode={false} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "دخول إلى لوحة الإدارة" }));

    expect(screen.getByText("أدخل البريد الإلكتروني أو رقم الجوال.")).toBeInTheDocument();
    expect(screen.getByText("أدخل كلمة المرور.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps entered values and displays a server error after a failed request", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockRejectedValue(new ApiError({
      kind: "network",
      code: "NETWORK_ERROR",
      userMessage: "تعذر الاتصال بالخادم.",
      retryable: true,
    }));
    render(<LoginForm fixtureMode={false} onSubmit={onSubmit} />);

    const identifier = screen.getByLabelText("البريد الإلكتروني أو رقم الجوال");
    const password = screen.getByLabelText("كلمة المرور");
    await user.type(identifier, FIXTURE_ADMIN_CREDENTIALS.email);
    await user.type(password, "incorrect-password");
    await user.click(screen.getByRole("button", { name: "دخول إلى لوحة الإدارة" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("تعذر الاتصال بالخادم.");
    expect(identifier).toHaveValue(FIXTURE_ADMIN_CREDENTIALS.email);
    expect(password).toHaveValue("incorrect-password");

    await user.click(screen.getByRole("button", { name: "إظهار كلمة المرور" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("disables submission while authentication is pending", async () => {
    const user = userEvent.setup();
    let completeLogin: () => void = () => {};
    const pendingLogin = new Promise<void>((resolve) => {
      completeLogin = () => resolve();
    });
    const onSubmit = vi.fn(() => pendingLogin);
    render(<LoginForm fixtureMode onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "استخدام البيانات" }));
    await user.click(screen.getByRole("button", { name: "دخول إلى لوحة الإدارة" }));

    expect(screen.getByRole("button", { name: "جارٍ التحقق..." })).toBeDisabled();
    completeLogin();
    await waitFor(() => expect(screen.getByRole("button", { name: "دخول إلى لوحة الإدارة" })).toBeEnabled());
  });
});
