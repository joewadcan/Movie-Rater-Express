describe("year validation logic", () => {
  function isValidYear(value: any): boolean {
    const year = Number(value);
    return Number.isInteger(year) && year >= 1888 && year <= new Date().getFullYear();
  }

  it("accepts 1888 (first known film)", () => {
    expect(isValidYear(1888)).toBe(true);
  });

  it("accepts 1972", () => {
    expect(isValidYear(1972)).toBe(true);
  });

  it("accepts current year", () => {
    expect(isValidYear(new Date().getFullYear())).toBe(true);
  });

  it("rejects 1887", () => {
    expect(isValidYear(1887)).toBe(false);
  });

  it("rejects 1800", () => {
    expect(isValidYear(1800)).toBe(false);
  });

  it("rejects 0", () => {
    expect(isValidYear(0)).toBe(false);
  });

  it("rejects negative year", () => {
    expect(isValidYear(-100)).toBe(false);
  });

  it("rejects future year", () => {
    expect(isValidYear(new Date().getFullYear() + 1)).toBe(false);
  });

  it("rejects float 1999.5", () => {
    expect(isValidYear(1999.5)).toBe(false);
  });

  it("rejects float 1888.1", () => {
    expect(isValidYear(1888.1)).toBe(false);
  });

  it("rejects float 2000.9", () => {
    expect(isValidYear(2000.9)).toBe(false);
  });

  it("rejects string", () => {
    expect(isValidYear("not a year")).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidYear(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isValidYear(undefined)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isValidYear(NaN)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidYear("")).toBe(false);
  });
});
