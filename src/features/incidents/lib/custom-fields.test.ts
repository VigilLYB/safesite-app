import { compactCustomFields, mergeCustomFields, toCustomFields } from "./custom-fields";

describe("custom fields", () => {
  it("PATCH sends the whole object: unknown keys survive, cleared text is dropped", () => {
    const current = toCustomFields({ equipmentTag: "P-301", legacyKey: 7, nested: { a: 1 } });
    expect(current).toEqual({ equipmentTag: "P-301", legacyKey: 7 });
    expect(mergeCustomFields(current, { equipmentTag: "", injuryOccurred: true })).toEqual({
      legacyKey: 7,
      injuryOccurred: true,
    });
  });
  it("create omits empties and returns undefined when nothing is filled", () => {
    expect(compactCustomFields({ a: "", b: null })).toBeUndefined();
    expect(compactCustomFields({ a: " x ", b: false })).toEqual({ a: "x", b: false });
  });
});
