import { z } from "zod";

const optionalText = (maximum: number) => z.string().trim().max(maximum);

export const broadcastSchema = z.object({
  title: z.string().trim().min(1, "عنوان الإشعار مطلوب.").max(200, "يجب ألا يتجاوز العنوان 200 حرف."),
  body: z.string().trim().min(1, "نص الإشعار مطلوب.").max(1000, "يجب ألا يتجاوز نص الإشعار 1000 حرف."),
});

export const settingSchema = z.object({
  value: z.string().min(1, "قيمة الإعداد مطلوبة."),
  description: optionalText(255),
});

export const smsConfigurationSchema = z.object({
  provider: z.string().trim().min(1, "اسم مزود الرسائل مطلوب.").max(100),
  apiKey: optionalText(500),
  senderName: optionalText(100),
  username: optionalText(150),
  userSender: optionalText(100),
});

export type BroadcastFormValues = z.infer<typeof broadcastSchema>;
export type SettingFormValues = z.input<typeof settingSchema>;
export type SmsConfigurationFormValues = z.input<typeof smsConfigurationSchema>;
