import { z } from "zod";

export const BANNER_TARGET_TYPES = ["none", "category", "listing"] as const;
export type BannerTargetType = (typeof BANNER_TARGET_TYPES)[number];

export const targetTypeLabels: Record<BannerTargetType, string> = {
  none: "بدون توجيه",
  category: "فتح قسم محدد",
  listing: "فتح إعلان محدد",
};

export const bannerSchema = z
  .object({
    imageUrl: z
      .string()
      .trim()
      .min(1, "يرجى إدخال رابط صورة البنر")
      .refine(
        (val) => /^https?:\/\/.+/i.test(val),
        "يجب إدخال رابط صورة صالح يبدأ بـ http:// أو https://",
      ),
    title: z
      .string()
      .trim()
      .max(120, "يجب ألا يتجاوز العنوان 120 حرفاً")
      .optional()
      .or(z.literal("")),
    sortOrder: z
      .number({ message: "يرجى إدخال رقم صحيح للترتيب" })
      .int("يجب أن يكون الترتيب رقماً صحيحاً")
      .nonnegative("يجب أن يكون رقم الترتيب 0 أو أكبر")
      .optional(),
    isActive: z.boolean().optional(),
    targetType: z.enum(BANNER_TARGET_TYPES).optional(),
    targetId: z.union([z.number(), z.string()]).optional().nullable(),
    startsAt: z.string().optional().nullable(),
    endsAt: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Validate targetId based on targetType
    if (data.targetType && data.targetType !== "none") {
      const num = typeof data.targetId === "number" ? data.targetId : Number(data.targetId);
      if (
        data.targetId === null ||
        data.targetId === undefined ||
        data.targetId === "" ||
        Number.isNaN(num) ||
        !Number.isSafeInteger(num) ||
        num <= 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            data.targetType === "category"
              ? "يرجى إدخال معرّف القسم المطلوب (رقم صحيح)"
              : "يرجى إدخال رقم الإعلان المطلوب (رقم صحيح)",
          path: ["targetId"],
        });
      }
    }

    // Validate date range: end date cannot precede start date
    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء",
          path: ["endsAt"],
        });
      }
    }
  });

export type BannerFormValues = z.infer<typeof bannerSchema>;

export type BannerLifecycleState = "active" | "scheduled" | "expired" | "inactive";

export function getBannerLifecycleState(
  banner: {
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  },
  referenceDate: Date = new Date(),
): BannerLifecycleState {
  const todayStr = referenceDate.toISOString().slice(0, 10);

  // Expired banners cannot appear active
  if (banner.endsAt) {
    const endStr = banner.endsAt.slice(0, 10);
    if (endStr < todayStr) {
      return "expired";
    }
  }

  // Scheduled banners with future start date
  if (banner.startsAt && banner.isActive) {
    const startStr = banner.startsAt.slice(0, 10);
    if (startStr > todayStr) {
      return "scheduled";
    }
  }

  return banner.isActive ? "active" : "inactive";
}
