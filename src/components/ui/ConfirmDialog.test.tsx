import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Permission } from "../../types/domain";

const permissions: Permission[] = [
  { id: 1, name: "delete", module: "listings", createdAt: null },
];

const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  onError: async () => ({}),
  getPermissions: async () => permissions,
};

function renderDialog(ui: React.ReactElement) {
  return render(
    <Refine
      authProvider={authProvider}
      resources={[{ name: "listings" }]}
      options={{ disableTelemetry: true }}
    >
      {ui}
    </Refine>,
  );
}

describe("ConfirmDialog", () => {
  it("renders title, entity name, description, and consequence", () => {
    renderDialog(
      <ConfirmDialog
        open
        title="حذف الإعلان"
        entityName="مجموعة أغنام حري"
        entityType="الإعلان"
        description="هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟"
        consequence="سيتم حذف الإعلان وجميع الصور المرتبطة به من قاعدة البيانات."
        confirmLabel="تأكيد الحذف"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: "حذف الإعلان" })).toBeInTheDocument();
    expect(screen.getByText(/الإعلان: «مجموعة أغنام حري»/)).toBeInTheDocument();
    expect(screen.getByText("هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟")).toBeInTheDocument();
    expect(
      screen.getByText("سيتم حذف الإعلان وجميع الصور المرتبطة به من قاعدة البيانات."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تأكيد الحذف" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeInTheDocument();
  });

  it("never submits on cancel click or Escape key press", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    const { rerender } = renderDialog(
      <ConfirmDialog
        open
        title="إلغاء العملية"
        description="تنبيه"
        onConfirm={handleConfirm}
        onClose={handleClose}
      />,
    );

    // Click Cancel
    await user.click(screen.getByRole("button", { name: "إلغاء" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();

    // Reset and test Escape
    handleClose.mockClear();
    rerender(
      <Refine
        authProvider={authProvider}
        resources={[{ name: "listings" }]}
        options={{ disableTelemetry: true }}
      >
        <ConfirmDialog
          open
          title="إلغاء العملية"
          description="تنبيه"
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      </Refine>,
    );

    await user.keyboard("{Escape}");
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("auto-focuses the Cancel button by default on danger intent without text input", async () => {
    renderDialog(
      <ConfirmDialog
        open
        intent="danger"
        title="إجراء عالي الخطورة"
        description="تأكيد الحذف الحرج"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      const cancelBtn = screen.getByRole("button", { name: "إلغاء" });
      expect(document.activeElement).toBe(cancelBtn);
    });
  });

  it("guards against double-submission and rapid multiple clicks", async () => {
    const user = userEvent.setup();
    let resolveConfirm: () => void = () => undefined;
    const handleConfirm = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        }),
    );

    renderDialog(
      <ConfirmDialog
        open
        title="حذف سجل"
        intent="danger"
        confirmLabel="تأكيد الحذف"
        pendingLabel="جارٍ الحذف…"
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: "تأكيد الحذف" });

    // Click multiple times rapidly
    await user.click(confirmBtn);
    await user.click(confirmBtn);
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "جارٍ الحذف…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDisabled();

    // Complete the submission
    resolveConfirm();
  });

  it("blocks Escape and cancel while submitting is in-flight", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    renderDialog(
      <ConfirmDialog
        open
        submitting
        title="جارٍ المعالجة"
        description="يرجى الانتظار"
        onConfirm={vi.fn()}
        onClose={handleClose}
      />,
    );

    // Cancel button is disabled
    expect(screen.getByRole("button", { name: "إلغاء" })).toBeDisabled();

    // Press Escape
    await user.keyboard("{Escape}");
    expect(handleClose).not.toHaveBeenCalled();
  });

  it("enforces exact keyword confirmation when confirmTextMatch is provided", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    renderDialog(
      <ConfirmDialog
        open
        title="حذف المنطقة نهائياً"
        intent="danger"
        confirmTextMatch={{
          expected: "حذف المنطقة",
          label: "اكتب «حذف المنطقة» للتأكيد:",
          placeholder: "اكتب العبارة هنا",
        }}
        confirmLabel="تأكيد الحذف النهائي"
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole("button", { name: "تأكيد الحذف النهائي" });
    expect(confirmBtn).toBeDisabled();

    const input = screen.getByLabelText("اكتب «حذف المنطقة» للتأكيد:");

    // Type partial or wrong keyword
    await user.type(input, "حذف");
    expect(confirmBtn).toBeDisabled();

    // Type complete exact keyword
    await user.type(input, " المنطقة");
    expect(confirmBtn).not.toBeDisabled();

    await user.click(confirmBtn);
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it("enforces mandatory reason when reasonConfig is provided", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    renderDialog(
      <ConfirmDialog
        open
        title="حظر المستخدم"
        intent="danger"
        reasonConfig={{
          required: true,
          label: "سبب الحظر",
          placeholder: "اكتب سبب الحظر بالتفصيل…",
          minLength: 5,
        }}
        confirmLabel="تأكيد الحظر"
        onConfirm={handleConfirm}
        onClose={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText(/سبب الحظر/);

    // Submit with short reason (< 5 chars)
    await user.type(textarea, "مخالف");
    // Clear and type just 2 chars
    await user.clear(textarea);
    await user.type(textarea, "لا");

    const confirmBtn = screen.getByRole("button", { name: "تأكيد الحظر" });
    await user.click(confirmBtn);

    expect(handleConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("يرجى كتابة سبب الإجراء (5 أحرف على الأقل).");

    // Type valid reason
    await user.clear(textarea);
    await user.type(textarea, "تكرار نشر إعلانات مخالفة للائحة السوق");
    await user.click(confirmBtn);

    expect(handleConfirm).toHaveBeenCalledWith("تكرار نشر إعلانات مخالفة للائحة السوق");
  });

  it("displays error alert when error prop is passed", () => {
    renderDialog(
      <ConfirmDialog
        open
        title="فشل العملية"
        error="لا يمكن حذف هذا العنصر لوجود سجلات مرتبطة به."
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("لا يمكن حذف هذا العنصر لوجود سجلات مرتبطة به.");
  });

  it("supports success and warning intents with appropriate styling", () => {
    const { rerender } = renderDialog(
      <ConfirmDialog
        open
        intent="success"
        title="اعتماد السداد"
        confirmLabel="تأكيد الاعتماد"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const successBtn = screen.getByRole("button", { name: "تأكيد الاعتماد" });
    expect(successBtn).toHaveClass("success-button");

    rerender(
      <Refine
        authProvider={authProvider}
        resources={[{ name: "listings" }]}
        options={{ disableTelemetry: true }}
      >
        <ConfirmDialog
          open
          intent="warning"
          title="تحذير"
          confirmLabel="متابعة"
          onConfirm={vi.fn()}
          onClose={vi.fn()}
        />
      </Refine>,
    );

    const warningBtn = screen.getByRole("button", { name: "متابعة" });
    expect(warningBtn).toHaveClass("warning-button");
  });
});
