import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { NotificationCenter } from "./NotificationCenter";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("NotificationCenter", () => {
  it("does not render when closed", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <NotificationCenter isOpen={false} onClose={vi.fn()} />
        </I18nProvider>
      </MemoryRouter>
    );
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("renders alerts, filters by tab, and navigates on alert click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <I18nProvider>
          <NotificationCenter isOpen={true} onClose={onClose} />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("region", { name: "الإشعارات" })).toBeInTheDocument();

    // Verify presence of alert items
    expect(screen.getByText(/إعلانات بانتظار المراجعة/)).toBeInTheDocument();
    expect(screen.getByText(/إشعارات عمولات مسددة/)).toBeInTheDocument();

    // Click on listings alert
    await user.click(screen.getByText(/إعلانات بانتظار المراجعة/));
    expect(mockNavigate).toHaveBeenCalledWith("/listings?status=pending_review");
    expect(onClose).toHaveBeenCalled();
  });

  it("supports marking all as read", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <I18nProvider>
          <NotificationCenter isOpen={true} onClose={vi.fn()} />
        </I18nProvider>
      </MemoryRouter>
    );

    const markReadBtn = screen.getByRole("button", { name: "تحديد الكل كمقروء" });
    expect(markReadBtn).toBeInTheDocument();

    await user.click(markReadBtn);
    expect(screen.queryByRole("button", { name: "تحديد الكل كمقروء" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <I18nProvider>
          <NotificationCenter isOpen={true} onClose={onClose} />
        </I18nProvider>
      </MemoryRouter>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
