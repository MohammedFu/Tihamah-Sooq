import { z } from "zod";

export const COMMISSION_REJECTION_REASONS = [
  "مبلغ التحويل غير مطابق للعمولة المستحقة",
  "إيصال التحويل غير واضح أو غير مكتمل",
  "اسم المحول أو الحساب البنكي لا يطابق بيانات البائع",
  "رقم المرجع البنكي مكرر أو غير صالح",
  "سبب آخر",
] as const;

export const commissionRejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "سبب الرفض مطلوب ويجب أن يحتوي على 3 أحرف على الأقل.")
    .max(200, "يجب ألا يتجاوز سبب الرفض 200 حرف."),
  notes: z
    .string()
    .trim()
    .max(500, "يجب ألا تتجاوز الملاحظات 500 حرف.")
    .optional(),
});

export type CommissionRejectionValues = z.infer<typeof commissionRejectionSchema>;
