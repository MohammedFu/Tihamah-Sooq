import { Refine, useList, useUpdate } from "@refinedev/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { createFixtureAdminServices } from "../services/admin/fixtureServices";
import { createAdminDataProvider } from "./dataProvider";
import { useAdminAction } from "./useAdminAction";

it("Refine refreshes the changed catalog, and domain actions refresh only dependent queries after success", async () => {
  const services = createFixtureAdminServices();
  const provider = createAdminDataProvider(services, "/api/v1");
  const reads = vi.spyOn(provider, "getList");
  function Probe() {
    const categories = useList({ resource: "categories" });
    const banners = useList({ resource: "banners" });
    const regions = useList({ resource: "regions" });
    const villages = useList({ resource: "villages" });
    const update = useUpdate();
    const action = useAdminAction();
    const [error, setError] = useState("");
    return <>
      <p>{categories.result.data[0]?.name}</p>
      <p>{regions.result.data[0]?.villages.length === 0 ? "نقلت القرية" : "قرية موجودة"}</p>
      <p>{[categories, banners, regions, villages].every((list) => list.query.isSuccess) ? "جاهز" : "تحميل"}</p>
      <button onClick={() => update.mutate({ resource: "categories", id: 1, values: { name: "قسم محدث" } })}>تعديل القسم</button>
      <button onClick={() => { void action("village", () => services.villages.update(11, { name: "المضايا", regionId: 2 })); }}>نقل القرية</button>
      <button onClick={() => { void action("region", () => services.regions.delete(2)).catch(() => setError("منع الحذف")); }}>حذف المنطقة المرتبطة</button>
      <p>{error}</p>
    </>;
  }
  render(<Refine dataProvider={provider} resources={["categories", "banners", "regions", "villages"].map((name) => ({ name }))} options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false, staleTime: Infinity } } } } }}><Probe /></Refine>);
  await screen.findByText("جاهز");
  reads.mockClear();
  fireEvent.click(screen.getByText("تعديل القسم"));
  await screen.findByText("قسم محدث");
  expect(reads.mock.calls.map(([params]) => params.resource)).toEqual(["categories"]);
  reads.mockClear();
  fireEvent.click(screen.getByText("نقل القرية"));
  await screen.findByText("نقلت القرية");
  await waitFor(() => expect(reads.mock.calls.map(([params]) => params.resource).sort()).toEqual(["regions", "villages"]));
  reads.mockClear();
  fireEvent.click(screen.getByText("حذف المنطقة المرتبطة"));
  await screen.findByText("منع الحذف");
  expect(reads).not.toHaveBeenCalled();
});
