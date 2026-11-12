import openapi from "../../../docs/openapi.snapshot.json";
import { buildPath, endpoints } from "./registry";

const spec = openapi as { paths: Record<string, Record<string, unknown>> };

describe("endpoint registry", () => {
  const all = Object.entries(endpoints);

  it("has no duplicate method + path", () => {
    const keys = all.map(([, endpoint]) => `${endpoint.method} ${endpoint.template}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(all)("%s exists in the API contract snapshot", (_name, endpoint) => {
    const operation = spec.paths[endpoint.template]?.[endpoint.method.toLowerCase()];
    expect(operation).toBeDefined();
  });

  it("fills and encodes path params", () => {
    expect(buildPath(endpoints.incident, { id: "a b/c" })).toBe("/v1/incidents/a%20b%2Fc");
    expect(buildPath(endpoints.milestoneComplete, { id: "1", milestoneId: "2" })).toBe(
      "/v1/actions/1/milestones/2/complete",
    );
  });

  it("refuses a missing param", () => {
    expect(() => buildPath(endpoints.incident)).toThrow(/Missing path param/);
  });
});
