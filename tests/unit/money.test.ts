import { describe, expect, it } from "vitest";
import { calcAmountDue, formatRub, parseRubles } from "@/lib/money";

const plain = (s: string) => s.replace(/\s/g, " ");

describe("calcAmountDue", () => {
  it("prorates the hourly rate by duration", () => {
    expect(calcAmountDue(300000, 45)).toBe(225000);
    expect(calcAmountDue(300000, 90)).toBe(450000);
  });
  it("rounds to whole kopecks", () => {
    expect(calcAmountDue(90, 1)).toBe(2);
    expect(calcAmountDue(100000, 1)).toBe(1667);
  });
});

describe("parseRubles", () => {
  it.each([
    ["1500", 150000],
    ["1500,50", 150050],
    ["1 500,5", 150050],
    ["1 500,50", 150050],
    ["1500.5", 150050],
    [" 2000 ₽ ", 200000],
    ["0", 0],
  ])("parses %j", (input, expected) => {
    expect(parseRubles(input)).toBe(expected);
  });
  it.each(["", "abc", "-5", "1,2,3", "10.123"])("rejects %j", (input) => {
    expect(parseRubles(input)).toBeNull();
  });
});

describe("formatRub", () => {
  it("omits kopecks for whole rubles", () => expect(plain(formatRub(150000))).toBe("1 500 ₽"));
  it("shows two decimals otherwise", () => expect(plain(formatRub(150050))).toBe("1 500,50 ₽"));
});
