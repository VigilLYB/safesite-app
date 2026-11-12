/**
 * An in-memory SafeSite API for UI journey tests. It mirrors the backend's rules that the UI
 * depends on (permissions, state machine, expectedVersion, idempotency, 404-vs-403) so a journey
 * exercises the real screens end to end without the network. The live suite (e2e/) runs the same
 * workflows against the hosted API.
 */
type Role = "WORKER" | "SUPERVISOR" | "MANAGER";
export const PASSWORD = "correct-horse-battery";
export const BP_ID = "b0000000-0000-4000-8000-000000000001";
export const AREA_ID = "a0000000-0000-4000-8000-000000000001";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

interface UserRec {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}
interface Node {
  version: number;
  versionId: string;
  nodeType: string;
  label: string;
  actorId: string | null;
  actorRole: string;
  note: string | null;
  status: string;
  changedFields: string[];
  createdAt: string;
}
export interface IncidentRec {
  id: string;
  version: number;
  reporterId: string;
  status: string;
  title: string | null;
  description: string | null;
  category: string | null;
  severity: string;
  photoKey: string | null;
  audioKey: string | null;
  transcript: string | null;
  loc: {
    blueprintId: string | null;
    x: number | null;
    y: number | null;
    source: string;
    areaId: string | null;
    areaName: string | null;
  };
  customFields: Record<string, unknown>;
  clusterParentId: string | null;
  clusterSimilarity: number | null;
  createdAt: string;
  nodes: Node[];
  submissionId?: string;
}
interface ActionRec {
  id: string;
  incidentId: string;
  type: string;
  templateCode: string | null;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string | null;
  assignedBy: string;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  milestones: {
    id: string;
    seq: number;
    title: string;
    dueAt: string | null;
    completedAt: string | null;
    completedBy: string | null;
  }[];
}

const TEMPLATES = [
  {
    code: "REPLACE_VALVE",
    name: "Replace Valve",
    description: null,
    milestones: [
      { title: "Ordered", offsetDays: 1 },
      { title: "Delivered", offsetDays: 3 },
      { title: "Installed", offsetDays: 5 },
    ],
  },
];

