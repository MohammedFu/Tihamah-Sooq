import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "../../../i18n/I18nContext";
import { GrowthAreaChart } from "./GrowthAreaChart";
import { RevenueBarChart } from "./RevenueBarChart";

describe("Dashboard Charts", () => {
  it("renders GrowthAreaChart with title, legend, and SVG paths", () => {
    render(
      <I18nProvider>
        <GrowthAreaChart />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "نمو الإعلانات وسرعة المراجعة" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "نمو الإعلانات وسرعة المراجعة" })).toBeInTheDocument();
    expect(screen.getByText("الإعلانات النشطة")).toBeInTheDocument();
    expect(screen.getByText("بانتظار مراجعة الإعلان")).toBeInTheDocument();
    expect(screen.getByText("الإعلانات المباعة")).toBeInTheDocument();
  });

  it("renders RevenueBarChart with title, bars, and legend", () => {
    render(
      <I18nProvider>
        <RevenueBarChart />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "تدفق إيرادات العمولات 1%" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "تدفق إيرادات العمولات 1%" })).toBeInTheDocument();
    expect(screen.getByText("مسددة وبانتظار التدقيق")).toBeInTheDocument();
    expect(screen.getByText("مسددة ومعتمدة")).toBeInTheDocument();
    expect(screen.getByText("عمولات متبقية")).toBeInTheDocument();
  });
});
