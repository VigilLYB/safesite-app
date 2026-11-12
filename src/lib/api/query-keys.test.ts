import { actionKeys, compact, incidentKeys } from "./query-keys";

describe("query keys", () => {
  const startsWith = (key: readonly unknown[], prefix: readonly unknown[]) =>
    prefix.every((part, index) => key[index] === part);

  it("nests list and detail keys under the family root so one invalidation covers them", () => {
    expect(startsWith(incidentKeys.list({ mine: true }), incidentKeys.lists())).toBe(true);
    expect(startsWith(incidentKeys.detail("1"), incidentKeys.all)).toBe(true);
    expect(startsWith(incidentKeys.list({}), incidentKeys.all)).toBe(true);
    expect(startsWith(actionKeys.list({}), actionKeys.all)).toBe(true);
  });

  it("does not put defaults in a key prefix", () => {
    expect(incidentKeys.lists()).toEqual(["incidents", "list"]);
  });

  it("compacts filters so equivalent filters share a key", () => {
    expect(compact({ a: 1, b: undefined, c: null, d: "", e: false })).toEqual({ a: 1, e: false });
  });
});
