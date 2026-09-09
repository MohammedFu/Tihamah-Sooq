import type { AuthProvider } from "@refinedev/core";
import { Refine } from "@refinedev/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Permission } from "../../types/domain";
import { SensitiveValue } from "./SensitiveValue";

function renderWithPermissions(ui: React.ReactElement, permissions: readonly Permission[] = []) {
  const authProvider: AuthProvider = {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getPermissions: async () => permissions,
  };

  return render(
    <Refine authProvider={authProvider}>
      {ui}
    </Refine>,
  );
}

describe("SensitiveValue component", () => {
  it("renders a masked phone number by default and allows reveal when permission is granted", async () => {
    const user = userEvent.setup();
    const onReveal = vi.fn();
    const permissions: Permission[] = [{ id: 1, name: "view_users", module: "Users", createdAt: null }];

    renderWithPermissions(
      <SensitiveValue
        value="+966500000001"
        type="phone"
        resource="users"
        action="show"
        label="رقم الجوال"
        onReveal={onReveal}
      />,
      permissions,
    );

    // Initial state: masked
    expect(await screen.findByText("+966 50 ••• 0001")).toBeInTheDocument();
    expect(screen.queryByText("+966500000001")).not.toBeInTheDocument();

    const revealBtn = await screen.findByRole("button", { name: "إظهار رقم الجوال" });
    expect(revealBtn).toBeInTheDocument();

    // Click to reveal
    await user.click(revealBtn);
    expect(screen.getByText("+966500000001")).toBeInTheDocument();
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledWith("phone", "+966500000001");

    // Click to hide again
    const hideBtn = screen.getByRole("button", { name: "إخفاء رقم الجوال" });
    await user.click(hideBtn);
    expect(screen.getByText("+966 50 ••• 0001")).toBeInTheDocument();
    expect(screen.queryByText("+966500000001")).not.toBeInTheDocument();
  });

  it("locks the value and shows lock indicator when permission is missing", async () => {
    // Empty permissions: unauthorized
    renderWithPermissions(
      <SensitiveValue
        value="+966500000001"
        type="phone"
        resource="users"
        action="show"
        label="رقم الجوال"
      />,
      [],
    );

    // Displays masked value
    expect(await screen.findByText("+966 50 ••• 0001")).toBeInTheDocument();

    // No reveal button
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    // Lock indicator present
    expect(screen.getByLabelText("يتطلب صلاحية لعرض القيمة الكاملة")).toBeInTheDocument();
  });

  it("respects explicit canReveal prop override", async () => {
    renderWithPermissions(
      <SensitiveValue
        value="SA0380000000608010167519"
        type="iban"
        canReveal={false}
        label="الآيبان"
      />,
    );

    expect(await screen.findByText("SA03 •••• •••• •••• •••• 7519")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByLabelText("يتطلب صلاحية لعرض القيمة الكاملة")).toBeInTheDocument();
  });

  it("handles empty or null values with fallback and no controls", () => {
    const { container } = renderWithPermissions(
      <SensitiveValue value={null} type="phone" fallback="غير متوفر" />,
    );

    expect(screen.getByText("غير متوفر")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector(".sensitive-empty")).toBeInTheDocument();
  });

  it("masks and reveals email addresses", async () => {
    const user = userEvent.setup();

    renderWithPermissions(
      <SensitiveValue
        value="admin@tihamah.sa"
        type="email"
        canReveal={true}
        label="البريد الإلكتروني"
      />,
    );

    expect(await screen.findByText("a••••n@tihamah.sa")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إظهار البريد الإلكتروني" }));
    expect(screen.getByText("admin@tihamah.sa")).toBeInTheDocument();
  });

  it("masks and reveals bank references", async () => {
    const user = userEvent.setup();

    renderWithPermissions(
      <SensitiveValue
        value="TRX-982104"
        type="bank_reference"
        canReveal={true}
        label="المرجع البنكي"
      />,
    );

    expect(await screen.findByText("TRX-•••104")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "إظهار المرجع البنكي" }));
    expect(screen.getByText("TRX-982104")).toBeInTheDocument();
  });
});
