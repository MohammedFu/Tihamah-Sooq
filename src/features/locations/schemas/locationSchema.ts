import { z } from "zod";

export const locationSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسماً من حرفين على الأقل").max(80, "يجب ألا يتجاوز الاسم 80 حرفاً"),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
