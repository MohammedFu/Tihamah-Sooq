import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import { Drawer } from "./Drawer";

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}>عرض السجل</button>
    <Drawer open={open} title="تفاصيل المستخدم" onClose={() => setOpen(false)}>
      <a href="#history">السجل</a>
      <button type="button">حظر المستخدم</button>
    </Drawer>
  </>;
}

it("labels the drawer, contains keyboard focus, closes with Escape, and restores focus", async () => {
  const user = userEvent.setup();
  render(<DrawerHarness />);
  const opener = screen.getByRole("button", { name: "عرض السجل" });

  await user.click(opener);
  const drawer = screen.getByRole("dialog", { name: "تفاصيل المستخدم" });
  expect(drawer).toHaveAttribute("aria-modal", "true");
  await waitFor(() => expect(screen.getByRole("button", { name: "إغلاق" })).toHaveFocus());

  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(screen.getByRole("button", { name: "حظر المستخدم" })).toHaveFocus();
  await user.keyboard("{Tab}");
  expect(screen.getByRole("button", { name: "إغلاق" })).toHaveFocus();

  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