export function createFakeBackend() {
  let tick = 0;
  const now = () => new Date(Date.parse("2026-11-12T10:00:00Z") + ++tick * 60_000).toISOString();
  const users: UserRec[] = [
    {
      id: uuid(1),
      email: "worker@plantx.demo",
      fullName: "Ravi Kumar",
      role: "WORKER",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: uuid(2),
      email: "contractor@plantx.demo",
      fullName: "Sana Shaikh",
      role: "WORKER",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: uuid(3),
      email: "supervisor@plantx.demo",
      fullName: "Anita Desai",
      role: "SUPERVISOR",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: uuid(4),
      email: "manager@plantx.demo",
      fullName: "Vikram Rao",
      role: "MANAGER",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];
  const incidents = new Map<string, IncidentRec>();
  const actions = new Map<string, ActionRec>();
  const calls: {
    method: string;
    path: string;
    body: unknown;
    query: URLSearchParams;
    auth: string | null;
  }[] = [];
  const blueprints = [
    {
      id: BP_ID,
      name: "Plant X",
      imageKey: null,
      imageUrl: null,
      widthPx: 1000,
      heightPx: 800,
      geoBounds: null,
      isDefault: true,
      createdAt: "2026-01-01T00:00:00Z",
      areas: [
        {
          id: AREA_ID,
          blueprintId: BP_ID,
          name: "Pump Room",
          polygon: [
            [0, 0],
            [500, 0],
            [500, 400],
            [0, 400],
          ] as [number, number][],
        },
      ],
    },
  ];
  const flags = {
    expireTokens: false,
    meStatus: 0,
    health: "aws",
    failNext: [] as { match: RegExp; status: number; body?: unknown }[],
    slowPpe: false,
    dropResponse: null as RegExp | null,
  };
  let seq = 100;

  const byEmail = (e: string) => users.find((u) => u.email === e);
  const actorOf = (auth: string | null) => users.find((u) => auth === `Bearer tok-${u.id}`);
  const isStaff = (r: Role) => r !== "WORKER";
  const person = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? { id: u.id, fullName: u.fullName } : null;
  };

  function addNode(
    rec: IncidentRec,
    nodeType: string,
    label: string,
    actor: UserRec | null,
    changed: string[],
    note: string | null = null,
  ) {
    rec.version += 1;
    rec.nodes.push({
      version: rec.version,
      versionId: `${rec.id}-v${rec.version}`,
      nodeType,
      label,
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? "SYSTEM",
      note,
      status: rec.status,
      changedFields: changed,
      createdAt: now(),
    });
  }
  function seed(over: Partial<IncidentRec> & { reporter: string }, actor?: UserRec): IncidentRec {
    const id = uuid(++seq);
    const rec: IncidentRec = {
      id,
      version: 0,
      reporterId: over.reporter,
      status: "OPEN",
      title: "Leaking valve",
      description: null,
      category: null,
      severity: "MEDIUM",
      photoKey: null,
      audioKey: null,
      transcript: null,
      loc: {
        blueprintId: BP_ID,
        x: 100,
        y: 100,
        source: "MANUAL",
        areaId: AREA_ID,
        areaName: "Pump Room",
      },
      customFields: {},
      clusterParentId: null,
      clusterSimilarity: null,
      createdAt: now(),
      nodes: [],
      ...over,
    };
    addNode(
      rec,
      "SUBMITTED",
      "Worker Submitted",
      actor ?? users.find((u) => u.id === over.reporter) ?? null,
      [],
    );
    incidents.set(id, rec);
    return rec;
  }

  const dupCount = (id: string) =>
    [...incidents.values()].filter((r) => r.clusterParentId === id).length;
  const canEdit = (rec: IncidentRec, a: UserRec) =>
    isStaff(a.role)
      ? ["OPEN", "VALIDATED", "APPROVED", "ACTION_ASSIGNED"].includes(rec.status)
      : rec.reporterId === a.id && ["OPEN", "VALIDATED"].includes(rec.status);
  const transitions = (rec: IncidentRec, a: UserRec) => {
    if (!isStaff(a.role)) return [];
    const out: string[] = [];
    if (rec.status === "OPEN") out.push("validate");
    if (["OPEN", "VALIDATED"].includes(rec.status)) out.push("approve");
    if (["OPEN", "VALIDATED", "APPROVED"].includes(rec.status)) out.push("reject");
    if (a.role === "MANAGER") {
      if (rec.status === "RESOLVED") out.push("close");
      if (["REJECTED", "RESOLVED", "CLOSED"].includes(rec.status)) out.push("reopen");
    }
    return out;
  };
  const canRead = (rec: IncidentRec, a: UserRec) =>
    isStaff(a.role) ||
    rec.reporterId === a.id ||
    [...incidents.values()].some((r) => r.clusterParentId === rec.id && r.reporterId === a.id);
  const media = (k: string | null) => (k ? { key: k, url: `https://media.test/${k}` } : null);
  const last = (r: IncidentRec) => r.nodes[r.nodes.length - 1] as Node;
  function dto(rec: IncidentRec, a: UserRec) {
    const staff = isStaff(a.role);
    const n = last(rec);
    return {
      id: rec.id,
      version: rec.version,
      versionId: n.versionId,
      reporter: person(rec.reporterId),
      createdAt: rec.createdAt,
      updatedAt: n.createdAt,
      status: rec.status,
      title: rec.title,
      description: rec.description,
      transcript: rec.transcript,
      transcriptLanguage: rec.transcript ? "en-IN" : null,
      category: rec.category,
      severity: rec.severity,
      location: {
        blueprintId: rec.loc.blueprintId,
        x: rec.loc.x,
        y: rec.loc.y,
        source: rec.loc.source,
        areaId: rec.loc.areaId,
        areaName: rec.loc.areaName,
        gps: null,
      },
      photo: media(rec.photoKey),
      audio: media(rec.audioKey),
      customFields: rec.customFields,
      cluster: {
        parentIncidentId: rec.clusterParentId,
        similarity: rec.clusterSimilarity,
        isDuplicate: rec.clusterParentId !== null,
      },
      duplicateCount: dupCount(rec.id),
      processing: { transcription: rec.audioKey ? "COMPLETED" : "NOT_REQUIRED", error: null },
      lastChange: { nodeType: n.nodeType, label: n.label, actorRole: n.actorRole, at: n.createdAt },
      permissions: {
        transitions: transitions(rec, a),
        canEdit: canEdit(rec, a),
        canCluster: staff && dupCount(rec.id) === 0,
        canAssignAction: staff && rec.status === "APPROVED",
        canRunPpeScan: Boolean(rec.photoKey) && (staff || rec.reporterId === a.id),
      },
    };
  }
  const summary = (rec: IncidentRec) => ({
    id: rec.id,
    version: rec.version,
    title: rec.title,
    category: rec.category,
    severity: rec.severity,
    status: rec.status,
    areaName: rec.loc.areaName,
    reporter: person(rec.reporterId),
    clusterParentId: rec.clusterParentId,
    duplicateCount: dupCount(rec.id),
    createdAt: rec.createdAt,
  });
  const actionDto = (a: ActionRec, withMs = true) => {
    const inc = incidents.get(a.incidentId) as IncidentRec;
    const done = a.milestones.filter((m) => m.completedAt).length;
    const overdue = (d: string | null, c: string | null) =>
      Boolean(d && !c && Date.parse(d) < Date.parse("2026-11-12T10:00:00Z"));
    return {
      id: a.id,
      incident: {
        id: inc.id,
        title: inc.title,
        severity: inc.severity,
        status: inc.status,
        areaName: inc.loc.areaName,
      },
      type: a.type,
      templateCode: a.templateCode,
      title: a.title,
      description: a.description,
      status: a.status,
      assignee: person(a.assigneeId),
      assignedBy: person(a.assignedBy),
      dueAt: a.dueAt,
      isOverdue: overdue(a.dueAt, a.completedAt),
      completedAt: a.completedAt,
      progress: { done, total: a.milestones.length },
      createdAt: a.createdAt,
      ...(withMs
        ? {
            milestones: a.milestones.map((m) => ({
              id: m.id,
              seq: m.seq,
              title: m.title,
              dueAt: m.dueAt,
              completedAt: m.completedAt,
              completedBy: person(m.completedBy),
              isOverdue: overdue(m.dueAt, m.completedAt),
            })),
          }
        : {}),
    };
  };

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const err = (status: number, code: string, message: string, details?: unknown) =>
    json(status, {
      error: { code, message, correlationId: "corr-1", ...(details ? { details } : {}) },
    });
  const stale = (rec: IncidentRec) =>
    err(409, "STALE_VERSION", "Report changed", {
      expectedVersion: 0,
      currentVersion: rec.version,
    });

  async function handle(
    method: string,
    path: string,
    query: URLSearchParams,
    body: Record<string, unknown> | undefined,
    auth: string | null,
  ): Promise<Response> {
    const failure = flags.failNext.findIndex((f) => f.match.test(`${method} ${path}`));
    if (failure >= 0) {
      const f = flags.failNext.splice(failure, 1)[0]!;
      return json(
        f.status,
        f.body ?? { error: { code: "INTERNAL_ERROR", message: "boom", correlationId: "c" } },
      );
    }
    if (method === "GET" && path === "/health")
      return json(200, { status: "ok", database: "ok", aiProvider: flags.health, time: now() });
    if (method === "POST" && path === "/v1/auth/login") {
      const u = byEmail(String(body?.email));
      return u && u.isActive && body?.password === PASSWORD
        ? json(200, {
            accessToken: `tok-${u.id}`,
            tokenType: "Bearer",
            expiresAt: "2099-01-01T00:00:00Z",
            user: u,
          })
        : err(401, "UNAUTHORIZED", "Invalid credentials");
    }
    const actor = actorOf(auth);
    if (!actor || flags.expireTokens) return err(401, "UNAUTHORIZED", "Missing or invalid token");
    const staff = isStaff(actor.role);
    const forbid = () => err(403, "FORBIDDEN", "Your role cannot do this");
    if (method === "GET" && path === "/v1/auth/me")
      return flags.meStatus ? json(flags.meStatus, { message: "down" }) : json(200, actor);
    if (path === "/v1/users") {
      if (!staff) return forbid();
      if (method === "GET")
        return json(200, {
          items: users.filter(
            (u) => u.isActive && (!query.get("role") || u.role === query.get("role")),
          ),
        });
      if (actor.role !== "MANAGER") return forbid();
      if (users.some((u) => u.email === body?.email))
        return err(409, "CONFLICT", "Email already in use");
      const u: UserRec = {
        id: uuid(++seq),
        email: String(body?.email),
        fullName: String(body?.fullName),
        role: body?.role as Role,
        isActive: true,
        createdAt: now(),
      };
      users.push(u);
      return json(201, u);
    }
    if (method === "POST" && path === "/v1/uploads")
      return json(201, {
        key: `${body?.kind}/${actor.id}/${++seq}`,
        uploadUrl: `https://s3.test/put/${seq}`,
        method: "PUT",
        headers: { "Content-Type": String(body?.contentType) },
        expiresInSeconds: 600,
      });
    if (path === "/v1/blueprints") {
      if (method === "GET") return json(200, { items: blueprints.map(({ areas: _a, ...b }) => b) });
      if (actor.role !== "MANAGER") return forbid();
      const bp = {
        id: uuid(++seq),
        name: String(body?.name),
        imageKey: null,
        imageUrl: null,
        widthPx: Number(body?.widthPx),
        heightPx: Number(body?.heightPx),
        geoBounds: (body?.geoBounds as never) ?? null,
        isDefault: Boolean(body?.isDefault),
        createdAt: now(),
        areas: [] as (typeof blueprints)[0]["areas"],
      };
      if (blueprints.some((b) => b.name === bp.name))
        return err(409, "CONFLICT", "Blueprint name already used");
      blueprints.push(bp as never);
      return json(201, bp);
    }
    let m: RegExpMatchArray | null;
    if ((m = path.match(/^\/v1\/blueprints\/([^/]+)(\/areas)?$/))) {
      const bp = blueprints.find((b) => b.id === m![1]);
      if (!bp) return err(404, "NOT_FOUND", "Blueprint not found");
      if (!m[2]) return json(200, bp);
      if (actor.role !== "MANAGER") return forbid();
      if (bp.areas.some((a) => a.name === body?.name))
        return err(409, "CONFLICT", "Area name already used on this blueprint");
      const area = {
        id: uuid(++seq),
        blueprintId: bp.id,
        name: String(body?.name),
        polygon: body?.polygon as [number, number][],
      };
      bp.areas.push(area);
      return json(201, area);
    }
    if (method === "GET" && path === "/v1/action-templates") return json(200, { items: TEMPLATES });
    if (method === "POST" && path === "/v1/incidents") {
      const dup = [...incidents.values()].find((r) => r.submissionId === body?.clientSubmissionId);
      if (dup) return json(200, { incident: dto(dup, actor), replayed: true, ai: null });
      if (!body?.photoKey && !body?.audioKey && !body?.title && !body?.description)
        return err(
          400,
          "VALIDATION_FAILED",
          "Provide at least a photo, voice note, title or description",
        );
      const loc = body?.location as
        { blueprintId?: string; pin?: { x: number; y: number }; gps?: unknown } | undefined;
      const rec = seed({
        reporter: actor.id,
        title: (body?.title as string) ?? null,
        description: (body?.description as string) ?? null,
        category: (body?.category as string) ?? null,
        severity: String(body?.severity ?? "MEDIUM"),
        photoKey: (body?.photoKey as string) ?? null,
        audioKey: (body?.audioKey as string) ?? null,
        transcript: body?.audioKey ? "The valve is leaking" : null,
        customFields: (body?.customFields as never) ?? {},
        loc: loc?.pin
          ? {
              blueprintId: loc.blueprintId ?? BP_ID,
              x: loc.pin.x,
              y: loc.pin.y,
              source: "MANUAL",
              areaId: AREA_ID,
              areaName: "Pump Room",
            }
          : loc?.gps
            ? {
                blueprintId: BP_ID,
                x: 200,
                y: 200,
                source: "GPS_ESTIMATE",
                areaId: AREA_ID,
                areaName: "Pump Room",
              }
            : { blueprintId: null, x: null, y: null, source: "NONE", areaId: null, areaName: null },
        submissionId: String(body?.clientSubmissionId),
      });
      return json(201, {
        incident: dto(rec, actor),
        replayed: false,
        ai: {
          isMock: false,
          transcription: { status: rec.audioKey ? "COMPLETED" : "NOT_REQUIRED", error: null },
          embedded: true,
          clusteredUnder: null,
        },
      });
    }
    if (method === "GET" && path === "/v1/incidents") {
      let list = [...incidents.values()].filter((r) => (staff ? true : r.reporterId === actor.id));
      const st = query.get("status")?.split(",");
      if (st) list = list.filter((r) => st.includes(r.status));
      if (query.get("severity")) list = list.filter((r) => r.severity === query.get("severity"));
      if (query.get("rootsOnly") === "true") list = list.filter((r) => !r.clusterParentId);
      if (query.get("mine") === "true") list = list.filter((r) => r.reporterId === actor.id);
      if (staff && query.get("reporterId"))
        list = list.filter((r) => r.reporterId === query.get("reporterId"));
      if (query.get("areaId")) list = list.filter((r) => r.loc.areaId === query.get("areaId"));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const limit = Number(query.get("limit") ?? 25);
      const start = Number(query.get("cursor") ?? 0);
      const page = list.slice(start, start + limit);
      return json(200, {
        items: page.map(summary),
        pageInfo: { nextCursor: start + limit < list.length ? String(start + limit) : null },
      });
    }
    if ((m = path.match(/^\/v1\/incidents\/([^/]+)(\/.*)?$/))) {
      const rec = incidents.get(m[1]!);
      if (!rec || !canRead(rec, actor)) return err(404, "NOT_FOUND", "Incident not found");
      const sub = m[2] ?? "";
      const expected = body?.expectedVersion;
      if (method === "GET" && sub === "") return json(200, dto(rec, actor));
      if (method === "GET" && sub === "/versions")
        return json(200, {
          incidentId: rec.id,
          nodes: rec.nodes.map((n) => ({
            version: n.version,
            versionId: n.versionId,
            parentVersionId: null,
            nodeType: n.nodeType,
            label: n.label,
            actor: {
              id: n.actorId,
              role: n.actorRole,
              fullName: person(n.actorId)?.fullName ?? "SafeSite AI",
            },
            note: n.note,
            status: n.status,
            changedFields: n.changedFields,
            createdAt: n.createdAt,
          })),
        });
      if (method === "GET" && (m = sub.match(/^\/versions\/(\d+)$/))) {
        const n = rec.nodes.find((x) => x.version === Number(m![1]));
        if (!n) return err(422, "UNPROCESSABLE", `Version ${m[1]} does not exist`);
        return json(200, {
          version: n.version,
          versionId: n.versionId,
          parentVersionId: null,
          nodeType: n.nodeType,
          label: n.label,
          actor: {
            id: n.actorId,
            role: n.actorRole,
            fullName: person(n.actorId)?.fullName ?? "SafeSite AI",
          },
          note: n.note,
          createdAt: n.createdAt,
          snapshot: {
            status: n.status,
            title: rec.title,
            description: rec.description,
            transcript: rec.transcript,
            category: rec.category,
            severity: rec.severity,
            location: dto(rec, actor).location,
          },
        });
      }
      if (method === "GET" && sub === "/duplicates")
        return json(200, {
          parentIncidentId: rec.id,
          items: [...incidents.values()].filter((r) => r.clusterParentId === rec.id).map(summary),
        });
      if (method === "GET" && sub === "/similar") {
        if (!staff) return forbid();
        return json(200, {
          items: [...incidents.values()]
            .filter((r) => r.id !== rec.id && !r.clusterParentId && r.status === "OPEN")
            .slice(0, Number(query.get("limit") ?? 5))
            .map((r) => ({ ...summary(r), similarity: 0.84 })),
          reason: null,
        });
      }
      if (method === "GET" && sub === "/ppe-scans") return json(200, { items: [] });
      if (method === "POST" && sub === "/ppe-scans") {
        if (!rec.photoKey) return err(422, "UNPROCESSABLE", "This report has no photo to scan");
        return json(201, {
          id: uuid(++seq),
          incidentId: rec.id,
          versionId: last(rec).versionId,
          photoKey: rec.photoKey,
          provider: "mock",
          isMock: true,
          summary: {
            verdict: "VIOLATION",
            personsDetected: 1,
            personsWithViolations: 1,
            persons: [
              {
                personId: 0,
                confidence: 98,
                detectedEquipment: ["FACE_COVER"],
                missingEquipment: ["HEAD_COVER"],
              },
            ],
          },
          createdBy: actor.id,
          createdAt: now(),
        });
      }
      if (method === "GET" && sub === "/actions") return json(200, { items: [] });
      const mutating = ["PATCH", "PUT", "POST", "DELETE"].includes(method);
      if (mutating && expected !== undefined && expected !== rec.version) return stale(rec);
      if (method === "PATCH" && sub === "") {
        if (!canEdit(rec, actor))
          return err(403, "FORBIDDEN", `You cannot edit this report while it is ${rec.status}`);
        const changed: string[] = [];
        for (const k of [
          "title",
          "description",
          "category",
          "severity",
          "customFields",
          "photoKey",
        ] as const)
          if (k in (body ?? {})) {
            (rec as never as Record<string, unknown>)[k] = body![k];
            changed.push(k);
          }
        if (changed.length === 0) return err(400, "VALIDATION_FAILED", "Nothing to change");
        addNode(
          rec,
          staff ? "SUPERVISOR_MODIFIED" : "WORKER_EDITED",
          staff ? "Supervisor Modified" : "Worker Edited",
          actor,
          changed,
          (body?.note as string) ?? null,
        );
        return json(200, dto(rec, actor));
      }
      if (method === "PUT" && sub === "/location") {
        if (!canEdit(rec, actor)) return err(403, "FORBIDDEN", "You cannot edit this report");
        rec.loc = {
          blueprintId: String(body?.blueprintId),
          x: Number(body?.x),
          y: Number(body?.y),
          source: "MANUAL",
          areaId: AREA_ID,
          areaName: "Pump Room",
        };
        addNode(rec, "WORKER_MOVED_PIN", "Worker Moved Pin", actor, ["pinX", "pinY"]);
        return json(200, dto(rec, actor));
      }
      if (method === "POST" && sub === "/transitions") {
        const ev = String(body?.event);
        if (!transitions(rec, actor).includes(ev))
          return staff && actor.role !== "MANAGER" && ["close", "reopen"].includes(ev)
            ? forbid()
            : err(422, "UNPROCESSABLE", `Cannot ${ev} an incident that is ${rec.status}`);
        if (["reject", "reopen"].includes(ev) && !String(body?.note ?? "").trim())
          return err(400, "VALIDATION_FAILED", `A note (reason) is required to ${ev}`);
        const to: Record<string, string> = {
          validate: "VALIDATED",
          approve: "APPROVED",
          reject: "REJECTED",
          reopen: "OPEN",
          close: "CLOSED",
        };
        rec.status = to[ev]!;
        const node: Record<string, [string, string]> = {
          validate: ["VALIDATED", "Validated"],
          approve: ["APPROVED", "Approved"],
          reject: ["REJECTED", "Rejected"],
          reopen: ["REOPENED", "Reopened"],
          close: ["CLOSED", "Closed"],
        };
        addNode(rec, node[ev]![0], node[ev]![1], actor, ["status"], (body?.note as string) ?? null);
        return json(200, dto(rec, actor));
      }
      if (method === "PUT" && sub === "/cluster") {
        if (!staff) return forbid();
        const parent = incidents.get(String(body?.parentIncidentId));
        if (!parent) return err(404, "NOT_FOUND", "Incident not found");
        if (parent.clusterParentId)
          return err(422, "UNPROCESSABLE", "Target is itself a duplicate", {
            suggestedParentId: parent.clusterParentId,
          });
        if (dupCount(rec.id) > 0) return err(409, "CONFLICT", "Incident has its own duplicates");
        rec.clusterParentId = parent.id;
        rec.clusterSimilarity = 0.9;
        addNode(rec, "CLUSTERED", "Supervisor Linked Duplicate", actor, ["clusterParentId"]);
        return json(200, dto(rec, actor));
      }
      if (method === "DELETE" && sub === "/cluster") {
        if (!staff) return forbid();
        if (!rec.clusterParentId) return err(422, "UNPROCESSABLE", "Incident is not a duplicate");
        rec.clusterParentId = null;
        rec.clusterSimilarity = null;
        addNode(rec, "UNCLUSTERED", "Supervisor Unlinked Duplicate", actor, ["clusterParentId"]);
        return json(200, dto(rec, actor));
      }
      if (method === "POST" && sub === "/actions") {
        if (!staff) return forbid();
        if (
          [...actions.values()].some(
            (a) => a.incidentId === rec.id && ["OPEN", "IN_PROGRESS"].includes(a.status),
          )
        )
          return err(409, "CONFLICT", "Incident already has an active action");
        if (rec.status !== "APPROVED")
          return err(
            422,
            "UNPROCESSABLE",
            `Cannot assign an action to an incident that is ${rec.status}`,
          );
        const tpl = TEMPLATES.find((t) => t.code === body?.templateCode);
        const ms =
          body?.type === "PREBUILT"
            ? (tpl?.milestones ?? []).map((x) => x.title)
            : body?.type === "CUSTOM"
              ? (body.milestones as { title: string }[]).map((x) => x.title)
              : [];
        const act: ActionRec = {
          id: uuid(++seq),
          incidentId: rec.id,
          type: String(body?.type),
          templateCode: (body?.templateCode as string) ?? null,
          title: String(body?.title ?? tpl?.name),
          description: (body?.description as string) ?? null,
          status: "OPEN",
          assigneeId: (body?.assigneeId as string) ?? null,
          assignedBy: actor.id,
          dueAt: (body?.dueAt as string) ?? "2026-11-20T00:00:00Z",
          completedAt: null,
          createdAt: now(),
          milestones: ms.map((t, i) => ({
            id: uuid(++seq),
            seq: i + 1,
            title: t,
            dueAt: "2026-11-20T00:00:00Z",
            completedAt: null,
            completedBy: null,
          })),
        };
        actions.set(act.id, act);
        rec.status = "ACTION_ASSIGNED";
        addNode(rec, "ACTION_ASSIGNED", "Action Assigned", actor, ["status"]);
        return json(201, actionDto(act));
      }
    }
    if (method === "GET" && path === "/v1/actions") {
      let list = [...actions.values()];
      const st = query.get("status")?.split(",");
      if (st) list = list.filter((a) => st.includes(a.status));
      if (query.get("mine") === "true") list = list.filter((a) => a.assigneeId === actor.id);
      if (query.get("overdue") === "true") list = list.filter((a) => actionDto(a, false).isOverdue);
      if (query.get("incidentId"))
        list = list.filter((a) => a.incidentId === query.get("incidentId"));
      return json(200, { items: list.map((a) => actionDto(a, false)) });
    }
    if ((m = path.match(/^\/v1\/actions\/([^/]+)(\/.*)?$/))) {
      const act = actions.get(m[1]!);
      if (!act) return err(404, "NOT_FOUND", "Action not found");
      const sub = m[2] ?? "";
      if (method === "GET") return json(200, actionDto(act));
      if (!staff && act.assigneeId !== actor.id) return forbid();
      if (act.status === "DONE") return err(422, "UNPROCESSABLE", "Action is DONE");
      const finish = () => {
        act.status = "DONE";
        act.completedAt = now();
        const inc = incidents.get(act.incidentId)!;
        inc.status = "RESOLVED";
        addNode(inc, "RESOLVED", "Resolved", null, ["status"]);
      };
      if (sub === "/complete") {
        if (act.milestones.length > 0)
          return err(422, "UNPROCESSABLE", "Complete the remaining milestones instead");
        finish();
        return json(200, actionDto(act));
      }
      if ((m = sub.match(/^\/milestones\/([^/]+)\/complete$/))) {
        const ms = act.milestones.find((x) => x.id === m![1]);
        if (!ms) return err(404, "NOT_FOUND", "Milestone not found");
        if (act.milestones.some((x) => x.seq < ms.seq && !x.completedAt))
          return err(422, "UNPROCESSABLE", "Complete the earlier milestones first");
        ms.completedAt ??= now();
        ms.completedBy = actor.id;
        act.status = "IN_PROGRESS";
        if (act.milestones.every((x) => x.completedAt)) finish();
        return json(200, actionDto(act));
      }
    }
    if (path.startsWith("/v1/analytics/")) {
      if (!staff) return forbid();
      const all = [...incidents.values()];
      if (path.endsWith("/summary"))
        return json(200, {
          range: { from: query.get("from") ?? "", to: query.get("to") ?? "" },
          timezone: "Asia/Kolkata",
          totals: {
            reports: all.length,
            duplicates: all.filter((r) => r.clusterParentId).length,
            open: all.filter((r) => r.status === "OPEN").length,
          },
          byStatus: [...new Set(all.map((r) => r.status))].map((k) => ({
            key: k,
            count: all.filter((r) => r.status === k).length,
            score: 0,
          })),
          bySeverity: [{ key: "MEDIUM", count: all.length, score: all.length * 2 }],
          byShift: [{ key: "A", name: "Morning", count: all.length, score: all.length }],
          topAreas: [{ key: "Pump Room", count: all.length, score: all.length * 2 }],
          actions: {
            total: actions.size,
            active: [...actions.values()].filter((a) => a.status !== "DONE").length,
            overdue: 0,
            done: [...actions.values()].filter((a) => a.status === "DONE").length,
            avgHoursToClose: null,
          },
          supervisors: [],
        });
      return json(200, {
        blueprint: { id: BP_ID, widthPx: 1000, heightPx: 800 },
        range: { from: query.get("from") ?? "", to: query.get("to") ?? "" },
        cellSize: Number(query.get("cellSize") ?? 50),
        cells: all.length
          ? [
              {
                x: 100,
                y: 100,
                centerX: 125,
                centerY: 125,
                count: all.length,
                score: all.length * 2,
                intensity: 1,
              },
            ]
          : [],
        areas: [
          { areaId: AREA_ID, name: "Pump Room", count: all.length, score: all.length * 2 },
          { areaId: uuid(999), name: "Empty Bay", count: 0, score: 0 },
        ],
        totals: { reports: all.length },
      });
    }
    return err(404, "NOT_FOUND", `Route ${method} ${path} not found`);
  }

  const fetchImpl = async (
    input: unknown,
    init?: { method?: string; headers?: Record<string, string>; body?: unknown },
  ) => {
    const url = new URL(String(input), "https://api.test.invalid");
    const method = init?.method ?? "GET";
    if (url.host === "s3.test") return new Response("", { status: 200 });
    if (url.protocol === "data:" || url.host === "media.test") return new Response(new Blob(["x"]));
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined;
    const auth = init?.headers?.Authorization ?? null;
    calls.push({ method, path: url.pathname, body, query: url.searchParams, auth });
    const response = await handle(method, url.pathname, url.searchParams, body, auth);
    if (flags.dropResponse?.test(`${method} ${url.pathname}`)) {
      flags.dropResponse = null; // the server saved it, but the answer never arrived
      return json(504, { message: "Endpoint request timed out" });
    }
    return response;
  };

  return {
    fetch: fetchImpl as unknown as typeof fetch,
    users,
    incidents,
    actions,
    blueprints,
    calls,
    flags,
    userByEmail: byEmail,
    /** A report in a given state, without going through the API. */
    seedIncident: (over: Partial<IncidentRec> & { reporter: string }) => seed(over),
    /** Another person changes the report behind the UI's back. */
    touch: (id: string) => {
      const r = incidents.get(id)!;
      addNode(r, "SUPERVISOR_MODIFIED", "Supervisor Modified", users[2]!, ["severity"]);
      r.severity = "HIGH";
    },
    called: (method: string, pathPart: string) =>
      calls.filter((c) => c.method === method && c.path.includes(pathPart)),
  };
}
export type FakeBackend = ReturnType<typeof createFakeBackend>;
