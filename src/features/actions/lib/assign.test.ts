import { actionTabsFor, parseActionParams, toActionFilters } from "./list-params";
import { buildAssignBody, emptyAssignForm, milestoneWarnings, validateAssign } from "./assign";

describe("assign action body", () => {
  it("ONE_OFF: title only, no milestones or templateCode", () => {
    const body = buildAssignBody({
      ...emptyAssignForm(),
      type: "ONE_OFF",
      title: " Fix it ",
      templateCode: "X",
    });
    expect(body).toEqual({ type: "ONE_OFF", title: "Fix it" });
  });
  it("PREBUILT: templateCode, no milestones; title optional", () => {
    const body = buildAssignBody({
      ...emptyAssignForm(),
      type: "PREBUILT",
      templateCode: "REPLACE_VALVE",
      assigneeId: "u1",
    });
    expect(body).toEqual({ type: "PREBUILT", templateCode: "REPLACE_VALVE", assigneeId: "u1" });
  });
  it("CUSTOM: milestones only here, with due dates as end-of-day plant time", () => {
    const body = buildAssignBody({
      ...emptyAssignForm(),
      type: "CUSTOM",
      title: "T",
      due: "2026-11-20",
      milestones: [
        { title: "A", due: "" },
        { title: "B", due: "2026-11-19" },
      ],
    });
    expect(body).toEqual({
      type: "CUSTOM",
      title: "T",
      dueAt: "2026-11-20T18:30:00.000Z",
      milestones: [{ title: "A" }, { title: "B", dueAt: "2026-11-19T18:30:00.000Z" }],
    });
  });
  it("validates required fields by type", () => {
    expect(validateAssign({ ...emptyAssignForm(), type: "PREBUILT" }).templateCode).toBeDefined();
    expect(validateAssign({ ...emptyAssignForm(), type: "ONE_OFF" }).title).toBeDefined();
    expect(
      validateAssign({
        ...emptyAssignForm(),
        type: "CUSTOM",
        title: "T",
        milestones: [{ title: "", due: "" }],
      }).milestones,
    ).toBeDefined();
    expect(
      validateAssign({ ...emptyAssignForm(), type: "ONE_OFF", title: "T", due: "soon" }).due,
    ).toBeDefined();
    expect(validateAssign({ ...emptyAssignForm(), type: "ONE_OFF", title: "T" })).toEqual({});
  });
  it("warns, never blocks, on backwards or past dates", () => {
    const w = milestoneWarnings(
      [
        { title: "a", due: "2026-11-20" },
        { title: "b", due: "2026-11-10" },
      ],
      "2026-11-12",
    );
    expect(w).toHaveLength(2);
  });
});

describe("action list params", () => {
  it("worker default is assigned-to-me", () => {
    const f = toActionFilters(parseActionParams({}, "WORKER"), "WORKER");
    expect(f).toMatchObject({ mine: true, status: "OPEN,IN_PROGRESS", limit: 50 });
  });
  it("mine wins: assigneeId is not sent with it; workers never send assigneeId", () => {
    const id = "3f1c2a9e-1111-4222-8333-444455556666";
    expect(
      toActionFilters(
        parseActionParams({ tab: "mine", assigneeId: id }, "SUPERVISOR"),
        "SUPERVISOR",
      ).assigneeId,
    ).toBeUndefined();
    expect(
      toActionFilters(
        parseActionParams({ tab: "active", assigneeId: id }, "SUPERVISOR"),
        "SUPERVISOR",
      ).assigneeId,
    ).toBe(id);
    expect(parseActionParams({ assigneeId: id }, "WORKER").assigneeId).toBeUndefined();
  });
  it("overdue tab", () => {
    expect(
      toActionFilters(parseActionParams({ tab: "overdue" }, "MANAGER"), "MANAGER").overdue,
    ).toBe(true);
    expect(actionTabsFor("WORKER").map((t) => t.value)).toEqual(["mine", "active", "done"]);
  });
});
