import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it } from "vitest";
import { Modal } from "./Modal";

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)}>فتح</button><Modal open={open} title="نافذة اختبار" onClose={() => setOpen(false)}><input aria-label="الحقل الأول" autoFocus /><button type="button">الإجراء الأخير</button></Modal></>;
}

it("contains keyboard focus and restores it when the modal closes", async () => {
  const user = userEvent.setup();
  render(<ModalHarness />);
  const opener = screen.getByRole("button", { name: "فتح" });
  await user.click(opener);
  const input = screen.getByRole("textbox", { name: "الحقل الأول" });
  await waitFor(() => expect(input).toHaveFocus());
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(screen.getByRole("button", { name: "إغلاق" })).toHaveFocus();
  await user.keyboard("{Shift>}{Tab}{/Shift}");
  expect(screen.getByRole("button", { name: "الإجراء الأخير" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(opener).toHaveFocus();
});
