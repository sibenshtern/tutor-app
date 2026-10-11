import { describe, expect, it } from "vitest";
import { phoneHref } from "@/lib/phone";

describe("phoneHref", () => {
  it("normalises formatted numbers", () => {
    expect(phoneHref("+7 (999) 123-45-67")).toBe("tel:+79991234567");
    expect(phoneHref("8 999 123 45 67")).toBe("tel:89991234567");
  });
  it("returns null for emails, blanks and free text", () => {
    expect(phoneHref("anna@example.com")).toBeNull();
    expect(phoneHref("  ")).toBeNull();
    expect(phoneHref(null)).toBeNull();
    expect(phoneHref("мама 999 123")).toBeNull();
    expect(phoneHref("123")).toBeNull();
  });
});
