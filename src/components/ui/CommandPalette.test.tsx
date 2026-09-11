import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { CommandPalette } from "./CommandPalette";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CommandPalette", () => {
  it("does not render when closed", () => {
    render(
      <MemoryRouter>
        <I18nProvider>
          <CommandPalette isOpen={false} onClose={vi.fn()} />
        </I18nProvider>
      </MemoryRouter>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders when open, filters by query, and navigates on Enter", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <I18nProvider>
          <CommandPalette isOpen={true} onClose={onClose} />
        </I18nProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const input = screen.getByRole("combobox");
    expect(input).toBeInTheDocument();

    // Type query to filter
    await user.type(input, "users");

    // The users item should be visible
    expect(screen.getByText("إدارة المستخدمين")).toBeInTheDocument();

    // Press Enter to navigate
    await user.keyboard("{Enter}");
    expect(mockNavigate).toHaveBeenCalledWith("/users");
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <I18nProvider>
          <CommandPalette isOpen={true} onClose={onClose} />
        </I18nProvider>
      </MemoryRouter>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
