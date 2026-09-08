import { describe, expect, it } from "vitest";
import { broadcastSchema, settingSchema, smsConfigurationSchema } from "./systemSchemas";

describe("system operation schemas", () => {
  it("requires a complete broadcast and trims confirmed fields", () => {
    expect(broadcastSchema.safeParse({ title: "", body: "" }).success).toBe(false);
    expect(broadcastSchema.parse({ title: "  تنبيه عام  ", body: "  نص الرسالة  " })).toEqual({
      title: "تنبيه عام",
      body: "نص الرسالة",
    });
  });

  it("enforces the documented title size and a bounded notification body", () => {
    expect(broadcastSchema.safeParse({ title: "أ".repeat(201), body: "نص" }).success).toBe(false);
    expect(broadcastSchema.safeParse({ title: "تنبيه", body: "أ".repeat(1001) }).success).toBe(false);
  });

  it("requires setting values while permitting an empty optional description", () => {
    expect(settingSchema.safeParse({ value: "", description: "" }).success).toBe(false);
    expect(settingSchema.parse({ value: " 1.0 ", description: "  العمولة  " })).toEqual({ value: " 1.0 ", description: "العمولة" });
  });

  it("validates SMS configuration without requiring a replacement secret", () => {
    expect(smsConfigurationSchema.parse({
      provider: " taqnyat ",
      apiKey: "",
      senderName: " TIHAMAH ",
      username: " user ",
      userSender: " TIHAMAH ",
    })).toEqual({ provider: "taqnyat", apiKey: "", senderName: "TIHAMAH", username: "user", userSender: "TIHAMAH" });
    expect(smsConfigurationSchema.safeParse({ provider: "", apiKey: "", senderName: "", username: "", userSender: "" }).success).toBe(false);
  });
});
