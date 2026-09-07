import { z } from "zod";

export const listingRejectionSchema = z.object({
  reason: z.string().trim().min(1, "اختر سبب الرفض أو الإيقاف."),
  notes: z.string().trim().max(500, "يجب ألا تتجاوز الملاحظات 500 حرف.").optional(),
});

export type ListingRejectionValues = z.infer<typeof listingRejectionSchema>;
