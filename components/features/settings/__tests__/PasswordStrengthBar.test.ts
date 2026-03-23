import { describe, it, expect } from "vitest";
import { calculateStrength } from "../PasswordStrengthBar";

describe("calculateStrength", () => {
  it("returns 0 for empty string", () => {
    expect(calculateStrength("")).toBe(0);
  });

  it("returns 0 for passwords under 8 chars", () => {
    expect(calculateStrength("Abc1!")).toBe(0);
    expect(calculateStrength("1234567")).toBe(0);
  });

  it("returns low score for all-lowercase", () => {
    expect(calculateStrength("abcdefgh")).toBeLessThanOrEqual(1);
  });

  it("returns low score for all-digits", () => {
    expect(calculateStrength("12345678")).toBeLessThanOrEqual(1);
  });

  it("returns higher score for mixed case + digits", () => {
    expect(calculateStrength("Abcdefg1")).toBeGreaterThanOrEqual(2);
  });

  it("returns high score for long mixed password", () => {
    expect(calculateStrength("MyP@ssw0rd!2026")).toBeGreaterThanOrEqual(4);
  });

  it("rewards length >= 12", () => {
    const short = calculateStrength("Abcdefg1");
    const long = calculateStrength("Abcdefghijk1");
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it("rewards special characters", () => {
    const noSpecial = calculateStrength("Abcdefg1");
    const withSpecial = calculateStrength("Abcdefg1!");
    expect(withSpecial).toBeGreaterThanOrEqual(noSpecial);
  });

  it("caps at 4", () => {
    expect(calculateStrength("MyVeryStr0ng!P@ssword2026")).toBeLessThanOrEqual(4);
  });
});
