import { z } from "zod";

export const REPORT_RESOLUTION_ACTIONS = ["dismiss", "delete_listing", "ban_user"] as const;
export type ReportResolutionAction = (typeof REPORT_RESOLUTION_ACTIONS)[number];

export const REPORT_RESOLUTION_ACTION_LABELS: Record<ReportResolutionAction, { title: string; description: string }> = {
  dismiss: {
    title: "إغلاق كبلاغ غير مثبت",
    description: "إغلاق البلاغ وتوثيقه دون اتخاذ إجراء عقابي على الإعلان أو المعلن.",
  },
  delete_listing: {
    title: "حذف/إخفاء الإعلان المخالف",
    description: "إخفاء الإعلان فوراً من السوق وإغلاق البلاغ في سجل التدقيق.",
  },
  ban_user: {
    title: "حظر المعلن المبلغ عنه",
    description: "حظر حساب المعلن وإنهاء جلساته فوراً وإغلاق البلاغ.",
  },
};

export const reportResolutionSchema = z.object({
  action: z.enum(REPORT_RESOLUTION_ACTIONS, {
    message: "يرجى تحديد نوع الإجراء المطلوب اتخاذه.",
  }),
  notes: z
    .string()
    .trim()
    .min(3, "ملاحظات الإجراء مطلوبة ويجب أن تحتوي على 3 أحرف على الأقل.")
    .max(500, "يجب ألا تتجاوز ملاحظات الإجراء 500 حرف."),
});

export type ReportResolutionFormValues = z.infer<typeof reportResolutionSchema>;
