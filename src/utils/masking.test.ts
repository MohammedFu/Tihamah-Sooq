import { describe, expect, it } from "vitest";
import {
  maskBankReference,
  maskEmail,
  maskIban,
  maskPhone,
  maskSecret,
  sanitizeSensitiveString,
} from "./masking";

describe("masking utilities", () => {
  describe("maskPhone", () => {
    it("masks Saudi international phone numbers with regional prefix and last 4 digits", () => {
      expect(maskPhone("+966500000001")).toBe("+966 50 ••• 0001");
      expect(maskPhone("+966 55 912 3014")).toBe("+966 55 ••• 3014");
    });

    it("masks Saudi local format phone numbers", () => {
      expect(maskPhone("0501234567")).toBe("050 ••• 4567");
    });

    it("masks other international numbers preserving country/area code and last 4 digits", () => {
      expect(maskPhone("+967700000012")).toBe("+9677 ••• 0012");
    });

    it("masks generic phone numbers with start and end characters", () => {
      expect(maskPhone("12345678")).toBe("123 ••• 678");
    });

    it("masks very short input completely", () => {
      expect(maskPhone("123")).toBe("••••");
    });

    it("returns an em-dash fallback for empty or null inputs", () => {
      expect(maskPhone(null)).toBe("—");
      expect(maskPhone(undefined)).toBe("—");
      expect(maskPhone("")).toBe("—");
      expect(maskPhone("   ")).toBe("—");
    });
  });

  describe("maskEmail", () => {
    it("masks email local part preserving first char, last char, and domain", () => {
      expect(maskEmail("majed@example.test")).toBe("m••••d@example.test");
      expect(maskEmail("admin.user@tihamah.sa")).toBe("a••••r@tihamah.sa");
    });

    it("handles short email local parts gracefully", () => {
      expect(maskEmail("ab@example.com")).toBe("a•@example.com");
    });

    it("masks invalid email strings without an at-sign", () => {
      expect(maskEmail("invalid-email")).toBe("••••");
    });

    it("returns an em-dash fallback for empty or null inputs", () => {
      expect(maskEmail(null)).toBe("—");
      expect(maskEmail(undefined)).toBe("—");
      expect(maskEmail("")).toBe("—");
    });
  });

  describe("maskIban", () => {
    it("masks standard 24-character Saudi IBAN preserving bank/country code and suffix", () => {
      expect(maskIban("SA03 8000 0000 6080 1016 7519")).toBe("SA03 •••• •••• •••• •••• 7519");
      expect(maskIban("SA0380000000608010167519")).toBe("SA03 •••• •••• •••• •••• 7519");
    });

    it("masks short IBAN completely", () => {
      expect(maskIban("SA123")).toBe("••••");
    });

    it("returns an em-dash fallback for empty or null inputs", () => {
      expect(maskIban(null)).toBe("—");
      expect(maskIban(undefined)).toBe("—");
      expect(maskIban("")).toBe("—");
    });
  });

  describe("maskBankReference", () => {
    it("masks prefixed transaction references preserving prefix and last 3 digits", () => {
      expect(maskBankReference("TRX-982104")).toBe("TRX-•••104");
      expect(maskBankReference("BLD-448203")).toBe("BLD-•••203");
    });

    it("masks un-prefixed references preserving last 4 digits", () => {
      expect(maskBankReference("987654321")).toBe("••••4321");
    });

    it("returns an em-dash fallback for empty, dash, or null inputs", () => {
      expect(maskBankReference("-")).toBe("—");
      expect(maskBankReference(null)).toBe("—");
      expect(maskBankReference("")).toBe("—");
    });
  });

  describe("maskSecret", () => {
    it("masks credentials completely", () => {
      expect(maskSecret("super-secret-api-key-12345")).toBe("••••••••");
    });

    it("returns an em-dash fallback for empty or null inputs", () => {
      expect(maskSecret(null)).toBe("—");
      expect(maskSecret("")).toBe("—");
    });
  });

  describe("sanitizeSensitiveString", () => {
    it("redacts passwords and tokens from query strings", () => {
      const sanitized = sanitizeSensitiveString("https://api.test?key=123&password=mySecretPassword&token=abc123xyz");
      expect(sanitized).toBe("https://api.test?key=123&password=••••&token=••••");
    });

    it("redacts passwords and secret fields from JSON strings", () => {
      const json = '{"password":"superSecretPassword","user":"admin","api_key":"xyz789"}';
      const sanitized = sanitizeSensitiveString(json);
      expect(sanitized).toBe('{"password":"••••","user":"admin","api_key":"••••"}');
    });

    it("redacts Bearer authorization tokens", () => {
      const header = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
      expect(sanitizeSensitiveString(header)).toBe("Bearer ••••");
    });
  });
});
