import { Beef, CarFront, Home, Layers, Smartphone, Wheat, type LucideIcon } from "lucide-react";
import { z } from "zod";

export type PresetIcon = {
  key: string;
  label: string;
  icon: LucideIcon;
  defaultUrl: string;
};

export const PRESET_ICONS: readonly PresetIcon[] = [
  { key: "car", label: "سيارات ومحركات", icon: CarFront, defaultUrl: "https://cdn.tihamah.com/icons/car.svg" },
  { key: "livestock", label: "مواشي وحيوانات", icon: Beef, defaultUrl: "https://cdn.tihamah.com/icons/livestock.svg" },
  { key: "property", label: "عقارات وأراضي", icon: Home, defaultUrl: "https://cdn.tihamah.com/icons/property.svg" },
  { key: "electronics", label: "أجهزة وإلكترونيات", icon: Smartphone, defaultUrl: "https://cdn.tihamah.com/icons/electronics.svg" },
  { key: "agriculture", label: "زراعة ومحاصيل", icon: Wheat, defaultUrl: "https://cdn.tihamah.com/icons/agriculture.svg" },
  { key: "general", label: "عام وخدمات أخرى", icon: Layers, defaultUrl: "https://cdn.tihamah.com/icons/general.svg" },
] as const;

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اكتب اسماً من حرفين على الأقل")
    .max(80, "يجب ألا يتجاوز الاسم 80 حرفاً"),
  iconUrl: z
    .string()
    .trim()
    .refine((val) => val === "" || /^https?:\/\/.+/i.test(val), {
      message: "يجب إدخال رابط أيقونة صالح يبدأ بـ http:// أو https://",
    })
    .optional(),
  sortOrder: z
    .number({ message: "يرجى إدخال رقم صحيح للترتيب" })
    .int("يجب أن يكون الترتيب رقماً صحيحاً")
    .nonnegative("يجب أن يكون رقم الترتيب 0 أو أكبر")
    .optional(),
  isActive: z.boolean().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
