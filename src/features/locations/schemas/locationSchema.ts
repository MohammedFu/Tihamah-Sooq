import { z } from "zod";

export const regionSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسماً من حرفين على الأقل").max(80, "يجب ألا يتجاوز الاسم 80 حرفاً"),
  isActive: z.boolean().optional(),
});

export type RegionFormValues = z.infer<typeof regionSchema>;

export const villageSchema = z.object({
  regionId: z.number({ message: "يرجى اختيار المنطقة التابعة لها القرية" }).int().positive("يرجى اختيار المنطقة التابعة لها القرية"),
  name: z.string().trim().min(2, "اكتب اسماً من حرفين على الأقل").max(80, "يجب ألا يتجاوز الاسم 80 حرفاً"),
  isActive: z.boolean().optional(),
});

export type VillageFormValues = z.infer<typeof villageSchema>;

export const locationSchema = regionSchema;
export type LocationFormValues = RegionFormValues;
