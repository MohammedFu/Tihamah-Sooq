import { zodResolver } from "@hookform/resolvers/zod";
import { Refine } from "@refinedev/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DateField, FileUploadField, FormDialog, SelectField, SubmitButton, TextareaField, TextField, ToggleField, ValidatedForm } from ".";

const schema = z.object({
  name: z.string().trim().min(2, "الاسم مطلوب"),
  kind: z.string().min(1),
  notes: z.string(),
  date: z.string(),
  enabled: z.boolean(),
});
type Values = z.infer<typeof schema>;

function TestForm({ onSubmit = async () => undefined }: { onSubmit?: (values: Values) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", kind: "general", notes: "", date: "", enabled: false },
  });
  return <>
    <button type="button" onClick={() => setOpen(true)}>فتح النموذج</button>
    <FormDialog open={open} title="نموذج تجريبي" dirty={isDirty} submitting={isSubmitting} onClose={() => setOpen(false)}>
      {(requestClose) => <ValidatedForm onSubmit={handleSubmit(onSubmit)}>
        <TextField {...register("name")} label="الاسم" error={errors.name?.message} autoFocus hint="حرفان على الأقل" />
        <SelectField {...register("kind")} label="النوع"><option value="general">عام</option></SelectField>
        <TextareaField {...register("notes")} label="الملاحظات" />
        <DateField {...register("date")} label="التاريخ" />
        <ToggleField {...register("enabled")} label="الحالة" hint="تفعيل السجل" />
        <FileUploadField label="PNG فقط" title="رفع ملف" accept="image/png" />
        <div className="modal-actions"><button type="button" onClick={requestClose}>إلغاء</button><SubmitButton pending={isSubmitting}>حفظ</SubmitButton></div>
      </ValidatedForm>}
    </FormDialog>
  </>;
}

function renderForm(onSubmit?: (values: Values) => Promise<void>) {
  return render(<MemoryRouter><Refine options={{ disableTelemetry: true, warnWhenUnsavedChanges: true }}><TestForm onSubmit={onSubmit} /></Refine></MemoryRouter>);
}

describe("shared form infrastructure", () => {
  it("connects schema errors and hints to accessible fields", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: "فتح النموذج" }));
    await user.click(screen.getByRole("button", { name: "حفظ" }));

    const input = screen.getByRole("textbox", { name: "الاسم" });
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("الاسم مطلوب");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(error.id);
    expect(screen.getByRole("combobox", { name: "النوع" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "الملاحظات" })).toBeInTheDocument();
    expect(screen.getByLabelText("التاريخ")).toHaveAttribute("type", "date");
    expect(screen.getByRole("switch", { name: "الحالة" })).toBeInTheDocument();
    expect(screen.getByLabelText("رفع ملف")).toHaveAttribute("accept", "image/png");
  });

  it("confirms a dirty close and restores focus to the opener after discard", async () => {
    const user = userEvent.setup();
    renderForm();
    const opener = screen.getByRole("button", { name: "فتح النموذج" });
    await user.click(opener);
    const input = screen.getByRole("textbox", { name: "الاسم" });
    await waitFor(() => expect(input).toHaveFocus());
    await user.type(input, "جازان");
    await user.keyboard("{Escape}");

    expect(screen.getByRole("dialog", { name: "تجاهل التغييرات؟" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "متابعة التعديل" }));
    expect(screen.getByRole("dialog", { name: "نموذج تجريبي" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "إلغاء" }));
    await user.click(screen.getByRole("button", { name: "تجاهل التغييرات" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("locks submission while an asynchronous mutation is pending", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const pending = new Promise<void>((done) => { resolve = done; });
    const onSubmit = vi.fn(() => pending);
    renderForm(onSubmit);
    await user.click(screen.getByRole("button", { name: "فتح النموذج" }));
    await user.type(screen.getByRole("textbox", { name: "الاسم" }), "جازان");
    const submit = screen.getByRole("button", { name: "حفظ" });
    await user.click(submit);

    expect(await screen.findByRole("button", { name: "جارٍ الحفظ…" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "جارٍ الحفظ…" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    resolve();
    await waitFor(() => expect(screen.getByRole("button", { name: "حفظ" })).toBeEnabled());
  });
});
