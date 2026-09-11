import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../i18n/I18nContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders and toggles language between Arabic and English", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <LanguageSwitcher />
      </I18nProvider>
    );

    const button = screen.getByRole("button", { name: "Switch to English" });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByRole("button", { name: "التبديل إلى العربية" })).toBeInTheDocument();
    expect(screen.getByText("ع")).toBeInTheDocument();
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(document.documentElement.getAttribute("dir")).toBe("ltr");

    await user.click(screen.getByRole("button", { name: "التبديل إلى العربية" }));

    expect(screen.getByRole("button", { name: "Switch to English" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("lang")).toBe("ar");
    expect(document.documentElement.getAttribute("dir")).toBe("rtl");
  });
});
