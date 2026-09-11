import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "../../context/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("renders with accessible label and toggles theme on click", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: "تفعيل المظهر الداكن" });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(screen.getByRole("button", { name: "تفعيل المظهر الفاتح" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: "تفعيل المظهر الفاتح" }));
    expect(screen.getByRole("button", { name: "تفعيل المظهر الداكن" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
