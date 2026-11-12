import { incidentSchema, incidentListSchema, loginResponseSchema } from "./schemas";

const incident = {
  id: "3f1c2a9e-6d7b-4b8a-9f0e-1a2b3c4d5e6f",
  version: 2,
  versionId: "v2",
  reporter: { id: "u1", fullName: "Amira Haddad" },
  createdAt: "2026-11-12T08:30:00Z",
  updatedAt: "2026-11-12T09:00:00Z",
  status: "OPEN",
  title: "Corroded valve",
  description: null,
  transcript: null,
  transcriptLanguage: null,
  category: null,
  severity: "HIGH",
  location: { blueprintId: null, x: null, y: null, source: "NONE", areaId: null, areaName: null },
  photo: null,
  audio: null,
  customFields: {},
  cluster: { parentIncidentId: null, similarity: null, isDuplicate: false },
  duplicateCount: 0,
  processing: { transcription: "NOT_REQUIRED", error: null },
  lastChange: {
    nodeType: "WORKER_SUBMITTED",
    label: "Worker Submitted",
    actorRole: "WORKER",
    at: "2026-11-12T08:30:00Z",
  },
  permissions: {
    transitions: ["validate"],
    canEdit: false,
    canCluster: false,
    canAssignAction: false,
    canRunPpeScan: false,
  },
};

describe("response schemas", () => {
  it("parses a full incident and ignores unknown server fields", () => {
    const parsed = incidentSchema.parse({ ...incident, somethingNew: 1 });
    expect(parsed.severity).toBe("HIGH");
    expect("somethingNew" in parsed).toBe(false);
  });

  it("rejects an unknown severity instead of guessing", () => {
    expect(incidentSchema.safeParse({ ...incident, severity: "SEVERE" }).success).toBe(false);
  });

  it("parses a paginated list with a null cursor", () => {
    const summary = {
      id: "1",
      version: 1,
      title: null,
      category: null,
      severity: "LOW",
      status: "OPEN",
      areaName: null,
      reporter: { id: "u", fullName: "A" },
      clusterParentId: null,
      duplicateCount: 0,
      createdAt: "x",
    };
    expect(
      incidentListSchema.parse({ items: [summary], pageInfo: { nextCursor: null } }).items,
    ).toHaveLength(1);
  });

  it("requires the Bearer token type on login", () => {
    const user = {
      id: "u",
      email: "a@b.co",
      fullName: "A",
      role: "WORKER",
      isActive: true,
      createdAt: "x",
    };
    expect(
      loginResponseSchema.safeParse({ accessToken: "t", tokenType: "Basic", expiresAt: "x", user })
        .success,
    ).toBe(false);
  });
});
