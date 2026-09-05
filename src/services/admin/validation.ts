import { ApiError } from "../http";
import type { ApiBannerRequest, ApiCategoryRequest, ApiRegionRequest, ApiVillageRequest } from "../../types/api";

export function invalidInput(message = "توجد بيانات غير صالحة في الطلب."): never {
  throw new ApiError({ kind: "validation", code: "INVALID_ADMIN_INPUT", userMessage: message, status: 422 });
}
export function unsupportedContract(): never {
  throw new ApiError({ kind: "configuration", code: "UNCONFIRMED_ADMIN_CONTRACT", userMessage: "هذه العملية غير متاحة حتى تأكيد عقد الخدمة." });
}
export function missingRecord(): never {
  throw new ApiError({ kind: "not_found", code: "NOT_FOUND", userMessage: "تعذر العثور على السجل المطلوب.", status: 404 });
}
export function entityId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return invalidInput("معرّف السجل غير صالح.");
  return value;
}
export function textInput(value: unknown, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) return invalidInput();
  return value.trim();
}
export function booleanInput(value: unknown): boolean {
  if (typeof value !== "boolean") return invalidInput();
  return value;
}
export function inputRecord(value: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidInput();
  if (Object.keys(value).some((key) => !allowed.includes(key))) return unsupportedContract();
  return value as Record<string, unknown>;
}
function orderInput(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return invalidInput();
  return value;
}
function mediaUrl(value: unknown, allowEmpty = false) {
  const text = textInput(value, allowEmpty);
  if (allowEmpty && !text) return text;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return invalidInput();
  } catch { return invalidInput(); }
  return text;
}
export function categoryRequest(value: unknown): ApiCategoryRequest {
  const input = inputRecord(value, ["name", "iconUrl", "sortOrder", "isActive"]);
  return {
    name: textInput(input.name),
    ...(input.iconUrl === undefined ? {} : { icon_url: mediaUrl(input.iconUrl, true) }),
    ...(input.sortOrder === undefined ? {} : { sort_order: orderInput(input.sortOrder) }),
    ...(input.isActive === undefined ? {} : { is_active: booleanInput(input.isActive) }),
  };
}
export function regionRequest(value: unknown): ApiRegionRequest {
  const input = inputRecord(value, ["name", "isActive"]);
  return { name: textInput(input.name), ...(input.isActive === undefined ? {} : { is_active: booleanInput(input.isActive) }) };
}
export function villageRequest(value: unknown): ApiVillageRequest {
  const input = inputRecord(value, ["name", "isActive", "regionId"]);
  return { ...regionRequest({ name: input.name, isActive: input.isActive }), region_id: entityId(input.regionId) };
}
export function bannerRequest(value: unknown): ApiBannerRequest {
  const input = inputRecord(value, ["imageUrl", "sortOrder", "isActive"]);
  return {
    image_url: mediaUrl(input.imageUrl),
    ...(input.sortOrder === undefined ? {} : { sort_order: orderInput(input.sortOrder) }),
    ...(input.isActive === undefined ? {} : { is_active: booleanInput(input.isActive) }),
  };
}
