import { z } from "zod";

export const userBanSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "سبب الحظر مطلوب.")
    .min(3, "يجب أن يحتوي سبب الحظر على 3 أحرف على الأقل.")
    .max(500, "يجب ألا يتجاوز سبب الحظر 500 حرف."),
});

export type UserBanFormValues = z.infer<typeof userBanSchema>;
