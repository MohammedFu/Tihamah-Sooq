import { describe, expect, it } from "vitest";
import { locationSchema, regionSchema, villageSchema } from "./locationSchema";

describe("location form schemas", () => {
  describe("regionSchema", () => {
    it("trims valid Arabic names", () => {
      expect(regionSchema.parse({ name: "  سهل تهامة  " })).toEqual({ name: "سهل تهامة" });
      expect(locationSchema.parse({ name: "  سهل تهامة  " })).toEqual({ name: "سهل تهامة" });
    });

    it("rejects blank, one-character, and overlong names", () => {
      expect(regionSchema.safeParse({ name: "   " }).success).toBe(false);
      expect(regionSchema.safeParse({ name: "س" }).success).toBe(false);
      expect(regionSchema.safeParse({ name: "م".repeat(81) }).success).toBe(false);
    });

    it("accepts optional isActive flag", () => {
      expect(regionSchema.parse({ name: "جازان", isActive: false })).toEqual({ name: "جازان", isActive: false });
    });
  });

  describe("villageSchema", () => {
    it("validates valid village input with regionId", () => {
      expect(villageSchema.parse({ regionId: 1, name: "  المضايا  ", isActive: true })).toEqual({
        regionId: 1,
        name: "المضايا",
        isActive: true,
      });
    });

    it("requires a positive integer regionId", () => {
      expect(villageSchema.safeParse({ regionId: 0, name: "المضايا" }).success).toBe(false);
      expect(villageSchema.safeParse({ regionId: -1, name: "المضايا" }).success).toBe(false);
      expect(villageSchema.safeParse({ name: "المضايا" }).success).toBe(false);
    });

    it("rejects blank or invalid names", () => {
      expect(villageSchema.safeParse({ regionId: 1, name: "" }).success).toBe(false);
      expect(villageSchema.safeParse({ regionId: 1, name: "أ" }).success).toBe(false);
    });
  });
});
